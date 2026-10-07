import { stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { PreviewEntry, PreviewManifest } from './catalog';

export interface TechnicalResult { ok: boolean; durationSeconds: number|null; integratedLufs: number|null; truePeakDbtp: number|null; initialSilenceSeconds: number|null; trailingSilenceSeconds: number|null; sampleRate: number|null; channels: number|null; codec: string|null; checks: Record<string,boolean>; errors: string[]; bytes: number }
function run(command:string,args:string[]):Promise<{code:number;stdout:string;stderr:string}>{return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>resolve({code:code??1,stdout,stderr}))})}
const matchLast=(text:string,pattern:RegExp):number|null=>{const all=[...text.matchAll(pattern)];return all.length?Number(all[all.length-1]![1]):null};
export async function inspectAudio(file:string,entry:PreviewEntry):Promise<TechnicalResult>{
 const errors:string[]=[],checks:Record<string,boolean>={};let bytes=0;
 try{const info=await stat(file);bytes=info.size;checks.exists=info.isFile()&&bytes>0}catch{checks.exists=false;errors.push('file missing or empty')}
 if(!checks.exists)return{ok:false,durationSeconds:null,integratedLufs:null,truePeakDbtp:null,initialSilenceSeconds:null,trailingSilenceSeconds:null,sampleRate:null,channels:null,codec:null,checks,errors,bytes};
 const probe=await run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',file]);
 let durationSeconds:number|null=null,sampleRate:number|null=null,channels:number|null=null,codec:string|null=null;
 if(probe.code===0){try{const j=JSON.parse(probe.stdout);durationSeconds=Number(j.format?.duration);const audio=j.streams?.find((s:{codec_type?:string})=>s.codec_type==='audio')??j.streams?.[0];if(audio){sampleRate=Number(audio.sample_rate);channels=Number(audio.channels);codec=audio.codec_name}}catch{errors.push('ffprobe returned invalid data')}}else errors.push('ffprobe failed to decode metadata');
 const decoded=await run('ffmpeg',['-hide_banner','-nostats','-i',file,'-af','silencedetect=noise=-50dB:d=0.04,ebur128=peak=true','-f','null','-']);
 const logs=decoded.stderr;const lufs=matchLast(logs,/I:\s*(-?[\d.]+)\s*LUFS/g);const peak=matchLast(logs,/(?:Peak|True peak):\s*(-?[\d.]+)\s*dB(?:FS|TP)/g);
 const starts=[...logs.matchAll(/silence_start:\s*([\d.]+)/g)].map(m=>Number(m[1]));const ends=[...logs.matchAll(/silence_end:\s*([\d.]+)/g)].map(m=>Number(m[1]));
 const initialSilence=starts.length&&starts[0]!<0.06?(ends.find(v=>v>=starts[0]!+0.001)??0):0;
 const lastStart=starts.at(-1),lastEnd=ends.at(-1);const trailingSilence=lastStart!==undefined&&(lastEnd===undefined||lastStart>lastEnd)?Math.max(0,(durationSeconds??0)-lastStart):0;
 const range: [number,number]=entry.category==='instrument'?[3.7,6.5]:entry.category==='groove'?[6,10.5]:[4.2,10.5];
 checks.decodes=decoded.code===0;
 checks.duration=durationSeconds!==null&&durationSeconds>=range[0]&&durationSeconds<=range[1];
 checks.notSilent=lufs!==null&&lufs>-50&&peak!==null&&peak>-55;
 checks.noClipping=peak!==null&&peak<=-1;
 checks.loudness=lufs!==null&&Math.abs(lufs-(entry.targetLufs??-18))<=(entry.loudnessToleranceLufs??2);
 checks.initialSilence=initialSilence<=0.25;
 checks.trailingSilence=trailingSilence<=0.2;
 checks.sampleRate=sampleRate===44100;
 checks.channels=channels===1;
 checks.format=codec==='mp3';
 for(const [key,ok]of Object.entries(checks))if(!ok)errors.push(key);
 return{ok:Object.values(checks).every(Boolean),durationSeconds,integratedLufs:lufs,truePeakDbtp:peak,initialSilenceSeconds:initialSilence,trailingSilenceSeconds:trailingSilence,sampleRate,channels,codec,checks,errors,bytes};
}
async function listFiles(dir:string):Promise<string[]>{let result:string[]=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())result=result.concat(await listFiles(p));else result.push(p)}return result}
export async function createQcReport(root:string,manifest:PreviewManifest,entries:PreviewEntry[],results:Record<string,TechnicalResult>){
 const expected=entries.map(e=>join(root,'public',e.audioPath));const files=await listFiles(join(root,'public','audio-previews'));const audioFiles=files.filter(p=>p.toLowerCase().endsWith('.mp3'));const missing=expected.filter(p=>!audioFiles.includes(p));const orphan=audioFiles.filter(p=>!expected.includes(p));const failed=entries.filter(e=>!results[e.previewId]?.ok).map(e=>({id:e.previewId,path:e.audioPath,...results[e.previewId]}));const byteSizes=Object.values(results).map(r=>r.bytes).filter(n=>n>0);const totalBytes=byteSizes.reduce((a,b)=>a+b,0);const avg=byteSizes.length?Math.round(totalBytes/byteSizes.length):0;const largest=Math.max(0,...byteSizes);
 const musicFailures=entries.filter(e=>!e.musicQcPassed).map(e=>({id:e.previewId,failed:e.musicQc.filter(r=>!r.ok)}));
 const counts={instruments:manifest.coverage.instruments,behaviours:manifest.coverage.behaviours,grooves:manifest.coverage.grooves,reusablePatterns:new Set(entries.map(e=>e.pattern)).size};
 const report={version:manifest.version,renderer:manifest.renderer,soundSource:manifest.soundSource,counts,technical:{checked:entries.length,passed:entries.length-failed.length,failed:failed.length,missing,orphan,failedAssets:failed,silent:entries.filter(e=>results[e.previewId]?.checks.notSilent===false).map(e=>e.previewId),clipping:entries.filter(e=>results[e.previewId]?.checks.noClipping===false).map(e=>e.previewId),loudness:entries.filter(e=>results[e.previewId]?.checks.loudness===false).map(e=>e.previewId),duration:entries.filter(e=>results[e.previewId]?.checks.duration===false).map(e=>e.previewId),manifestErrors:missing.length+orphan.length,totalBytes,averageBytes:avg,largestBytes:largest,loudnessPolicy:{standardTargetLufs:manifest.targetLufs,percussionOnlyTargetLufs:manifest.percussionOnlyTargetLufs,standardToleranceLufs:2,percussionOnlyToleranceLufs:2.5,targetTruePeakDbtp:manifest.targetTruePeakDbtp},maxInitialSilenceSeconds:0.25},musicRules:{checked:entries.reduce((n,e)=>n+e.musicQc.length,0),failed:musicFailures.length,failures:musicFailures},coverage:manifest.coverage,representativeCount:manifest.representative.length};
 const md=['# Audio Preview QC Report','',`- Technical assets: ${report.technical.passed}/${report.technical.checked} passed`,`- Loudness policy: ${manifest.targetLufs} LUFS for pitched/mixed samples (±2 LU); ${manifest.percussionOnlyTargetLufs} LUFS for isolated percussion (±2.5 LU); true-peak synthesis ceiling ${manifest.targetTruePeakDbtp} dBTP`,`- Instrument tones: ${counts.instruments.mapped}/${counts.instruments.expected}`,`- Behaviour mappings: ${counts.behaviours.mapped}/${counts.behaviours.behaviourPairsExpected} behaviour/instrument pairs (${counts.behaviours.uniqueExpected} unique English strings)`,`- Grooves: ${counts.grooves.mapped}/${counts.grooves.expected}`,`- Reusable patterns: ${counts.reusablePatterns}`,`- Music rule failures: ${report.musicRules.failed}`,`- Technical failures: ${report.technical.failed}`,`- Missing files: ${missing.length}`,`- Silent files: ${report.technical.silent.length}`,`- Clipping failures: ${report.technical.clipping.length}`,`- Manifest errors / orphans: ${report.technical.manifestErrors}`,`- Compressed audio: ${(totalBytes/1024/1024).toFixed(2)} MiB total; ${(avg/1024).toFixed(1)} KiB average; ${(largest/1024).toFixed(1)} KiB largest`,'',...(failed.length?['## Failed assets','',...failed.map(item=>`- ${item.id}: ${item.errors?.join(', ')}`)]:['All preview files passed technical audio QC.']),'',...(musicFailures.length?['## Music rule failures','',...musicFailures.map(item=>`- ${item.id}: ${item.failed.map(f=>f.rule).join(', ')}`)]:['All generated music specifications passed their structural rules.']),''].join('\n');
 return{report,markdown:md};
}
export function flattenEntries(m:PreviewManifest):PreviewEntry[]{return[...Object.values(m.instruments),...Object.values(m.behaviours),...Object.values(m.grooves)]}
