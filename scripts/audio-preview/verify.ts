import { readFile, readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { buildPreviewCatalog } from '../../src/audio-preview/catalog';
import { flattenEntries } from '../../src/audio-preview/qc';
import process from 'node:process';

async function files(dir:string):Promise<string[]>{let all:string[]=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())all=all.concat(await files(p));else all.push(p)}return all}
function assert(ok:boolean,message:string):void{if(!ok)throw new Error(message)}
function run(command:string,args:string[]):Promise<{code:number;stdout:string;stderr:string}>{return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>resolve({code:code??1,stdout,stderr}))})}
async function main():Promise<void>{
 const root=resolve(process.cwd()), expected=buildPreviewCatalog(), manifestPath=join(root,'public/audio-previews/manifest.json');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8')) as typeof expected.manifest;
 const all=flattenEntries(manifest), wanted=flattenEntries(expected.manifest);
 const keySets:[[string,string[]],[string,string[]],[string,string[]]]=[['instruments',Object.keys(expected.manifest.instruments)],['behaviours',Object.keys(expected.manifest.behaviours)],['grooves',Object.keys(expected.manifest.grooves)]];
 for(const [category,keys] of keySets){const actual=Object.keys(manifest[category]);assert(keys.length===actual.length&&keys.every(key=>actual.includes(key)),`${category} coverage mismatch: expected catalog-derived mappings ${keys.length}, found ${actual.length}`)}
 assert(manifest.coverage.instruments.mapped===expected.manifest.coverage.instruments.expected,'instrument coverage counter does not match catalog');
 assert(manifest.coverage.behaviours.mapped===expected.manifest.coverage.behaviours.behaviourPairsExpected,'behaviour pair coverage counter does not match catalog');
 assert(manifest.coverage.grooves.mapped===expected.manifest.coverage.grooves.expected,'groove coverage counter does not match catalog');
 for(const entry of all){assert(entry.musicQcPassed&&entry.musicQc.every(rule=>rule.ok),`music rules failed for ${entry.previewId}`);assert(!entry.audioPath.startsWith('/')&&!entry.audioPath.includes('..'),`unsafe audio path for ${entry.previewId}`);const file=join(root,'public',entry.audioPath);const info=await stat(file);assert(info.isFile()&&info.size>500,`missing/empty committed preview ${entry.audioPath}`);const original=wanted.find(item=>item.previewId===entry.previewId);assert(original?.sourceLabel===entry.sourceLabel&&original.audioPath===entry.audioPath,`manifest/catalog mismatch for ${entry.previewId}`);assert((entry.technicalQc as {ok?:boolean}|undefined)?.ok===true,`technical QC status missing or failed for ${entry.previewId}`)}
 const expectedPaths=new Set(all.map(e=>join(root,'public',e.audioPath)));const actualFiles=(await files(join(root,'public/audio-previews'))).filter(p=>p.endsWith('.mp3'));const orphan=actualFiles.filter(p=>!expectedPaths.has(p));assert(actualFiles.length===all.length,`asset count mismatch: expected ${all.length}, found ${actualFiles.length}`);assert(orphan.length===0,`orphan audio files: ${orphan.join(', ')}`);
 const qc=JSON.parse(await readFile(join(root,'public/audio-previews/audio-preview-qc.json'),'utf8')) as {technical:{failed:number;manifestErrors:number};musicRules:{failed:number}};assert(qc.technical.failed===0,'QC report contains technical failures');assert(qc.technical.manifestErrors===0,'QC report contains manifest errors');assert(qc.musicRules.failed===0,'QC report contains music-rule failures');
 const archive=join(root,'public/audio-preview-review.zip');const archiveInfo=await stat(archive);assert(archiveInfo.isFile()&&archiveInfo.size>1000,'review ZIP is missing or unexpectedly small');const zipped=await run('python3',['-c','import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); bad=z.testzip(); print(json.dumps(z.namelist())); sys.exit(1 if bad else 0)',archive]);assert(zipped.code===0,`review ZIP cannot be decoded: ${zipped.stderr}`);const archivedNames=JSON.parse(zipped.stdout) as string[];const archived=new Set(archivedNames);for(const path of all.map(entry=>`public/${entry.audioPath}`))assert(archived.has(path),`review ZIP missing preview ${path}`);for(const path of ['public/audio-previews/manifest.json','public/audio-previews/audio-preview-qc.json','public/audio-previews/audio-preview-qc.md','AUDIO_ASSET_LICENSES.md'])assert(archived.has(path),`review ZIP missing ${path}`);assert(archivedNames.filter(path=>path.endsWith('.mp3')).length===all.length,'review ZIP audio count does not match the full preview catalog');
 console.log(`Instrument tone previews: ${manifest.coverage.instruments.mapped}/${manifest.coverage.instruments.expected}`);
 console.log(`Instrument behaviour pairs: ${manifest.coverage.behaviours.mapped}/${manifest.coverage.behaviours.behaviourPairsExpected} (${manifest.coverage.behaviours.uniqueExpected} unique English behaviour strings)`);
 console.log(`Grooves: ${manifest.coverage.grooves.mapped}/${manifest.coverage.grooves.expected}`);
 console.log(`Audio assets: ${all.length}; reusable music patterns: ${new Set(all.map(e=>e.pattern)).size}; representative playlist items: ${manifest.representative.length}`);
 console.log(`Review ZIP: ${archivedNames.filter(path=>path.endsWith('.mp3')).length} previews plus manifest, QC reports, and license; archive integrity passed.`);
 console.log('Audio manifest, coverage, structural rules, committed files, technical QC markers, archive contents and orphan checks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
