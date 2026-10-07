import { INSTRUMENTS } from '../data/instruments';
import { JAZZ_STYLES } from '../data/jazz-styles';
import { makeBehaviourSpec, makeGrooveSpec, makeInstrumentSpec, validateMusicSpec, type MusicSpec, type PreviewGroove, type PreviewInstrument, type RuleResult } from './music';

export interface PreviewEntry {
  previewId: string; sourceCatalogId: string; sourceLabel: string; category: 'instrument'|'behaviour'|'groove'; semanticFamily: string;
  audioPath: string; pattern: string; instrumentId?: string; instrument?: string;
  bpm: number; meter: string; durationSeconds: number; targetLufs: number; loudnessToleranceLufs: number; targetTruePeakDbtp: number; musicQc: RuleResult[]; musicQcPassed: boolean; technicalQc?: unknown;
}
export interface PreviewRef { category: 'instrument'|'behaviour'|'groove'; key: string; label: string; previewId: string }
export interface PreviewManifest {
  version: string; renderer: string; soundSource: string; sampleRate: number; channels: number; format: string;
  targetLufs: number; percussionOnlyTargetLufs: number; targetTruePeakDbtp: number;
  coverage: { instruments: { expected: number; mapped: number }; behaviours: { uniqueExpected: number; behaviourPairsExpected: number; mapped: number }; grooves: { expected: number; mapped: number } };
  instruments: Record<string, PreviewEntry>; behaviours: Record<string, PreviewEntry>; grooves: Record<string, PreviewEntry>; representative: PreviewRef[];
}
export interface PreviewCatalog { manifest: PreviewManifest; specs: Record<string, MusicSpec> }
const slug=(s:string):string=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'preview';
const behaviorKey=(instrumentId:string,behaviour:string):string=>`${instrumentId}::${behaviour}`;
const expectedGrooves=():PreviewGroove[]=>[...new Map(JAZZ_STYLES.flatMap(style=>style.grooves).map(g=>[g.id,g])).values()];
const duration=(spec:MusicSpec):number=>spec.bars*spec.meter[0]*4/spec.meter[1]*60/spec.bpm;
function entry(spec:MusicSpec,category:PreviewEntry['category'],sourceId:string,label:string,path:string,instrument?:PreviewInstrument):PreviewEntry {
 const musicQc=validateMusicSpec(spec);
 const percussionOnly=spec.tracks.length>0&&spec.tracks.every(track=>track.role==='rhythm');
 return {previewId:spec.id,sourceCatalogId:sourceId,sourceLabel:label,category,semanticFamily:spec.semanticFamily,audioPath:path,pattern:spec.source,instrumentId:instrument?.id,instrument:instrument?.name,bpm:spec.bpm,meter:spec.meter.join('/'),durationSeconds:Number(duration(spec).toFixed(3)),targetLufs:percussionOnly?-22.5:-18,loudnessToleranceLufs:percussionOnly?2.5:2,targetTruePeakDbtp:-2.8,musicQc,musicQcPassed:musicQc.every(rule=>rule.ok)};
}
function pickInstrument(query:string, fallbackCategory?:string):PreviewInstrument|undefined {
 return (INSTRUMENTS.find(i=>i.id===query)||INSTRUMENTS.find(i=>i.name.toLowerCase().includes(query.toLowerCase()))||INSTRUMENTS.find(i=>i.category===fallbackCategory)) as PreviewInstrument|undefined;
}
function pickBehaviour(i:PreviewInstrument|undefined,query:RegExp):string|undefined {return i?.behaviours.find(value=>query.test(value))}
function pickGroove(query:RegExp):PreviewGroove|undefined {return expectedGrooves().find(g=>query.test(`${g.id} ${g.label} ${g.prompt}`))}

export function buildPreviewCatalog():PreviewCatalog {
 const instruments:Record<string,PreviewEntry>={}, behaviours:Record<string,PreviewEntry>={}, grooves:Record<string,PreviewEntry>={}, specs:Record<string,MusicSpec>={};
 const typed=INSTRUMENTS as PreviewInstrument[];
 for(const instrument of typed){
  const spec=makeInstrumentSpec(instrument); specs[spec.id]=spec;
  instruments[instrument.id]=entry(spec,'instrument',instrument.id,instrument.name,`audio-previews/instruments/${instrument.id}.mp3`,instrument);
  instrument.behaviours.forEach((behaviour,index)=>{const behaviorSpec=makeBehaviourSpec(instrument,behaviour,index),key=behaviorKey(instrument.id,behaviour),id=`${instrument.id}-${slug(behaviour)}-${index+1}`;specs[behaviorSpec.id]=behaviorSpec;behaviours[key]=entry(behaviorSpec,'behaviour',key,behaviour,`audio-previews/behaviours/${id}.mp3`,instrument)});
 }
 for(const groove of expectedGrooves()) {const spec=makeGrooveSpec(groove);specs[spec.id]=spec;grooves[groove.id]=entry(spec,'groove',groove.id,groove.label,`audio-previews/grooves/${slug(groove.id)}.mp3`)}
 const representative:PreviewRef[]=[];
 const add=(category:PreviewRef['category'],entry:PreviewEntry|undefined,key:string,label:string)=>{if(entry)representative.push({category,key,label,previewId:entry.previewId})};
 const instrumentChoices:[string,string][]=[['piano','Piano'],['rhodes','Rhodes'],['flugelhorn','Flugelhorn'],['tenor-sax','Tenor Sax'],['manouche-guitar','Manouche Guitar'],['upright-bass','Upright Bass'],['brush-drums','Brush Drums']];
 for(const [id,label] of instrumentChoices){const i=pickInstrument(id,id==='brush-drums'?'percussion':undefined);if(i)add('instrument',instruments[i.id],i.id,label)}
 const behaviorChoices:Array<[string,RegExp,string,string?]>=[['bass',/walking bass/i,'Walking Bass','upright-bass'],['bass',/modal pedal/i,'Modal Pedal','upright-bass'],['keyboard',/quartal/i,'Quartal Voicing','piano'],['guitar',/sparse/i,'Sparse Guitar Phrase','nylon-guitar'],['keyboard',/montuno/i,'Montuno','piano'],['bass',/tumbao/i,'Tumbao','upright-bass'],['guitar',/la pompe/i,'La Pompe','acoustic-guitar'],['percussion',/ride-cymbal swing|swing eighth/i,'Swing Ride','acoustic-drums']];
 for(const [category,pattern,label,id] of behaviorChoices){const i=pickInstrument(id??'',category);const behavior=pickBehaviour(i,pattern);if(i&&behavior)add('behaviour',behaviours[behaviorKey(i.id,behavior)],behaviorKey(i.id,behavior),label)}
 for(const [pattern,label] of [[/soul.?shuffle|shuffle/,'Soul Shuffle'],[/straight.?16|16th/,'Straight-16 Funk'],[/broken.?beat/,'Broken Beat'],[/bossa/,'Bossa'],[/swing/,'Relaxed Swing']] as Array<[RegExp,string]>){const g=pickGroove(pattern);if(g)add('groove',grooves[g.id],g.id,label)}
 const uniqueBehaviours=new Set(typed.flatMap(i=>i.behaviours));
 const manifest:PreviewManifest={version:'1.0.0',renderer:'FluidSynth 2.x + FluidR3_GM SoundFont; deterministic MIDI event renderer',soundSource:'FluidR3_GM.sf2 (MIT)',sampleRate:44100,channels:1,format:'MP3 CBR 96 kb/s',targetLufs:-18,percussionOnlyTargetLufs:-22.5,targetTruePeakDbtp:-2.8,
  coverage:{instruments:{expected:typed.length,mapped:Object.keys(instruments).length},behaviours:{uniqueExpected:uniqueBehaviours.size,behaviourPairsExpected:typed.reduce((sum,i)=>sum+i.behaviours.length,0),mapped:Object.keys(behaviours).length},grooves:{expected:expectedGrooves().length,mapped:Object.keys(grooves).length}},instruments,behaviours,grooves,representative};
 return {manifest,specs};
}
export { behaviorKey, expectedGrooves };

export interface PreviewRuntimeIndex { instruments: Record<string,string>; behaviours: Record<string,string>; grooves: Record<string,string> }
export function makeRuntimeIndex(manifest:PreviewManifest):PreviewRuntimeIndex {
 return {
  instruments:Object.fromEntries(Object.entries(manifest.instruments).map(([key,value])=>[key,value.audioPath])),
  behaviours:Object.fromEntries(Object.entries(manifest.behaviours).map(([key,value])=>[key,value.audioPath])),
  grooves:Object.fromEntries(Object.entries(manifest.grooves).map(([key,value])=>[key,value.audioPath])),
 };
}
