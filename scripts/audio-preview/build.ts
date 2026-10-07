import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPreviewCatalog, makeRuntimeIndex } from '../../src/audio-preview/catalog';
import { createQcReport, flattenEntries, inspectAudio } from '../../src/audio-preview/qc';
import { encodeMidi, type MusicSpec } from '../../src/audio-preview/music';
import type { PreviewEntry } from '../../src/audio-preview/catalog';
import process from 'node:process';

interface RenderJob { id: string; spec: MusicSpec; wav: string; entry: PreviewEntry }
function run(command: string, args: string[], cwd = process.cwd()): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolveRun({ code: code ?? 1, stdout, stderr }));
  });
}
function outputPath(root: string, entry: PreviewEntry): string { return join(root, 'public', entry.audioPath); }
async function normalize(job: RenderJob, root: string): Promise<void> {
  const destination = outputPath(root, job.entry);
  await mkdir(dirname(destination), { recursive: true });
  const fades = 'silenceremove=start_periods=1:start_duration=0.035:start_threshold=-40dB,afade=t=in:d=0.035,areverse,afade=t=in:d=0.12,areverse';
  // Isolated drum and hand-percussion examples have a high crest factor.
  // Normalize them to a slightly lower loudness while preserving transients;
  // mixed ensembles and pitched examples use the common -18 LUFS target.
  const targetLufs = job.entry.targetLufs;
  const mono = 'pan=mono|c0=0.5*c0+0.5*c1';
  const targetPeak = job.entry.targetTruePeakDbtp;
  const analysis = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', job.wav, '-af', `${fades},${mono},loudnorm=I=${targetLufs}:TP=${targetPeak}:LRA=11:print_format=json`, '-ar', '44100', '-ac', '1', '-f', 'null', '-']);
  if (analysis.code !== 0) throw new Error(`FFmpeg loudness analysis failed for ${job.id}: ${analysis.stderr}`);
  const json = analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\n\}/)?.[0];
  if (!json) throw new Error(`FFmpeg did not return loudness metrics for ${job.id}`);
  const measured = JSON.parse(json) as Record<string, string>;
  const filter = `${fades},${mono},loudnorm=I=${targetLufs}:TP=${targetPeak}:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=summary`;
  const result = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', job.wav, '-af', filter, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', destination]);
  if (result.code !== 0) throw new Error(`FFmpeg failed for ${job.id}: ${result.stderr}`);
}
async function concurrent<T>(items: T[], count: number, action: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  await Promise.all(Array.from({ length: count }, async () => { while (index < items.length) { const current = items[index++]; if (current !== undefined) await action(current); } }));
}
async function main(): Promise<void> {
  const root = resolve(process.cwd());
  const soundfont = process.env.AUDIO_SOUNDFONT ?? '/usr/share/sounds/sf2/FluidR3_GM.sf2';
  try { await stat(soundfont); } catch { throw new Error(`SoundFont not found at ${soundfont}. Run npm run audio:install first.`); }
  const engine = await run('python3', ['-c', 'import ctypes.util; print(ctypes.util.find_library("fluidsynth") or "")']);
  if (engine.code !== 0 || !engine.stdout.trim()) throw new Error('libfluidsynth was not found. Run npm run audio:install first.');
  const ffmpeg = await run('ffmpeg', ['-version']);
  if (ffmpeg.code !== 0) throw new Error('FFmpeg is required.');
  const catalog = buildPreviewCatalog();
  await writeFile(join(root, 'src/audio-preview/generated-index.ts'), `export const previewRuntimeIndex = ${JSON.stringify(makeRuntimeIndex(catalog.manifest), null, 2)} as const;\n`);
  const entries = flattenEntries(catalog.manifest);
  const failures = entries.flatMap(entry => entry.musicQc.filter(rule => !rule.ok).map(rule => `${entry.previewId}: ${rule.rule}`));
  if (failures.length) throw new Error(`Music structure QC failed before rendering:\n${failures.slice(0, 30).join('\n')}`);
  const audioRoot = join(root, 'public', 'audio-previews');
  await rm(audioRoot, { recursive: true, force: true });
  await mkdir(audioRoot, { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), 'flowmusic-audio-preview-'));
  try {
    const jobs: RenderJob[] = entries.map(entry => {
      const spec = catalog.specs[entry.previewId];
      if (!spec) throw new Error(`No deterministic music specification for ${entry.previewId}`);
      const wav = join(temporary, 'wav', entry.previewId + '.wav');
      return { id: entry.previewId, spec, wav, entry };
    });
    const midiDir = join(temporary, 'midi'); await mkdir(midiDir, { recursive: true });
    for (const job of jobs) await writeFile(join(midiDir, `${job.id}.mid`), encodeMidi(job.spec));
    const eventFile = join(temporary, 'render-jobs.json');
    await writeFile(eventFile, JSON.stringify(jobs.map(job => ({ id: job.id, spec: job.spec, wav: job.wav }))));
    const renderer = await run('python3', [join(root, 'scripts/audio-preview/render_offline.py'), soundfont, eventFile]);
    if (renderer.code !== 0) throw new Error(`Offline FluidSynth rendering failed:\n${renderer.stderr}`);
    let completed = 0;
    await concurrent(jobs, 4, async job => { await normalize(job, root); completed++; if (completed % 20 === 0) process.stdout.write(`Encoded ${completed}/${jobs.length}\n`); });
    const technicalResults: Record<string, Awaited<ReturnType<typeof inspectAudio>>> = {};
    await concurrent(entries, 4, async entry => { technicalResults[entry.previewId] = await inspectAudio(outputPath(root, entry), entry); });
    for (const entry of entries) entry.technicalQc = technicalResults[entry.previewId];
    const { report, markdown } = await createQcReport(root, catalog.manifest, entries, technicalResults);
    await writeFile(join(audioRoot, 'manifest.json'), JSON.stringify(catalog.manifest, null, 2) + '\n');
    await writeFile(join(audioRoot, 'audio-preview-qc.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(join(audioRoot, 'audio-preview-qc.md'), markdown);
    await copyFile(join(root, 'AUDIO_ASSET_LICENSES.md'), join(root, 'public', 'AUDIO_ASSET_LICENSES.md'));
    const archivePath = join(root, 'public', 'audio-preview-review.zip');
    const pack = await run('python3', [join(root, 'scripts/audio-preview/package_review.py'), root, archivePath]);
    if (pack.code !== 0) throw new Error(`Review ZIP packaging failed: ${pack.stderr}`);
    process.stdout.write(markdown);
    if (report.technical.failed || report.technical.missing.length || report.technical.orphan.length || report.musicRules.failed) process.exitCode = 1;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch(error => { console.error(error); process.exitCode = 1; });
