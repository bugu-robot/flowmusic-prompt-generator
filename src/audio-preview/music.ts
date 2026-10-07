export interface PreviewInstrument { id: string; name: string; category: string; behaviours: string[] }
export interface PreviewGroove { id: string; label: string; prompt: string }
export interface MusicEvent { beat: number; pitch: number; duration: number; velocity: number }
export interface PercussionMapping {
 percussionKitFamily: string;
 soundFontBank: number;
 soundFontProgram: number;
 soundFontPreset: string;
 articulationFamily: string;
 fidelity: 'SOUNDFONT_ARTICULATION'|'TIMBRE_APPROXIMATION';
}
export interface MusicTrack { name: string; instrumentId: string; program: number; channel: number; role: string; notes: MusicEvent[]; percussionMapping?: PercussionMapping }
export interface MusicSpec { id: string; category: 'instrument'|'behaviour'|'groove'; source: string; semanticFamily: string; bpm: number; meter: [number,number]; bars: number; tracks: MusicTrack[]; rules: string[] }
export interface RuleResult { rule: string; ok: boolean; detail: string }
const gm: Record<string,number> = {'nylon-guitar':24,'acoustic-guitar':25,'manouche-guitar':26,'jazz-electric-guitar':27,'distorted-guitar':30,piano:0,rhodes:4,'hammond-organ':16,vibraphone:11,trumpet:56,'muted-trumpet':59,flugelhorn:56,'alto-sax':65,'tenor-sax':66,'soprano-sax':64,'bari-sax':67,clarinet:71,trombone:57,violin:40,'upright-bass':32,'electric-bass':33,tuba:58,synth:89,'ambient-pads':89,'brush-drums':40,'acoustic-drums':32,'heavy-rock-drums':16,'soft-shaker':0,congas:0,bongos:0,timbales:0,'brazilian-percussion':0};
const GM_DRUM_BANK=128;
const PERCUSSION_PRESETS:Record<string,Omit<PercussionMapping,'articulationFamily'|'fidelity'>>={
 'acoustic-drums':{percussionKitFamily:'acoustic-jazz',soundFontBank:GM_DRUM_BANK,soundFontProgram:32,soundFontPreset:'Jazz'},
 'brush-drums':{percussionKitFamily:'brush',soundFontBank:GM_DRUM_BANK,soundFontProgram:40,soundFontPreset:'Brush'},
 'heavy-rock-drums':{percussionKitFamily:'power-rock',soundFontBank:GM_DRUM_BANK,soundFontProgram:16,soundFontPreset:'Power'},
 congas:{percussionKitFamily:'conga',soundFontBank:GM_DRUM_BANK,soundFontProgram:0,soundFontPreset:'Standard'},
 bongos:{percussionKitFamily:'bongo',soundFontBank:GM_DRUM_BANK,soundFontProgram:0,soundFontPreset:'Standard'},
 timbales:{percussionKitFamily:'timbales',soundFontBank:GM_DRUM_BANK,soundFontProgram:0,soundFontPreset:'Standard'},
 'soft-shaker':{percussionKitFamily:'soft-shaker',soundFontBank:GM_DRUM_BANK,soundFontProgram:0,soundFontPreset:'Standard'},
 'brazilian-percussion':{percussionKitFamily:'brazilian-section',soundFontBank:GM_DRUM_BANK,soundFontProgram:0,soundFontPreset:'Standard'},
};
const BRUSH_PATTERNS=new Set(['brush-sweep-demo','brush-light-pulse','brush-subtle-time','brush-noir','noir-brushes']);
const percussionMapping=(id:string,pattern=''):PercussionMapping=>{
 const selectedId=id==='acoustic-drums'&&BRUSH_PATTERNS.has(pattern)?'brush-drums':id;
 const preset=PERCUSSION_PRESETS[selectedId]??PERCUSSION_PRESETS['acoustic-drums']!;
 const brush=selectedId==='brush-drums';
 const mapping:PercussionMapping={...preset,articulationFamily:brush?(pattern==='brush-subtle-time'?'brush-tap-pulse':pattern==='brush-noir'||pattern==='noir-brushes'?'brush-sparse-swirl':'brush-sweep-swirl'):
  selectedId==='acoustic-drums'?(pattern.startsWith('swing')||pattern==='hard-bop-ride'?'ride-cymbal-time':'acoustic-kit-articulations'):
  selectedId==='heavy-rock-drums'?'power-kick-snare-cymbal':
  selectedId==='congas'?'open-muted-low-conga':selectedId==='bongos'?'high-low-bongo':selectedId==='timbales'?'high-low-timbales':
  selectedId==='soft-shaker'?'maracas-shaker-approximation':selectedId==='brazilian-percussion'?'surdo-caixa-chocalho-approximation':'standard-percussion',
  fidelity:(selectedId==='soft-shaker'||selectedId==='brazilian-percussion'?'TIMBRE_APPROXIMATION':'SOUNDFONT_ARTICULATION') as PercussionMapping['fidelity']};
 return mapping;
};
const hash=(s:string):number=>Array.from(s).reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,7);
const note=(beat:number,pitch:number,duration=.36,velocity=76):MusicEvent=>({beat,pitch,duration,velocity});
const tr=(name:string,instrumentId:string,role:string,notes:MusicEvent[],program=gm[instrumentId]??0,channel=role==='bass'?1:role==='harmony'?2:role==='texture'?3:0):MusicTrack=>({name,instrumentId,role,notes,program,channel});
const drum=(name:string,id:string,notes:MusicEvent[],pattern='straight-eighth',kitId=id):MusicTrack=>{
 const percussionMapping=percussionMappingFor(kitId,pattern);
 return{...tr(name,id,'rhythm',notes,percussionMapping.soundFontProgram,9),percussionMapping};
};
export function percussionMappingFor(id:string,pattern=''):PercussionMapping{return percussionMapping(id,pattern)}
const chord=(beat:number,pitches:number[],duration=.34,velocity=65):MusicEvent[]=>pitches.map(p=>note(beat,p,duration,velocity));
const repeated=(events:Array<[number,number,number?]>,bars:number,stride=4):MusicEvent[]=>Array.from({length:bars},(_,bar)=>events.map(([beat,pitch,velocity=65])=>note(bar*stride+beat,pitch,.12,velocity))).flat();
const clamp=(n:number,a:number,b:number):number=>Math.max(a,Math.min(b,n));

function melody(i:PreviewInstrument,source:string,bars=4):MusicTrack {
  const seed=hash(source+i.id), base=i.category==='brass'?64:i.category==='woodwind'?62:60, scale=[0,2,4,7,9,12,14,16,19];
  const rhythm=bars<=2?[0,.75,1.75,2.5,3.5,4.75,5.5,6.5,7.5]:[0,1.5,2.5,3.5,4.75,6,7.5,9,10.5,12.5,14,15.5];
  const notes=rhythm.slice(0,Math.min(rhythm.length,bars*4)).map((beat,n)=>note(beat,base+scale[(n*3+seed%5)%scale.length]!+(n%5===4?12:0),n%3===0?.65:.34,70+n%4*2));
  return tr(i.name,i.id,'lead',notes);
}
function neutralInstrumentTone(i:PreviewInstrument):MusicTrack {
 const base=i.category==='brass'?64:i.category==='woodwind'?62:60;
 const beats=[0,.75,1.75,3,4.5,6,7],intervals=[0,2,4,7,9,7,4],durations=[.55,.32,.42,.7,.38,.52,.78];
 return tr(i.name,i.id,'lead',beats.map((beat,index)=>note(beat,base+intervals[index]!,durations[index]!,72-index%3*3)));
}
function bassWalk(i:PreviewInstrument):MusicTrack {
  const roots=[40,43,45,47],notes:MusicEvent[]=[];
  for(let bar=0;bar<4;bar++)for(let beat=0;beat<4;beat++)notes.push(note(bar*4+beat,beat===0?roots[bar]!:clamp(roots[bar]!+[0,3,5,7][beat]!-(bar%2?12:0),28,48),.82,74));
  return tr(i.name,i.id,'bass',notes);
}
function bassTwoFeel(i:PreviewInstrument):MusicTrack {const roots=[40,43,45,47],notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++){notes.push(note(bar*4,roots[bar]!,1.72,70),note(bar*4+2,roots[bar]!,1.72,58))}return tr(i.name,i.id,'bass',notes)}
function bassMeter(i:PreviewInstrument,stride:number,bars=4):MusicTrack {const roots=[40,43,45,47],n:MusicEvent[]=[];for(let bar=0;bar<bars;bar++){const slots=stride===3?[0,1,2]:[0,1.5,2.5];for(let beat=0;beat<slots.length;beat++)n.push(note(bar*stride+slots[beat]!,roots[bar]??40,.62,70))}return tr(i.name,i.id,'bass',n)}
function melodyMeter(i:PreviewInstrument,source:string,stride:number,bars=4):MusicTrack {const seed=hash(source+i.id),base=i.category==='brass'?64:i.category==='woodwind'?62:60,scale=[0,2,4,7,9,12,14,16,19],slots=stride===3?[0,1.5,2.5]:[0,1.25,2.5];const notes=Array.from({length:bars},(_,bar)=>slots.map((at,index)=>note(bar*stride+at,base+scale[(bar*3+index+seed%5)%scale.length]!,index===0?.62:.34,70+(bar+index)%4*2))).flat();return tr(i.name,i.id,'lead',notes)}
function harmonyMeter(i:PreviewInstrument,stride:number,bars=4):MusicTrack {const pitches=i.category==='guitar'?[55,59,62]:[60,64,67],slots=stride===3?[0,1.5]:[0,2.5],notes:MusicEvent[]=[];for(let bar=0;bar<bars;bar++)for(const at of slots)notes.push(...chord(bar*stride+at,pitches,.42,62));return tr(i.name,i.id,'harmony',notes)}
function pedal(i:PreviewInstrument):MusicTrack{return tr(i.name,i.id,'bass',Array.from({length:4},(_,bar)=>note(bar*4,36,3.82,70)))}
function bassOstinato(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let b=0;b<4;b++)for(const [at,p] of [[0,36],[1.5,43],[2.5,36],[3.5,38]] as const)n.push(note(b*4+at,p,.42,72));return tr(i.name,i.id,'bass',n)}
function tumbao(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let b=0;b<4;b++)for(const [at,p] of [[1.5,40],[3.5,43]] as const)n.push(note(b*4+at,p,.38,75));return tr(i.name,i.id,'bass',n)}
function montuno(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let cycle=0;cycle<2;cycle++)for(const at of [0,1.5,2.5,4,5.5,6.5])n.push(...chord(cycle*8+at,cycle%2?[60,64,67]:[65,69,72],.23,65));return tr(i.name,i.id,'harmony',n)}
function quartal(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let b=0;b<4;b++)n.push(...chord(b*4,[60+(b%2?2:0),65+(b%2?2:0),70+(b%2?2:0)],3.75,60));return tr(i.name,i.id,'harmony',n)}
function comp(i:PreviewInstrument,compact=false):MusicTrack {const pitches=i.category==='guitar'?[55,59,62,66]:[60,64,67],n:MusicEvent[]=[];for(let b=0;b<4;b++)for(const at of (compact?[0,1,2,3]:[0,1.5,2.5,3.5]))n.push(...chord(b*4+at,pitches,compact?.18:.34,62));return tr(i.name,i.id,'harmony',n)}
function spaciousComp(i:PreviewInstrument,low=false):MusicTrack {const pitches=low?[48,51,55]:i.category==='guitar'?[55,59,62]:[60,64,67],n:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const at of low?[0]:[0,2])n.push(...chord(bar*4+at,pitches,low?1.65:1.35,low?53:57));return tr(i.name,i.id,'harmony',n)}
function syncopatedComp(i:PreviewInstrument):MusicTrack {const pitches=i.category==='guitar'?[55,59,62,66]:[60,64,67,70],n:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const [at,velocity] of [[.75,56],[2.5,70],[3.25,52]] as const)n.push(...chord(bar*4+at,pitches,.2,velocity));return tr(i.name,i.id,'harmony',n)}
function lightMelodicComp(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){for(const [at,pitches] of [[0,[60,64]],[2.5,[62,67]]] as const)n.push(...chord(bar*4+at,[...pitches],.3,54));for(const [at,pitch] of [[1.5,67],[3.5,69]] as const)n.push(note(bar*4+at,pitch,.2,48))}return tr(i.name,i.id,'harmony',n)}
function gospelBluesComp(i:PreviewInstrument):MusicTrack {const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const pitches=bar%2?[65,69,72,75]:[60,64,67,70];for(const at of [0,1.5,2.5,3.5])notes.push(...chord(bar*4+at,pitches,.24,bar%2?67:73))}return tr(i.name,i.id,'harmony',notes)}
function twoBeatComp(i:PreviewInstrument):MusicTrack {const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const at of [0,2])notes.push(...chord(bar*4+at,i.category==='guitar'?[55,59,62]:[60,64,67],.58,58));return tr(i.name,i.id,'harmony',notes)}
function modalCluster(i:PreviewInstrument):MusicTrack {const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const [offset,pitches] of [[0,[60,61,65,68]],[2.75,[62,67,68,71]]] as const)notes.push(...chord(bar*4+offset,[...pitches],1.05,46));return tr(i.name,i.id,'harmony',notes)}
function funkGuitarComp(i:PreviewInstrument):MusicTrack {const pitches=[55,59,62,66],notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const at of [.5,1.5,2.5,3.5])notes.push(...chord(bar*4+at,pitches,.13,at===2.5?66:52));return tr(i.name,i.id,'harmony',notes)}
function singleNoteResponse(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),beats=[.75,2.5,4.25,6.75,8.5,10,12.75,15],durations=[.32,.48,.28,.62,.35,.54,.3,.42],base=i.category==='brass'?64:i.category==='woodwind'?62:60,scale=[0,2,4,7,9,12,14];return tr(i.name,i.id,'response',beats.map((beat,index)=>note(beat,base+scale[(index+seed%5)%scale.length]!+(index%3===2?12:0),durations[index]!,60+index%3*3)))}
function conversationalResponse(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),beats=[1,3.5,6.25,9,11.5,14.75],durations=[.5,.34,.72,.38,.56,.32],base=i.category==='brass'?65:i.category==='woodwind'?63:61,scale=[0,3,5,7,10,12];return tr(i.name,i.id,'response',beats.map((beat,index)=>note(beat,base+scale[(index+seed%3)%scale.length]!+(index===3?12:0),durations[index]!,56+index%3*3)))}
function fingerstyleGuitar(i:PreviewInstrument):MusicTrack {const events:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;for(const [at,pitch,duration,velocity] of [[0,45,.55,59],[.5,52,.42,49],[1,57,.5,53],[2,55,.55,58],[2.5,60,.38,48],[3.25,62,.42,52]] as const)events.push(note(base+at,pitch,duration,velocity))}return tr(i.name,i.id,'plucked-arpeggio',events)}
function sustainedLine(i:PreviewInstrument):MusicTrack {const base=i.category==='bass'?36:i.category==='brass'?52:i.category==='woodwind'?57:i.category==='guitar'?52:60;return tr(i.name,i.id,'texture',[note(0,base,3.65,51),note(4,base+5,3.65,48),note(8,base+2,3.65,50),note(12,base+7,3.65,47)])}
function lowRegisterSupport(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'foundation',[note(0,48,1.65,54),note(2,43,1.45,50),note(4,47,1.75,53),note(6,43,1.4,48),note(8,45,1.7,52),note(10,40,1.45,48),note(12,43,1.7,51),note(14,40,1.4,47)])}
function lowBrassPulse(i:PreviewInstrument):MusicTrack {const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++){notes.push(note(bar*4,36,.82,72),note(bar*4+2,43,.62,61))}return tr(i.name,i.id,'bass',notes)}
function arrangedStabs(i:PreviewInstrument,role='ensemble-stabs'):MusicTrack {const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const pitchSet=bar%2?[65,69,72,76]:[60,64,67,71];for(const at of [1,3])notes.push(...chord(bar*4+at,pitchSet,.16,62))}return tr(i.name,i.id,role,notes)}
function ensembleSectionLine(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const at of [0,1.5,2.5,3.5]){const root=58+((bar+seed)%3)*2;notes.push(...chord(bar*4+at,[root,root+4,root+7],.32,57))}return tr(i.name,i.id,'section-line',notes)}
function tailgateResponse(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),beats=[.5,2.7,4.25,7.1,8.6,11.4,12.5,15.15],pitches=[50,53,55,58,52,55,50,48];return tr(i.name,i.id,'response',beats.map((beat,index)=>note(beat,pitches[(index+seed%4)%pitches.length]!,index%2?.28:.72,58+index%3*3)))}
function latinImprovisation(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),beats=[0,.75,1.5,3.25,4.5,6.75,8,9.5,11.25,12.5,14.75],scale=[0,2,4,7,9,12];return tr(i.name,i.id,'lead',beats.map((beat,index)=>note(beat,64+scale[(index+seed%3)%scale.length]!+(index%4===2?12:0),index%3===0?.58:.25,65+index%4*2)))}
function bluesImprovisation(i:PreviewInstrument,source:string):MusicTrack {const seed=hash(source+i.id),beats=[0,.75,1.25,2.5,3.25,4.5,6,6.75,8,9.25,10.5,12,13.5,15],scale=[0,3,5,6,7,10,12];return tr(i.name,i.id,'lead',beats.map((beat,index)=>note(beat,64+scale[(index+seed%2)%scale.length]!+(index%5===4?12:0),index%3===0?.48:.24,66+index%3*3)))}
function clave(iid:string,name:string,kitId=iid):MusicTrack {const n:MusicEvent[]=[];for(let c=0;c<2;c++)for(const at of [1,3,4,5.5,7])n.push(note(c*8+at,75,.12,76));return drum(name,iid,n,'latin-clave',kitId)}
function swingRide(iid:string,name:string,bars=4,meter:[number,number]=[4,4],pattern='swing-clear-eighth'):MusicTrack {
 const notes:MusicEvent[]=[];
 for(let bar=0;bar<bars;bar++){
  const base=bar*meter[0];
  for(let beat=0;beat<meter[0];beat++){
   const light=pattern==='swing-light'||pattern==='swing-restrained-ride';
   if(pattern==='swing-light'&&beat%2!==0)continue;
   notes.push(note(base+beat,51,.12,light?(beat%2?38:52):(beat%2?56:70)));
   if(meter[0]===4&&pattern==='swing-clear-eighth')notes.push(note(base+beat+2/3,51,.1,49));
   if(meter[0]===4&&pattern==='swing-light'&&beat%2===0)notes.push(note(base+beat+2/3,51,.1,35));
   if(pattern==='hard-bop-ride'&&beat%2===0)notes.push(note(base+beat,53,.1,60));
  }
  if(pattern==='swing-light'&&meter[0]===4)notes.push(note(base+1,37,.12,32),note(base+3,37,.12,34));
  if(pattern==='hard-bop-ride'&&meter[0]===4)notes.push(note(base+1,38,.12,84),note(base+3,38,.12,88),note(base+2,36,.12,79),note(base+3.5,36,.12,70));
 }
 return drum(name,iid,notes,pattern);
}
function pompe(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let b=0;b<4;b++)for(let beat=0;beat<4;beat++)n.push(...chord(b*4+beat,[55,59,62,66],.16,72));return tr(i.name,i.id,'harmony',n)}
function bossaComp(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let b=0;b<4;b++)for(const beat of [.5,1.5,2.5,3.5])n.push(...chord(b*4+beat,[55,59,62],.18,60));return tr(i.name,i.id,'harmony',n)}
function drums(pattern:string,id:string,name:string,bars=4,meter:[number,number]=[4,4]):MusicTrack {
 const hit=(notes:MusicEvent[],kitId=id)=>drum(name,id,notes,pattern,kitId);
 if(pattern==='manouche-swing')return swingRide(id,name,bars,meter,'swing-clear-eighth');
 if(['swing-ride','swing-light','swing-restrained-ride','swing-clear-eighth','hard-bop-ride'].includes(pattern))return swingRide(id,name,bars,meter,pattern==='swing-ride'?'swing-clear-eighth':pattern);
 if(pattern==='swing-open-modern'){
  const notes:MusicEvent[]=[];
  for(let bar=0;bar<bars;bar++){const base=bar*4;for(let beat=0;beat<4;beat++)notes.push(note(base+beat,51,.12,beat%2?42:58));notes.push(note(base+1.5,38,.12,46),note(base+3.25,45,.16,44));}
  return hit(notes);
 }
 if(pattern==='two-beat-early-swing')return hit(repeated([[0,36,60],[2,36,54],[0,51,52],[1,51,38],[2,51,49],[3,51,36],[1,38,39],[3,38,36]],bars));
 if(pattern==='power-rock-drive')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.13,108),note(base+1,38,.13,104),note(base+2,36,.13,99),note(base+3,38,.13,110),note(base+3.5,45,.15,78),note(base+3.75,47,.15,80),...(bar%2===1?[note(base,49,.16,92)]:[]) ]}).flat());
 if(pattern==='latin-hand-interlock')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base+.5,36,.14,55),note(base+1.5,38,.13,45),note(base+2,36,.14,53),note(base+2.75,38,.13,48),note(base+3.5,36,.13,42)]}).flat());
 if(pattern==='latin-hand-clave')return hit(Array.from({length:Math.ceil(bars/2)},(_,cycle)=>[1,3,4,5.5,7].map(at=>note(cycle*8+at,75,.12,62))).flat());
 if(pattern==='latin-percussion-accents')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base+.5,36,.13,56),note(base+1.75,38,.13,62),note(base+2.5,36,.13,53),note(base+3.25,38,.13,67)]}).flat());
 if(pattern==='brush-sweep-demo'||pattern==='brush-light-pulse'){
  const notes:MusicEvent[]=[];
  for(let bar=0;bar<bars;bar++){const base=bar*4;notes.push(note(base,40,.9,pattern==='brush-sweep-demo'?49:40),note(base+1,38,.12,pattern==='brush-sweep-demo'?43:34),note(base+2,40,.8,pattern==='brush-sweep-demo'?45:38),note(base+3,39,.12,pattern==='brush-sweep-demo'?46:36));}
  return hit(notes,'brush-drums');
 }
 if(pattern==='brush-subtle-time')return hit(repeated([[0,38,34],[2,38,30],[1,39,27],[3,39,29]],bars),'brush-drums');
 if(pattern==='brush-noir'||pattern==='noir-brushes')return hit([note(0,40,.85,38),note(2.75,38,.12,34),note(4.5,40,.85,36),note(7.8,39,.12,31),note(8.9,40,.85,35),note(12.25,38,.12,32),note(14.5,40,.85,34)],'brush-drums');
 if(pattern==='free-time')return hit([note(.35,51,.18,62),note(1.45,47,.24,58),note(3.7,51,.16,67),note(5,45,.22,55),note(7.65,51,.16,69),note(9.1,47,.24,57),note(12.6,51,.16,65),note(14.3,45,.24,59)]);
 if(pattern==='third-stream')return hit(Array.from({length:bars},(_,bar)=>[note(bar*4,51,.14,39),note(bar*4+2.5,51,.12,32)]).flat());
 if(pattern==='open-acoustic-time')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return bar%2===0?[note(base+.15,51,.14,53),note(base+1.35,45,.22,42),note(base+3.2,47,.2,39)]:[note(base+.6,45,.2,40),note(base+2.2,51,.14,50),note(base+3.45,47,.2,38)]}).flat());
 if(pattern==='acoustic-hand-interplay')return hit(Array.from({length:bars},(_,bar)=>[note(bar*4,51,.12,52),note(bar*4+2/3,51,.1,39),note(bar*4+1.5,75,.1,38),note(bar*4+3,51,.12,46)]).flat());
 if(pattern==='contemporary-flex'){
  const notes:MusicEvent[]=[];
  const accents=[[0,2.75],[4,6.75],[8,10.5],[12,14.75]] as const;
  for(let bar=0;bar<bars;bar++){
   for(let eighth=0;eighth<8;eighth++)notes.push(note(bar*4+eighth*.5,42,.08,eighth%2?34:44));
   const [kickA,kickB]=accents[bar%accents.length]!;
   notes.push(note(kickA,36,.12,68),note(kickB,36,.12,51),note(bar*4+1,38,.12,59),note(bar*4+3,38,.12,61));
  }
  return hit(notes);
 }
 if(pattern==='neo-soul'){
  const notes:MusicEvent[]=[];
  const hats=[0,.5,1,1.75,2,2.5,3,3.75];
  for(let bar=0;bar<bars;bar++){
   const base=bar*4;
   notes.push(note(base,36,.12,70),note(base+2.78,36,.12,54));
   notes.push(note(base+1.04,38,.12,62),note(base+3.06,38,.12,64));
   for(let index=0;index<hats.length;index++)notes.push(note(base+hats[index]!+(index===3?.02:index===7?.03:0),42,.07,index%3===0?51:35));
  }
  return hit(notes);
 }
 if(pattern==='neo-soul-loose'){
  const notes:MusicEvent[]=[];
  for(let bar=0;bar<bars;bar++){const base=bar*4;notes.push(note(base,36,.12,67),note(base+1.78,38,.12,53),note(base+2.82,36,.12,48),note(base+3.07,38,.12,57));for(const [index,at] of [.08,.58,1.13,1.91,2.08,2.61,3.08,3.87].entries())notes.push(note(base+at,42,.07,index%3?34:48));}
  return hit(notes);
 }
 if(pattern==='boom-bap-soft'){
  const notes:MusicEvent[]=[];
  for(let bar=0;bar<bars;bar++){const base=bar*4;notes.push(note(base,36,.12,62),note(base+2.5,36,.12,43),note(base+2,38,.12,58));for(let eighth=0;eighth<8;eighth++)notes.push(note(base+eighth*.5,42,.08,eighth%2?29:40));}
  return hit(notes);
 }
 if(pattern==='boom-bap-half-time'){
  const notes:MusicEvent[]=[];
  for(let bar=0;bar<bars;bar++){
   const base=bar*4;
   notes.push(note(base,36,.12,78),note(base+2.5,36,.12,55),note(base+2.04,38,.12,74));
   for(let eighth=0;eighth<8;eighth++)notes.push(note(base+eighth*.5,42,.08,eighth%2?39:49));
  }
  return hit(notes);
 }
 if(pattern==='clave'||pattern==='latin-clave'||pattern.endsWith('-clave'))return clave(id,name);
 if(pattern==='jazz-waltz')return hit(repeated([[0,51,65],[1,38,47],[2,51,54]],bars,3));
 if(pattern==='odd-meter')return hit(repeated([[0,36,72],[.5,42,44],[1,42,40],[1.5,38,66],[2,42,43],[2.5,36,58],[3,38,60]],bars,3.5));
 if(pattern==='march')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.14,70),note(base+2,36,.14,63),note(base+1,38,.12,61),note(base+3,38,.12,66),note(base+.5,38,.1,35),note(base+1.5,38,.1,40),note(base+2.5,38,.1,36),note(base+3.5,38,.1,42)]}).flat());
 if(pattern==='funk'||pattern==='funk-comping')return hit(repeated([[0,36,75],[1.5,36,56],[2.75,36,62],[1,38,68],[3,38,72],[0,42,48],[.5,42,40],[1,42,43],[1.5,42,39],[2,42,47],[2.5,42,39],[3,42,45],[3.5,42,40]],bars));
 if(pattern==='ballad')return hit(Array.from({length:bars},(_,bar)=>[note(bar*4,51,.14,46),note(bar*4+1,38,.12,33),note(bar*4+2.5,36,.13,40),note(bar*4+3,51,.12,39)]).flat());
 if(pattern==='open')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base+.25,51,.15,49),note(base+1.75,45,.2,42),...(bar%2===0?[note(base+3.1,51,.14,45)]:[note(base+2.6,47,.2,40)])]}).flat());
 if(pattern==='modal-pulse')return hit(Array.from({length:bars},(_,bar)=>[note(bar*4,45,.2,54),note(bar*4+1.5,51,.12,36),note(bar*4+3,45,.2,48)]).flat());
 if(pattern==='boom-bap'){const e:Array<[number,number,number?]>=[[0,36,82],[2.5,36,70],[3.5,36,48],[1,38,78],[2.75,38,42],[3,38,80]];for(const [index,at] of [0,.5,1,1.5,2,2.75,3.5].entries())e.push([at,42,index%3?40:50]);return hit(repeated(e,bars))}
 if(pattern==='straight-16-funk'){const e:Array<[number,number,number?]>=[[0,36,78],[2,36,68],[1,38,74],[3,38,77]];for(let x=0;x<16;x++)e.push([x*.25,42,x%4===0?57:36]);return hit(repeated(e,bars))}
 if(pattern==='soft-straight')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.13,52),note(base+2,38,.13,43),note(base+1,42,.08,34),note(base+3,42,.08,32)]}).flat());
 if(pattern==='broken-beat')return hit(repeated([[0,36,77],[1.75,36,63],[3.25,36,69],[1,38,75],[2.75,38,72],[3.5,38,61],[.5,42,39],[1.5,42,42],[2.5,42,39],[3.5,42,43]],bars));
 if(pattern==='post-bop-flex')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,51,.12,55),note(base+1,51,.1,38),note(base+2.5,51,.12,48),note(base+3.25,45,.14,42),...(bar%2===1?[note(base+1.75,38,.12,45)]:[])]}).flat());
 if(pattern==='son-clave')return hit(Array.from({length:Math.ceil(bars/2)},(_,cycle)=>[...([1,3,4,5.5,7].map(at=>note(cycle*8+at,75,.12,62))),...([0,1,2,3].map(at=>note(cycle*8+at,56,.12,at%2?46:58)))]).flat());
 if(pattern==='mambo-bell')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,56,.13,67),note(base+1,56,.13,53),note(base+2,56,.13,63),note(base+3,56,.13,54),note(base+.5,36,.13,51),note(base+2.5,38,.13,52),...(bar%2===1?[note(base+3.5,65,.16,62)]:[])]}).flat());
 if(pattern==='samba-soft')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.14,48),note(base+2,36,.14,42),note(base+1.5,38,.13,43),note(base+3.5,38,.13,39),...Array.from({length:8},(_,eighth)=>note(base+eighth*.5,70,.09,eighth%2?27:34))]}).flat());
 if(pattern==='samba-drive')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.14,78),note(base+1.5,36,.14,59),note(base+2.5,38,.13,67),note(base+3.5,38,.13,62),...Array.from({length:8},(_,eighth)=>note(base+eighth*.5,67+eighth%2,.1,eighth%2?44:55))]}).flat());
 if(pattern==='soft-bossa')return hit(Array.from({length:bars},(_,bar)=>{const base=bar*4;return[note(base,36,.13,51),note(base+2,36,.13,42),note(base+1.5,37,.12,37),note(base+3,37,.12,34),note(base+.5,70,.09,33),note(base+1.5,70,.09,34),note(base+2.5,70,.09,31),note(base+3.5,70,.09,32)]}).flat());
 if(['bossa','samba','tumbao'].includes(pattern)){const e:Array<[number,number,number?]>=[[0,36,66],[1.5,36,52],[2.5,38,55],[3.5,37,58],[.5,70,42],[1.5,70,44],[2.5,70,42],[3.5,70,45]];if(pattern==='samba')for(let x=0;x<8;x++)e.push([x*.5,56,48]);return hit(repeated(e,bars))}
 if(pattern==='soul-shuffle'){const e:Array<[number,number,number?]>=[[0,36,72],[2,36,65],[1,38,73],[3,38,75]];for(let b=0;b<4;b++){e.push([b,42,48],[b+2/3,42,36])}return hit(repeated(e,bars))}
 if(pattern==='two-beat')return hit(repeated([[0,36,66],[2,36,60],[1,38,48],[3,38,46],[0,51,58],[1,51,44],[2,51,52],[3,51,42]],bars));
 const e:Array<[number,number,number?]>=[[0,36,42],[2,36,40],[1,38,48],[3,38,48]];for(let x=0;x<8;x++)e.push([x*.5,42,x%2?75:85]);return hit(repeated(e,bars));
}
function percussionGuide(i:PreviewInstrument,pattern:string,bars=4):MusicTrack {
 if(['acoustic-drums','brush-drums','heavy-rock-drums'].includes(i.id))return drums(pattern,i.id,i.name,bars);
 if(i.category!=='percussion'){
  const kitId=BRUSH_PATTERNS.has(pattern)?'brush-drums':'acoustic-drums';
  return drums(pattern,kitId,kitId==='brush-drums'?'Brush Drums':'Acoustic Drum Kit',bars);
 }
 const guide=drums(pattern,'acoustic-drums','percussion guide',bars);
 const notes=guide.notes.map((event,index)=>{
  let pitch=event.pitch;
  if(i.id==='congas')pitch=event.pitch===36?64:event.pitch===38?63:event.pitch===42?62:63;
  else if(i.id==='bongos')pitch=event.pitch===36?61:60;
  else if(i.id==='timbales')pitch=event.pitch===36?66:event.pitch===38?65:event.pitch===42?56:65;
  else if(i.id==='soft-shaker')pitch=index%3===0?69:70;
  else if(i.id==='brazilian-percussion')pitch=event.pitch===36?36:event.pitch===38?38:event.pitch===42?(index%2?70:67):68;
  // Maracas samples in FluidR3 have abrupt velocity-layer and crest changes;
  // keep this deliberately soft shaker family within a narrow, restrained band.
  const velocity=i.id==='soft-shaker'?Math.min(32,Math.max(30,Math.round(event.velocity*.42))):Math.min(84,Math.max(24,event.velocity+(pitch===event.pitch?0:8)+(index%2?0:3)));
  return{...event,pitch,velocity};
 });
 return drum(i.name,i.id,notes,pattern,i.id);
}
function percussionTonePattern(id:string):string {
 return({'acoustic-drums':'acoustic-kit-demo','brush-drums':'brush-sweep-demo','heavy-rock-drums':'power-kit-demo',congas:'conga-tone-demo',bongos:'bongo-tone-demo',timbales:'timbales-tone-demo','soft-shaker':'shaker-tone-demo','brazilian-percussion':'brazilian-section-demo'} as Record<string,string>)[id]??'acoustic-kit-demo';
}
function percussionInstrumentTrack(i:PreviewInstrument):MusicTrack {
 const pattern=percussionTonePattern(i.id),n:MusicEvent[]=[];
 if(i.id==='acoustic-drums'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,36,.12,72),note(base+2,36,.12,64),note(base+1,38,.12,66),note(base+3,38,.12,68));for(let eighth=0;eighth<8;eighth++)n.push(note(base+eighth*.5,eighth%2?42:51,.09,eighth%2?38:55));}
 } else if(i.id==='brush-drums'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,40,.88,48),note(base+1,38,.12,40),note(base+2,40,.82,45),note(base+3,39,.12,42));}
 } else if(i.id==='heavy-rock-drums'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,36,.13,108),note(base+2,36,.13,94),note(base+1,38,.13,102),note(base+3,38,.13,106),note(base,49,.16,96));for(let eighth=0;eighth<8;eighth++)n.push(note(base+eighth*.5,eighth%2?42:46,.09,eighth%2?60:72));}
 } else if(i.id==='congas'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,64,.2,62),note(base+.75,62,.13,42),note(base+1.5,63,.19,58),note(base+2.5,64,.2,56),note(base+3.25,62,.13,40));}
 } else if(i.id==='bongos'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,60,.14,58),note(base+.75,61,.13,48),note(base+1.5,60,.14,54),note(base+2.5,61,.13,52),note(base+3.25,60,.14,48));}
 } else if(i.id==='timbales'){
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,66,.16,64),note(base+1,65,.16,56),note(base+2,56,.12,50),note(base+3,65,.16,60));}
 } else if(i.id==='soft-shaker'){
  for(let bar=0;bar<2;bar++)for(let eighth=0;eighth<8;eighth++)n.push(note(bar*4+eighth*.5,70,.12,eighth%2?22:30));
 } else {
  for(let bar=0;bar<2;bar++){const base=bar*4;n.push(note(base,36,.14,68),note(base+2,36,.14,62),note(base+1,38,.12,46),note(base+3,38,.12,50));for(let eighth=0;eighth<8;eighth++)n.push(note(base+eighth*.5,eighth%4===0?70:eighth%2?68:67,.1,eighth%4===0?45:38));}
 }
 return drum(i.name,i.id,n,pattern,i.id);
}

const FAMILY_BY_PATTERN:Record<string,string>={
 'instrument-tone':'instrument-tone','lyrical-phrase':'melodic-line','melodic-line':'melodic-line','single-note-response':'single-note-response','conversational-response':'conversational-response','spacious-comping':'keyboard-comping','guitar-comping':'guitar-comping','quartal-voicing':'quartal-harmony','gospel-blues-comping':'gospel-blues-comping','two-beat-comping':'two-beat-comping',
 'walking-bass':'walking-bass','two-feel':'two-feel','bass-foundation':'bass-foundation','bass-ostinato':'bass-ostinato','bass-melodic':'melodic-bass-line','modal-pedal':'modal-bass-pedal','modal-ostinato':'modal-bass-ostinato','modal-pulse':'modal-pulse',
 'jazz-waltz':'jazz-waltz','odd-meter':'asymmetrical-meter','contemporary-flex':'contemporary-flexible-eighths','swing-ride':'swing-timekeeping','swing-light':'swing-timekeeping','swing-restrained-ride':'swing-timekeeping','swing-clear-eighth':'swing-timekeeping','swing-open-modern':'swing-timekeeping','manouche-swing':'manouche-swing','hard-bop-ride':'hard-bop-ride','two-beat-early-swing':'early-swing-two-beat','open-acoustic-time':'open-acoustic-time','acoustic-hand-interplay':'acoustic-hand-interplay','power-rock-drive':'power-rock-backbeat','latin-hand-interlock':'latin-hand-interlock','latin-hand-clave':'latin-hand-clave','latin-percussion-accents':'latin-percussion-accents','boom-bap':'hip-hop-boom-bap','boom-bap-soft':'hip-hop-boom-bap','boom-bap-half-time':'hip-hop-half-time','neo-soul':'neo-soul-pocket','neo-soul-loose':'neo-soul-pocket','soft-straight':'straight-eighth','samba-soft':'samba','samba-drive':'samba','son-clave':'son-clave-groove','mambo-bell':'mambo-bell-groove','post-bop-flex':'flexible-post-bop',
 'free-time':'free-improvisation','noir-brushes':'noir-sparse-brushes','brush-noir':'noir-sparse-brushes','brush-sweep-demo':'brush-sweep-demo','brush-light-pulse':'brush-light-pulse','brush-subtle-time':'brush-restrained-pulse','third-stream':'third-stream-chamber-jazz','straight-16-funk':'funk-groove-family','broken-beat':'broken-beat','latin-clave':'latin-clave','tumbao':'tumbao','tumbao-clave':'tumbao-clave','montuno':'montuno','montuno-clave':'montuno-clave','la-pompe':'la-pompe','bossa':'bossa','soft-bossa':'bossa','samba':'samba','soul-shuffle':'soul-shuffle','two-beat':'two-beat','march':'march','funk':'funk-groove-family','funk-comping':'funk-comping','ballad':'ballad','open':'open','brushes':'brushes','fingerstyle':'fingerstyle','sustained-texture':'sustained-texture','straight-eighth':'straight-eighth',
 'sparse-bass-foundation':'sparse-bass-foundation','laid-back-bass-pocket':'laid-back-bass-pocket','spacious-guitar-comping':'spacious-guitar-comping','sparse-low-comping':'sparse-low-comping','syncopated-comping':'syncopated-comping','light-melodic-comping':'light-melodic-comping',
 'low-register-support':'low-register-support','low-brass-pulse':'low-brass-pulse','arranged-solo':'arranged-solo','ensemble-section-line':'ensemble-section-line','ensemble-counterline':'ensemble-counterline','tailgate-response':'tailgate-response','latin-improvisation':'latin-improvisation','blues-improvisation':'blues-improvisation','clave-improvisation':'clave-improvisation'
};
export function semanticFamilyForPattern(pattern:string):string{return FAMILY_BY_PATTERN[pattern]??pattern}
const RULES_BY_PATTERN:Record<string,string[]>={
 'walking-bass':['walking-bass'],'bass-foundation':['bass-foundation'],'sparse-bass-foundation':['sparse-bass-foundation'],'laid-back-bass-pocket':['laid-back-bass-pocket'],'bass-ostinato':['bass-ostinato'],'tumbao':['tumbao'],'tumbao-clave':['tumbao','clave-2-3'],'montuno':['montuno'],'montuno-clave':['montuno','clave-2-3'],'clave':['clave-2-3'],'latin-clave':['clave-2-3'],'la-pompe':['la-pompe'],'conversational-response':['conversational-response'],
 'two-feel':['two-feel'],'gospel-blues-comping':['gospel-blues-comping'],'two-beat-comping':['two-beat-comping'],'modal-cluster-gestures':['modal-cluster-gestures'],'funk-comping':['funk-comping'],'single-note-response':['single-note-response'],
 'swing-ride':['swing-ride'],'swing-light':['swing-light'],'swing-restrained-ride':['swing-restrained-ride'],'swing-clear-eighth':['swing-clear-eighth'],'hard-bop-ride':['hard-bop-ride'],'two-beat-early-swing':['two-beat-early-swing'],'brush-sweep-demo':['brush-sweep'],'brush-light-pulse':['brush-light-pulse'],'brush-subtle-time':['brush-subtle-time'],'noir-brushes':['noir-brushes'],'power-rock-drive':['power-rock-drive'],'latin-hand-interlock':['latin-hand-interlock'],'latin-hand-clave':['latin-hand-clave'],'latin-percussion-accents':['latin-percussion-accents'],'jazz-waltz':['jazz-waltz'],'odd-meter':['odd-meter'],'boom-bap':['boom-bap'],'boom-bap-half-time':['boom-bap-half-time'],'boom-bap-soft':['boom-bap-soft'],'straight-16-funk':['straight-16-funk'],'neo-soul':['neo-soul'],'neo-soul-loose':['neo-soul-loose'],'broken-beat':['broken-beat'],'soft-bossa':['soft-bossa'],'samba-soft':['samba-soft'],'samba-drive':['samba-drive'],'son-clave':['son-clave'],'mambo-bell':['mambo-bell'],'post-bop-flex':['post-bop-flex'],'swing-open-modern':['swing-open-modern'],'soft-straight':['soft-straight'],'manouche-swing':['manouche-swing'],
 'modal-pedal':['modal-pedal'],'modal-ostinato':['modal-ostinato'],'quartal-voicing':['quartal-voicing'],'free-time':['free-time'],'third-stream':['third-stream'],'contemporary-flex':['contemporary-flex'],'clave-improvisation':['clave-improvisation'],'arranged-solo':['arranged-solo'],'ensemble-section-line':['ensemble-section-line'],'ensemble-counterline':['ensemble-counterline'],'tailgate-response':['tailgate-response'],'low-register-support':['low-register-support'],'low-brass-pulse':['low-brass-pulse'],'sparse-low-comping':['sparse-low-comping'],'syncopated-comping':['syncopated-comping'],'light-melodic-comping':['light-melodic-comping'],'spacious-guitar-comping':['spacious-guitar-comping']
};
const rulesForPattern=(pattern:string):string[]=>[...(RULES_BY_PATTERN[pattern]??[])];

function patternFor(text:string,cat:string):string {
 const s=text.toLowerCase();
 if(/fragmented chromatic|modal cluster|cluster gestures/.test(s))return'modal-cluster-gestures';
 if(/free.?time|free and variable time|free, spacious phrasing|no fixed backbeat|near.?free|free arco|no fixed chord function/.test(s))return'free-time';
 if(/jazz.?waltz|waltz|three beats|three-beat|in three/.test(s))return'jazz-waltz';
 if(/noir|very slow.*brush|sparse.*brush|brush.*negative space|occasional soft brush time/.test(s))return'noir-brushes';
 if(/active upper counterline/.test(s))return'ensemble-counterline';
 if(/third stream|chamber|composed chamber|contrapuntal/.test(s))return'third-stream';
 if(/sustained harmonic|sustained texture|sustained background|sustained amplified notes|sustained harmony/.test(s))return'sustained-texture';
 if(/arranged big.?band|featured solo/.test(s))return'arranged-solo';
 if(/section line|section stabs|section answers|section voicings|arranged ensemble punches/.test(s))return'ensemble-section-line';
 if(/tailgate.?style|lower tailgate/.test(s))return'tailgate-response';
 if(cat==='brass'&&/prominent low.?brass pulse/.test(s))return'low-brass-pulse';
 if(/low.?register support|rounded low register support/.test(s))return'low-register-support';
 if(/2.?3 clave/.test(s)&&cat!=='percussion'&&cat!=='bass'&&!/tumbao|montuno/.test(s))return'clave-improvisation';
 if(/latin.?jazz|latin phrasing/.test(s)&&cat!=='percussion'&&cat!=='bass')return'latin-improvisation';
 if(/blues.?inflected|blues infused/.test(s)&&cat!=='percussion'&&cat!=='bass')return'blues-improvisation';
 if(/quartal/.test(s))return'quartal-voicing';
 if(/pedal/.test(s))return'modal-pedal';
 if(/modal.{0,50}ostinato|ostinato.{0,50}modal/.test(s))return'modal-ostinato';
 if(cat==='percussion'){
  if(/soft dusty hip.?hop|restrained kick, snare and hi.?hats/.test(s))return'boom-bap-soft';
  if(/samba/.test(s)&&/driving|crisp|tamborim|pandeiro/.test(s))return'samba-drive';
  if(/samba/.test(s)&&/light|soft|restrained/.test(s))return'samba-soft';
  if(/bossa/.test(s)&&/barely noticeable|soft|restrained|subtle/.test(s))return'soft-bossa';
  if(/forceful backbeat|heavy fills/.test(s))return'power-rock-drive';
  if(/interlocking|clave-informed|2.?3 clave/.test(s))return/clave/.test(s)?'latin-hand-clave':'latin-hand-interlock';
  if(/syncopated latin accents|timbales accents/.test(s))return'latin-percussion-accents';
  if(/brush/.test(s)&&/subtle timekeeping|soft brush strokes/.test(s))return'brush-subtle-time';
  if(/brush/.test(s))return'brush-light-pulse';
  if(/hard.?bop|punchy.*ride|strong.*ride accents/.test(s))return'hard-bop-ride';
  if(/clear swing eighth/.test(s))return'swing-clear-eighth';
  if(/restrained ride.?cymbal timekeeping/.test(s))return'swing-restrained-ride';
  if(/light, controlled swing|light controlled swing/.test(s))return'swing-light';
  if(/buoyant two.?beat|two.?beat.*early.?swing/.test(s))return'two-beat-early-swing';
  if(/open acoustic time|tom color/.test(s))return'open-acoustic-time';
  if(/hand.?percussion interplay/.test(s))return'acoustic-hand-interplay';
 }
 if(cat==='keyboard'&&/low-register.*minor.*long spaces|long spaces.*sparse changes/.test(s))return'sparse-low-comping';
 if(cat==='keyboard'&&/crisp syncopated comping/.test(s))return'syncopated-comping';
 if(cat==='keyboard'&&/melodic comping/.test(s))return'light-melodic-comping';
 if(cat==='guitar'&&/fingerstyle/.test(s))return'fingerstyle';
 if(cat==='guitar'&&/soft, spacious chordal support/.test(s))return'spacious-guitar-comping';
 if(cat==='bass'&&/low-register.*long spaces|long spaces.*sparse changes/.test(s))return'sparse-bass-foundation';
 if(cat==='bass'&&/behind the beat|sitting slightly behind/.test(s))return'laid-back-bass-pocket';
 if(cat==='bass'&&/restrained foundation|steady groove/.test(s))return'bass-foundation';
 if(/jazz.?hop|hip.?hop|boom.?bap/.test(s))return'boom-bap';
 if(/neo.?soul|16th.note pocket|loose subdivisions.*ghost notes/.test(s))return'neo-soul';
 if(/contemporary|flexible straight.?eighth/.test(s)&&/asymmetrical|flexible|straight.?eighth/.test(s))return'contemporary-flex';
 if(cat==='bass'&&/two.?feel|two.?beat/.test(s))return'two-feel';
 if(cat==='bass'&&/walking/.test(s))return'walking-bass';
 if(cat==='bass'&&/latin groove|latin pulse/.test(s))return'tumbao';
 if(/tumbao/.test(s)&&/clave/.test(s))return'tumbao-clave';
 if(/montuno/.test(s)&&/clave/.test(s))return'montuno-clave';
 if(/tumbao/.test(s))return'tumbao';
 if(/montuno/.test(s))return'montuno';
 if(/la pompe|pompe rhythm/.test(s))return'la-pompe';
 if(cat==='keyboard'&&/gospel|blues/.test(s))return'gospel-blues-comping';
 if(cat==='keyboard'&&/two.?beat/.test(s))return'two-beat-comping';
 if(cat==='keyboard'&&/modal|sustained harmonic|sustained texture/.test(s))return'sustained-texture';
 if(cat==='guitar'&&/funk/.test(s))return'funk-comping';
 if(cat==='guitar'&&/single.?note|response|answer|reply/.test(s))return'single-note-response';
 if(/swing|ride cymbal|ride-cymbal|bebop/.test(s))return'swing-ride';
 if(/walking|four-beat walking/.test(s))return'walking-bass';
 if(/odd.?meter|asymmetrical/.test(s))return'odd-meter';
 if(/march/.test(s))return'march';
 if(/bossa/.test(s))return'bossa';
 if(/samba/.test(s))return'samba';
 if(/shuffle/.test(s))return'soul-shuffle';
 if(/broken.?beat/.test(s))return'broken-beat';
 if(/straight.?16|16th.?note|funk.?pocket|funk-rock/.test(s))return'straight-16-funk';
 if(/funk/.test(s))return'funk';
 if(/two-beat|two beat/.test(s))return'two-beat';
 if(/ballad/.test(s))return'ballad';
 if(/open|unhurried|floating/.test(s))return'open';
 if(/fingerstyle/.test(s))return'fingerstyle';
 if(/response|reply|answer|conversational/.test(s))return cat==='guitar'?'single-note-response':'conversational-response';
 if(/comping|chord|voicing|harmony/.test(s))return cat==='guitar'?'guitar-comping':'spacious-comping';
 if(cat==='bass'&&/melodic|lead/.test(s))return'bass-melodic';
 if(/melodic|lead|solo|improvisation|phrase/.test(s))return'lyrical-phrase';
 if(cat==='bass')return/restrained|foundation|simple/.test(s)?'bass-foundation':'bass-ostinato';
 if(cat==='percussion')return/brush/.test(s)?'brushes':'straight-eighth';
 if(cat==='keyboard')return'spacious-comping';
 if(cat==='guitar')return'lyrical-phrase';
 return'lyrical-phrase';
}

function freeTimeTrack(i:PreviewInstrument,source:string):MusicTrack {
 const beats=[.25,1.7,4.35,6.1,9.45,11.2,14.15,15.05];
 if(i.category==='bass')return tr(i.name,i.id,'bass',beats.map((beat,index)=>note(beat,[36,43,40,47,38,45,41,36][index]!,[1.05,.55,1.4,.7,1.1,.6,.75,.65][index]!,58+index%3*3)));
 if(i.category==='percussion')return drums('free-time',i.id,i.name);
 const base=i.category==='brass'?64:i.category==='woodwind'?62:60,scale=[0,2,5,7,11,12,15,17];
 return tr(i.name,i.id,'lead',beats.map((beat,index)=>note(beat,base+scale[(index+hash(source+i.id))%scale.length]!+index%3*12,[.48,.9,.36,1.1,.42,.7,.55,.38][index]!,60+index%4*3)));
}
function freeTimeBass(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'bass',[note(.4,36,1.1,55),note(2.05,43,.62,52),note(4.7,40,1.2,58),note(6.3,47,.7,50),note(9.6,38,1.05,56),note(11.45,45,.55,51),note(14.2,41,.78,54)])}
function freeTimeHarmony(i:PreviewInstrument):MusicTrack {const events:[[number,number[]],[number,number[]],[number,number[]],[number,number[]],[number,number[]]]=[[.15,[60,65,70]],[2.85,[62,67,72]],[6.4,[59,64,69]],[10.55,[61,66,71]],[13.35,[60,65,70]]];return tr(i.name,i.id,'harmony',events.flatMap(([beat,pitches],index)=>chord(beat,pitches,[1.45,.85,1.7,.95,1.25][index]!,48)))}
function sparseNoirBass(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'bass',[note(.2,36,2.4,48),note(4.8,40,2.1,45),note(9.1,38,2.8,48),note(13.5,36,1.8,44)])}
function bassFoundation(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'bass',[0,4,8,12].map((beat,index)=>note(beat,[36,41,38,43][index]!,1.55,56)))}
function sparseBassFoundation(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'bass',[note(.2,36,2.25,50),note(4.65,40,1.8,47),note(9.1,38,2.35,49),note(13.6,36,1.45,45)])}
function laidBackBassPocket(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;n.push(note(base+.12,[36,38,35,40][bar]!,1.05,60),note(base+1.75,[43,45,40,43][bar]!,0.62,50),note(base+3.05,[38,40,36,38][bar]!,0.7,53))}return tr(i.name,i.id,'bass',n)}
function boomBapBass(i:PreviewInstrument,halfTime=false):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;n.push(note(base,36,.76,halfTime?62:68),note(base+(halfTime?2.5:2),43,.46,halfTime?52:59),note(base+(halfTime?3.25:3.5),38,.32,halfTime?48:54))}return tr(i.name,i.id,'bass',n)}
function funkBass(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;for(const [at,pitch,duration,velocity] of [[0,36,.4,68],[1.25,43,.22,51],[1.75,38,.3,57],[2.5,36,.35,63],[3.25,41,.2,50]] as const)n.push(note(base+at,pitch,duration,velocity))}return tr(i.name,i.id,'bass',n)}
function brokenBeatBass(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;for(const [at,pitch] of [[0,36],[1.75,43],[2.75,38],[3.5,40]] as const)n.push(note(base+at,pitch,.38,bar%2?54:62))}return tr(i.name,i.id,'bass',n)}
function sambaBass(i:PreviewInstrument,driving=false):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4,events=driving?[[0,36],[.75,43],[1.5,38],[2.25,36],[3,43],[3.5,40]] as const:[[0,36],[1.5,43],[2.5,38]] as const;for(const [at,pitch] of events)n.push(note(base+at,pitch,driving?.34:.6,driving?63:54))}return tr(i.name,i.id,'bass',n)}
function shuffledBass(i:PreviewInstrument):MusicTrack {const n:MusicEvent[]=[];for(let bar=0;bar<4;bar++){const base=bar*4;n.push(note(base,36,.72,63),note(base+1.33,43,.42,52),note(base+2,36,.6,58),note(base+3.33,40,.4,54))}return tr(i.name,i.id,'bass',n)}
function bassLineForPattern(i:PreviewInstrument,p:string):MusicTrack {
 if(p==='bass-foundation')return bassFoundation(i);
 if(p==='sparse-bass-foundation')return sparseBassFoundation(i);
 if(p==='laid-back-bass-pocket')return laidBackBassPocket(i);
 if(p==='boom-bap'||p==='boom-bap-soft')return boomBapBass(i);
 if(p==='boom-bap-half-time')return boomBapBass(i,true);
 if(p==='straight-16-funk'||p==='funk')return funkBass(i);
 if(p==='broken-beat')return brokenBeatBass(i);
 if(p==='samba'||p==='samba-soft')return sambaBass(i);
 if(p==='samba-drive')return sambaBass(i,true);
 if(p==='soul-shuffle')return shuffledBass(i);
 if(p==='bossa'||p==='soft-bossa')return tumbao(i);
 if(p==='neo-soul-loose')return laidBackBassPocket(i);
 return bassOstinato(i);
}
function contemporaryBass(i:PreviewInstrument):MusicTrack {return tr(i.name,i.id,'bass',[note(0,40,.8,65),note(1.5,43,.65,58),note(2.75,38,.5,53),note(4,43,.75,64),note(6.5,36,.6,55),note(7.5,40,.4,52),note(8,45,.8,64),note(10.5,40,.55,55),note(11.25,43,.55,52),note(12,38,.75,62),note(14.5,45,.5,54),note(15.5,40,.35,50)])}
function neoSoulBass(i:PreviewInstrument):MusicTrack {const at:[[number,number],[number,number],[number,number],[number,number]]=[[0,36],[1.75,43],[2.5,38],[3.75,40]];const notes:MusicEvent[]=[];for(let bar=0;bar<4;bar++)for(const [offset,pitch] of at)notes.push(note(bar*4+offset,pitch,.22,bar%2?57:63));return tr(i.name,i.id,'bass',notes)}
function chamberCounterline(i:PreviewInstrument,source:string):MusicTrack {const beats=[0,1.25,3.5,4.75,7.2,8.05,11.45,13.1,15];const pitches=[67,72,71,76,74,69,77,72,67];const notes=beats.map((beat,index)=>note(beat,pitches[(index+hash(source))%pitches.length]!+index%2,[.85,.42,.6,1.15,.38,.72,.5,1.05,.4][index]!,55+index%4*3));return tr(i.name,i.id,'countermelody',notes)}
function pianoPreview():PreviewInstrument{return{id:'piano',name:'Piano',category:'keyboard',behaviours:[]}}
function violinPreview():PreviewInstrument{return{id:'violin',name:'Violin',category:'strings',behaviours:[]}}
function trumpetPreview():PreviewInstrument{return{id:'trumpet',name:'Trumpet',category:'brass',behaviours:[]}}
function tracksFor(i:PreviewInstrument,p:string,source:string):MusicTrack[] {
 if(p==='sustained-texture')return[sustainedLine(i)];
 if(p==='low-register-support')return[lowRegisterSupport(i)];
 if(p==='low-brass-pulse')return[lowBrassPulse(i)];
 if(p==='arranged-solo')return[melody(i,source),arrangedStabs(pianoPreview())];
 if(p==='ensemble-section-line')return[ensembleSectionLine(i,source),arrangedStabs(pianoPreview())];
 if(p==='ensemble-counterline')return[chamberCounterline(i,source),melody(trumpetPreview(),source)];
 if(p==='tailgate-response')return[tailgateResponse(i,source)];
 if(p==='clave-improvisation')return[latinImprovisation(i,source),clave('acoustic-drums','2-3 clave support')];
 if(p==='latin-improvisation')return[latinImprovisation(i,source)];
 if(p==='blues-improvisation')return[bluesImprovisation(i,source)];
 if(p==='walking-bass')return[bassWalk(i)];
 if(p==='two-feel')return[bassTwoFeel(i)];
 if(p==='bass-melodic')return[tr(i.name,i.id,'bass',melody(i,source).notes.map(n=>({...n,pitch:clamp(n.pitch-18,30,52),duration:.48})))];
 if(p==='bass-foundation')return[bassFoundation(i)];
 if(p==='sparse-bass-foundation')return[sparseBassFoundation(i)];
 if(p==='laid-back-bass-pocket')return[laidBackBassPocket(i)];
 if(p==='modal-pedal')return[pedal(i)];
 if(p==='modal-ostinato'||p==='bass-ostinato')return[bassOstinato(i)];
 if(p==='tumbao')return[tumbao(i)];
 if(p==='tumbao-clave')return[tumbao(i),clave('acoustic-drums','2-3 clave support',i.category==='percussion'?i.id:'acoustic-drums')];
 if(p==='montuno')return[montuno(i)];
 if(p==='montuno-clave')return[montuno(i),clave('acoustic-drums','2-3 clave support',i.category==='percussion'?i.id:'acoustic-drums')];
 if(p==='quartal-voicing')return[quartal(i)];
 if(p==='bossa'&&i.category==='guitar')return[bossaComp(i)];
 if(p==='gospel-blues-comping')return[gospelBluesComp(i)];
 if(p==='two-beat-comping')return[twoBeatComp(i)];
 if(p==='modal-cluster-gestures')return[modalCluster(i)];
 if(p==='funk-comping')return[funkGuitarComp(i)];
 if(p==='single-note-response')return[singleNoteResponse(i,source)];
 if(p==='conversational-response')return[conversationalResponse(i,source)];
 if(p==='la-pompe')return[pompe(i)];
 if(p==='free-time')return[freeTimeTrack(i,source)];
 if(p==='noir-brushes')return[percussionGuide(i,p),sparseNoirBass({id:'upright-bass',name:'Upright Bass',category:'bass',behaviours:[]})];
 if(p==='third-stream'){
  const piano=pianoPreview(),violin=violinPreview();
  if(i.id==='piano')return[melody(i,source),comp(i),chamberCounterline(violin,source)];
  if(i.id==='violin'||i.id==='clarinet')return[chamberCounterline(i,source),comp(piano)];
  return[melody(i,source),comp(piano),chamberCounterline(violin,source)];
 }
 if(p==='jazz-waltz'||p==='odd-meter'){const stride=p==='jazz-waltz'?3:3.5;if(i.category==='percussion')return[percussionGuide(i,p,4)];if(i.category==='bass')return[bassMeter(i,stride)];if(i.category==='keyboard'||i.category==='guitar')return[harmonyMeter(i,stride)];return[melodyMeter(i,source,stride)]}
 if(['swing-ride','swing-light','swing-restrained-ride','swing-clear-eighth','swing-open-modern','hard-bop-ride','two-beat-early-swing','open-acoustic-time','acoustic-hand-interplay','power-rock-drive','latin-hand-interlock','latin-hand-clave','latin-percussion-accents','brush-sweep-demo','brush-light-pulse','brush-subtle-time','brush-noir','boom-bap','boom-bap-soft','boom-bap-half-time','straight-16-funk','neo-soul','neo-soul-loose','contemporary-flex','broken-beat','post-bop-flex','bossa','soft-bossa','samba','samba-soft','samba-drive','son-clave','mambo-bell','soul-shuffle','two-beat','latin-clave','soft-straight','straight-eighth','brushes','march','funk','ballad','open','modal-pulse'].includes(p)){
  if(i.category==='percussion')return[percussionGuide(i,p)];
  const bassInstrument=i.id==='upright-bass'?i:{...i,id:'electric-bass',name:'Electric Bass'};
  const lead=i.category==='bass'?(p==='neo-soul'?neoSoulBass(bassInstrument):p==='contemporary-flex'?contemporaryBass(i):bassLineForPattern(i,p)):melody(i,source);
  return[lead,drums(p==='latin-clave'?'clave':p,'acoustic-drums','reference rhythm')];
 }
 if(p==='guitar-comping')return[comp(i,true)];
 if(p==='spacious-guitar-comping'||p==='spacious-comping')return[spaciousComp(i)];
 if(p==='sparse-low-comping')return[spaciousComp(i,true)];
 if(p==='syncopated-comping')return[syncopatedComp(i)];
 if(p==='light-melodic-comping')return[lightMelodicComp(i)];
 if(p==='fingerstyle')return[fingerstyleGuitar(i)];
 if(p==='sustained-texture')return[tr(i.name,i.id,'texture',[note(0,60,7.7,52),note(8,65,7.7,50)])];
 return[melody(i,source)];
}
export function makeInstrumentSpec(i:PreviewInstrument):MusicSpec {
 const p=i.category==='percussion'?percussionTonePattern(i.id):i.category==='bass'?'bass-foundation':'lyrical-phrase';
 const bassNotes=Array.from({length:8},(_,beat)=>note(beat,beat%4===0?40:beat%4===2?43:36,.82,68));
 const textureNotes=[note(0,60,3.8,50),note(4,65,3.8,48)];
 const tracks=i.category==='percussion'?[percussionInstrumentTrack(i)]:i.category==='bass'?[tr(i.name,i.id,'bass',bassNotes)]:i.category==='texture'?[tr(i.name,i.id,'texture',textureNotes)]:[neutralInstrumentTone(i)];
 return{id:`instrument-${i.id}`,category:'instrument',source:p,semanticFamily:'instrument-tone',bpm:88,meter:[4,4],bars:2,tracks,rules:['valid-meter','instrument-program','family:instrument-tone',...(i.category==='bass'?['bass-register']:[]),...(i.category==='percussion'?['percussion-instrument-tone']:[])]};
}
export function makeBehaviourSpec(i:PreviewInstrument,behaviour:string,index=0):MusicSpec {
 const p=patternFor(behaviour,i.category),family=semanticFamilyForPattern(p),tracks=tracksFor(i,p,behaviour),meter:[number,number]=p==='jazz-waltz'?[3,4]:p==='odd-meter'?[7,8]:[4,4];
 const rules=['valid-meter','instrument-program',`family:${family}`,...rulesForPattern(p).filter(rule=>!(p==='jazz-waltz'&&rule==='jazz-waltz')&&!(p==='jazz-waltz'&&rule==='jazz-waltz-bass'))];
 if(p==='jazz-waltz')rules.push(i.category==='percussion'?'jazz-waltz':i.category==='bass'?'jazz-waltz-bass':'jazz-waltz-part');
 const bpm=p==='noir-brushes'?58:p==='free-time'?76:p==='neo-soul'?76:p==='contemporary-flex'?102:p==='third-stream'?88:112;
 return{id:`behaviour-${i.id}-${hash(behaviour).toString(16)}-${index}`,category:'behaviour',source:p,semanticFamily:family,bpm,meter,bars:4,tracks,rules};
}
// Groove IDs are intentionally mapped one by one so broad words such as
// "swing", "free", or "straight" cannot silently collapse distinct concepts.
// Reuse is retained only within the same audible family (for example light
// swing feels and the related straight funk-rock variants).
const GROOVE_PATTERN_OVERRIDES:Record<string,string>={
 'relaxed-swing':'swing-light','soft-straight':'soft-straight','open':'open',
 'slow-bossa':'soft-bossa','soft-bossa':'soft-bossa','bossa':'bossa','samba-soft':'samba-soft',
 'light-swing':'swing-light','medium-swing':'swing-clear-eighth','soft-swing':'swing-light','walking-swing':'swing-restrained-ride',
 'slow-ballad':'ballad','free':'free-time','modal-pulse':'modal-pulse','waltz':'jazz-waltz',
 'brisk-swing':'swing-clear-eighth','up-tempo':'swing-clear-eighth','brisk-straight':'straight-eighth','smooth-straight':'straight-eighth',
 'light-funk':'funk','latin':'latin-hand-clave','samba':'samba','afro-cuban':'latin-hand-clave','son':'son-clave','mambo':'mambo-bell',
 'manouche-swing':'manouche-swing','la-pompe':'la-pompe','soul-groove':'soul-shuffle','shuffle':'soul-shuffle',
 'hard-swing':'hard-bop-ride','bebop-swing':'swing-clear-eighth','post-bop':'post-bop-flex','odd-meter':'odd-meter',
 'funk':'straight-16-funk','broken-beat':'broken-beat','fusion':'straight-16-funk','downtempo':'broken-beat','two-beat':'two-beat-early-swing','march':'march','swing':'swing-clear-eighth',
 'lofi-chill':'boom-bap-soft','lofi-straight':'soft-straight','acid-funk-soul':'straight-16-funk','acid-half-time':'funk',
 'big-band-swing':'hard-bop-ride','big-band-medium':'swing-clear-eighth','samba-drive':'samba-drive','samba-accented':'samba',
 'jazz-waltz-three':'jazz-waltz','soft-jazz-waltz':'jazz-waltz','cafe-piano-swing':'swing-light','cafe-piano-straight':'soft-straight',
 'contemporary-flex':'contemporary-flex','contemporary-light-swing':'swing-open-modern','free-time':'free-time','open-free':'free-time',
 'jazz-hop-boombap':'boom-bap','jazz-hop-half-time':'boom-bap-half-time','neo-soul-pocket':'neo-soul','neo-soul-loose':'neo-soul-loose',
 'noir-slow-brush':'noir-brushes','noir-open':'noir-brushes','third-stream-pulse':'third-stream','third-stream-light':'third-stream'
};
function groovePattern(g:PreviewGroove):string {
 const explicit=GROOVE_PATTERN_OVERRIDES[g.id];if(explicit)return explicit;
 throw new Error(`Groove ${g.id} requires an explicit audio pattern mapping`);
}
function grooveBass(p:string):MusicTrack {
 const upright:PreviewInstrument={id:'upright-bass',name:'Upright Bass',category:'bass',behaviours:[]};
 const electric:PreviewInstrument={id:'electric-bass',name:'Electric Bass',category:'bass',behaviours:[]};
 if(p==='jazz-waltz')return bassMeter(upright,3);
 if(p==='odd-meter')return bassMeter(upright,3.5);
 if(p==='free-time')return freeTimeBass(upright);
 if(p==='noir-brushes')return sparseNoirBass(upright);
 if(p==='contemporary-flex')return contemporaryBass(upright);
 if(p==='neo-soul')return neoSoulBass(electric);
 if(p==='neo-soul-loose'||p==='boom-bap-soft')return laidBackBassPocket(electric);
 if(p==='boom-bap'||p==='boom-bap-half-time')return boomBapBass(electric,p==='boom-bap-half-time');
 if(p==='broken-beat')return brokenBeatBass(electric);
 if(p==='third-stream')return tr(upright.name,upright.id,'bass',[note(0,40,.9,52),note(2,43,.7,48),note(4,40,.9,51),note(6,45,.7,47),note(8,38,.9,50),note(10,43,.7,46),note(12,40,.9,50),note(14,45,.7,46)]);
 if(p==='modal-pulse'||p==='modal-ostinato')return bassOstinato(upright);
 if(p==='two-beat-early-swing')return bassTwoFeel(upright);
 if(p==='swing-light')return bassTwoFeel(upright);
 if(p==='swing-open-modern')return contemporaryBass(upright);
 if(['swing-restrained-ride','swing-clear-eighth','hard-bop-ride','manouche-swing','post-bop-flex'].includes(p))return bassWalk(upright);
 if(['tumbao','tumbao-clave','bossa','soft-bossa','latin-clave','son-clave','mambo-bell'].includes(p))return tumbao(upright);
 if(p==='samba'||p==='samba-soft')return sambaBass(upright);
 if(p==='samba-drive')return sambaBass(upright,true);
 if(p==='straight-16-funk'||p==='funk')return funkBass(electric);
 if(p==='soul-shuffle')return shuffledBass(upright);
 if(p==='soft-straight'||p==='ballad'||p==='open')return bassFoundation(upright);
 if(p==='modal-pedal')return pedal(upright);
 return bassWalk(upright);
}
function grooveHarmony(p:string):MusicTrack {
 const guitar=['bossa','soft-bossa','samba','samba-soft','samba-drive','la-pompe','latin-clave','son-clave','mambo-bell','manouche-swing'].includes(p),i:PreviewInstrument=guitar?{id:p==='manouche-swing'?'manouche-guitar':'nylon-guitar',name:p==='manouche-swing'?'Manouche Guitar':'Nylon Guitar',category:'guitar',behaviours:[]}:{id:'piano',name:'Piano',category:'keyboard',behaviours:[]};
 if(p==='free-time')return freeTimeHarmony(i);
 if(p==='noir-brushes')return tr(i.name,i.id,'harmony',[note(.5,60,3.1,42),note(5.25,63,2.7,40),note(10.1,58,3.4,38),note(14.4,62,1.1,36)]);
 if(p==='jazz-waltz')return harmonyMeter(i,3);
 if(p==='odd-meter')return harmonyMeter(i,3.5);
 if(p==='montuno'||p==='montuno-clave')return montuno(i);
 if(p==='quartal-voicing'||p==='modal-pulse')return quartal(i);
 if(p==='la-pompe')return pompe(i);
 if(p==='swing-light')return spaciousComp(i);
 if(p==='swing-open-modern'||p==='post-bop-flex')return quartal(i);
 if(p==='hard-bop-ride')return arrangedStabs(i,'harmony');
 if(p==='bossa'||p==='soft-bossa')return bossaComp(i);
 if(p==='manouche-swing')return pompe(i);
 if(p==='samba-soft')return spaciousComp(i);
 if(p==='samba-drive')return bossaComp(i);
 if(p==='samba'||p==='son-clave'||p==='mambo-bell')return comp(i,true);
 if(p==='post-bop-flex')return quartal(i);
 return comp(i,guitar);
}
export function makeGrooveSpec(g:PreviewGroove):MusicSpec {
 const p=groovePattern(g),family=semanticFamilyForPattern(p),meter:[number,number]=p==='jazz-waltz'?[3,4]:p==='odd-meter'?[7,8]:[4,4];
 const rhythmId=p==='noir-brushes'?'brush-drums':'acoustic-drums',tracks:MusicTrack[]=[drums(p,rhythmId,`${g.label} drums`,4,meter),grooveBass(p),grooveHarmony(p)];
 if(p==='third-stream')tracks.push(chamberCounterline(violinPreview(),g.id));
 const specificRules=rulesForPattern(p);
 const rules=['valid-meter','groove-ensemble',`family:${family}`,...specificRules];
 const bpm=p==='bossa'||p==='soft-bossa'?104:p==='samba'?116:p==='samba-drive'?124:p==='samba-soft'?92:p==='jazz-waltz'?118:p==='odd-meter'?108:p==='neo-soul'||p==='neo-soul-loose'?76:p==='noir-brushes'?54:p==='free-time'?76:p==='third-stream'?88:p==='contemporary-flex'?102:p==='boom-bap'||p==='boom-bap-soft'?86:p==='boom-bap-half-time'?74:p==='mambo-bell'?126:p==='manouche-swing'?156:p==='slow-ballad'?58:112;
 return{id:`groove-${g.id}`,category:'groove',source:p,semanticFamily:family,bpm,meter,bars:4,tracks,rules};
}

const starts=(t:MusicTrack):number[]=>t.notes.map(n=>n.beat).sort((a,b)=>a-b);
const mono=(t:MusicTrack):boolean=>{const e=t.notes.flatMap(n=>[[n.beat,1] as const,[n.beat+n.duration,-1] as const]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let active=0;for(const [,d] of e){active+=d;if(active>1)return false}return true};
function drumPitches(t:MusicTrack):[number,number,number]{if(t.instrumentId==='congas')return[64,63,62];if(t.instrumentId==='bongos')return[61,60,60];if(t.instrumentId==='timbales')return[66,65,56];if(t.instrumentId==='soft-shaker')return[69,70,69];if(t.instrumentId==='brazilian-percussion')return[36,38,70];return[36,38,42]}
function validateStructuralMusicSpec(s:MusicSpec):RuleResult[]{const r:RuleResult[]=[],add=(rule:string,ok:boolean,detail:string)=>r.push({rule,ok,detail});add('valid-meter',s.meter[0]>0&&s.meter[1]>0&&s.bars>0,`${s.meter.join('/')} × ${s.bars} bars`);add('instrument-program',s.tracks.every(t=>t.program>=0&&t.program<=127&&t.notes.every(n=>n.pitch>=0&&n.pitch<=127)),'GM program and MIDI note range');const songEnd=s.bars*s.meter[0]*4/s.meter[1];add('events-within-bars',s.tracks.every(t=>t.notes.every(n=>n.beat>=0&&n.beat+n.duration<=songEnd+1e-6)),`events end within ${songEnd} quarter-note beats`);const percussionTracks=s.tracks.filter(track=>track.role==='rhythm');add('percussion-preset-metadata',percussionTracks.every(track=>Boolean(track.percussionMapping)&&track.percussionMapping!.soundFontBank===GM_DRUM_BANK&&track.percussionMapping!.soundFontProgram===track.program),'each percussion role selects an explicit FluidR3 drum bank/preset');
 if(s.rules.includes('walking-bass')){const t=s.tracks.find(x=>x.role==='bass')!,a=starts(t);add('walking-bass-meter',s.meter[0]===4&&s.meter[1]===4,'4/4 meter');add('walking-bass-register',t.notes.every(n=>n.pitch>=28&&n.pitch<=48),'E1–C3 register');add('walking-bass-monophonic',mono(t),'no overlapping notes');add('walking-bass-quarter-grid',JSON.stringify(a)===JSON.stringify(Array.from({length:16},(_,n)=>n)),'quarter note onsets across four bars');add('walking-bass-root-target',t.notes.filter(n=>n.beat%4===0).length===4,'one root target per bar')}
 if(s.rules.includes('two-feel')){const t=s.tracks.find(track=>track.role==='bass'),beats=t?starts(t):[];add('two-feel-bass-pulse',beats.length===8&&beats.every(beat=>beat%4===0||beat%4===2),'two bass notes per bar on beats one and three')}
 if(s.rules.includes('gospel-blues-comping')){const t=s.tracks.find(track=>track.role==='harmony'),groups=new Map<number,number>();for(const event of t?.notes??[])groups.set(event.beat,(groups.get(event.beat)??0)+1);add('gospel-blues-chord-shapes',[...groups.values()].filter(count=>count>=4).length>=12,'dominant seventh chord punches on a syncopated comping grid')}
 if(s.rules.includes('two-beat-comping')){const t=s.tracks.find(track=>track.role==='harmony'),groups=new Map<number,number>();for(const event of t?.notes??[])groups.set(event.beat,(groups.get(event.beat)??0)+1);add('two-beat-keyboard-comping',[...groups.values()].length===8&&[...groups.keys()].every(beat=>beat%4===0||beat%4===2),'sparse chord attacks on beats one and three')}
 if(s.rules.includes('modal-cluster-gestures')){const t=s.tracks.find(track=>track.role==='harmony'),groups=new Map<number,number>();for(const event of t?.notes??[])groups.set(event.beat,(groups.get(event.beat)??0)+1);add('modal-cluster-voicings',[...groups.values()].some(count=>count>=4)&&Boolean(t?.notes.some(event=>event.duration>=1)),'non-functional sustained four-note cluster gestures')}
 if(s.rules.includes('funk-comping')){const t=s.tracks.find(track=>track.role==='harmony');add('funk-guitar-comping',Boolean(t&&t.notes.length>=32&&t.notes.every(event=>event.duration<=.2&&Math.abs(event.beat%1)>.25)),'short clipped offbeat guitar chord stabs')}
 if(s.rules.includes('single-note-response')){const t=s.tracks.find(track=>track.role==='response');add('single-note-response-line',Boolean(t&&t.notes.length>=6&&new Set(t.notes.map(event=>event.beat)).size===t.notes.length),'spaced single-note response line')}
 if(s.rules.includes('clave-2-3')){const t=s.tracks.find(x=>x.channel===9&&x.notes.length>0),a=t?starts(t).filter(x=>x<8):[];add('clave-2-3-grid',JSON.stringify(a)===JSON.stringify([1,3,4,5.5,7]),'canonical 2-3 clave on the two-bar grid')}
 if(s.rules.includes('tumbao')){const t=s.tracks.find(x=>x.role==='bass')!,a=starts(t);add('tumbao-register',t.notes.every(n=>n.pitch>=28&&n.pitch<=48),'E1–C3 register');add('tumbao-monophonic',mono(t),'monophonic bass');add('tumbao-syncopation',a.every(x=>x%1!==0),'syncopated offbeat attacks');add('tumbao-repeat',JSON.stringify(a.slice(0,4))===JSON.stringify(a.slice(4,8).map(x=>x-8)),'repeating two-bar identity')}
 if(s.rules.includes('montuno')){const t=s.tracks.find(x=>x.role==='harmony')!,a=[...new Set(starts(t))];add('montuno-keyboard-role',['piano','rhodes','hammond-organ','vibraphone'].includes(t.instrumentId),'keyboard part');add('montuno-chord-events',t.notes.length>=18&&t.notes.some(n=>n.duration<.5),'short stacked chord attacks');add('montuno-syncopation',a.some(x=>x%1!==0),'syncopated offbeat displacement');add('montuno-repeat',a.length>=12&&a.slice(0,6).every((x,i)=>a[i+6]===x+8),'repeating two-bar figure')}
 if(s.rules.includes('la-pompe')){const t=s.tracks.find(x=>x.instrumentId.includes('guitar'))!,a=[...new Set(starts(t))];add('la-pompe-guitar',Boolean(t),'guitar program');add('la-pompe-four-beat',a.length===16&&a.every((x,i)=>x===i),'four regular attacks per 4/4 bar');add('la-pompe-articulation',t.notes.every(n=>n.duration<=.2),'short chord articulation')}
 if(s.rules.some(rule=>['swing-ride','swing-light','swing-restrained-ride','swing-clear-eighth','hard-bop-ride'].includes(rule))){const t=s.tracks.find(x=>x.role==='rhythm'),a=t?.notes.filter(n=>n.pitch===51).map(n=>n.beat)??[];add('swing-ride-mapping',Boolean(t?.notes.some(n=>n.pitch===51)),'GM ride cymbal note 51');add('swing-ride-bars',s.bars===4&&s.meter[0]===4,'four bars of 4/4');if(s.rules.includes('swing-light'))add('swing-light-dynamics',a.length===16&&a.some(beat=>Math.abs(beat%1-2/3)<.01)&&Boolean(t?.notes.filter(n=>n.pitch===37).length===s.bars*2&&t.notes.filter(n=>n.pitch===51).every(n=>n.velocity<=52)),'feathered ride pulse, occasional triplet pickups, and quiet side-stick color');if(s.rules.includes('swing-restrained-ride'))add('swing-restrained-ride-grid',a.length===16&&a.every(beat=>Math.abs(beat-Math.round(beat))<1e-6),'restrained ride only on quarter-note beats');if(s.rules.includes('swing-clear-eighth'))add('swing-clear-eighth-grid',a.length===32&&a.some(beat=>Math.abs(beat%1-2/3)<.01),'clear triplet-derived ride eighths');if(s.rules.includes('hard-bop-ride'))add('hard-bop-ride-accents',Boolean(t?.notes.some(n=>n.pitch===53)&&t?.notes.some(n=>n.pitch===38&&n.velocity>=70)&&t?.notes.some(n=>n.pitch===36&&n.velocity>=60)),'ride bell, accented snare and kick are present')}
 if(s.rules.includes('two-beat-early-swing')){const t=s.tracks.find(track=>track.role==='rhythm'),kick=t?.notes.filter(n=>n.pitch===36)??[];add('two-beat-early-swing-kick',kick.length===8&&kick.every(n=>n.beat%4===0||n.beat%4===2),'kick articulates beats one and three, not a four-on-the-floor pattern')}
 if(s.rules.includes('brush-sweep')){const t=s.tracks.find(track=>track.role==='rhythm'),mapping=t?.percussionMapping;add('brush-sweep-kit',mapping?.percussionKitFamily==='brush'&&mapping.soundFontBank===128&&mapping.soundFontProgram===40,'FluidR3 bank 128 / program 40 Brush kit');add('brush-sweep-pitch',Boolean(t?.notes.some(n=>n.pitch===40)&&t.notes.some(n=>n.pitch===38||n.pitch===39)),'MIDI 40 Brush Swirl with brush-snare notes 38/39')}
 if(s.rules.includes('power-rock-drive')){const t=s.tracks.find(track=>track.role==='rhythm');add('power-rock-kit',t?.percussionMapping?.percussionKitFamily==='power-rock'&&t.percussionMapping.soundFontBank===128&&t.percussionMapping.soundFontProgram===16,'FluidR3 bank 128 / program 16 Power kit');add('power-rock-dynamics',Boolean(t?.notes.some(n=>n.pitch===36&&n.velocity>=95)&&t.notes.some(n=>n.pitch===38&&n.velocity>=100)),'strong kick and snare identity with heavy tom/crash fills')}
 if(s.rules.includes('jazz-waltz')){const t=s.tracks.find(x=>x.role==='rhythm')!;add('jazz-waltz-meter',s.meter[0]===3&&s.meter[1]===4,'3/4 meter');add('jazz-waltz-triple',starts(t).slice(0,3).join(',')==='0,1,2','three evenly spaced beats per bar')}
 if(s.rules.includes('odd-meter')){const t=s.tracks.find(x=>x.role==='rhythm');add('odd-meter-signature',s.meter[0]===7&&s.meter[1]===8,'7/8 asymmetrical meter');add('odd-meter-span',Boolean(t&&t.notes.some(n=>n.beat%3.5>=3)),'rhythm pattern spans the full 7/8 bar')}
 if(s.rules.includes('boom-bap')){const t=s.tracks.find(x=>x.channel===9&&x.notes.length>0),[kick,snare,hat]=t?drumPitches(t):[36,38,42],k=t?.notes.filter(n=>n.pitch===kick)??[],sn=t?.notes.filter(n=>n.pitch===snare)??[],h=t?.notes.filter(n=>n.pitch===hat).map(n=>n.beat).sort((a,b)=>a-b)??[];add('boom-bap-meter',s.meter[0]===4&&s.meter[1]===4,'4/4 meter');add('boom-bap-backbeat',k.some(n=>n.beat%4===0)&&k.some(n=>n.beat%4>=2&&n.beat%4<4)&&sn.some(n=>n.beat%4===1)&&sn.some(n=>n.beat%4===3),'downbeat and syncopated kick with a snare backbeat');add('boom-bap-hat-rate',h.every((beat,index)=>index===0||beat-h[index-1]!>=.5),'hi-hat gaps are no faster than eighth notes')}
 if(s.rules.includes('straight-16-funk')){const t=s.tracks.find(x=>x.channel===9&&x.notes.length>0),[kick,snare,hat]=t?drumPitches(t):[36,38,42],h=t?.notes.filter(n=>n.pitch===hat)??[],k=t?.notes.filter(n=>n.pitch===kick)??[],sn=t?.notes.filter(n=>n.pitch===snare)??[];add('straight-16-meter',s.meter[0]===4&&s.meter[1]===4,'4/4 meter');add('straight-16-grid',h.length>=64&&h.every(n=>Math.abs(n.beat*4-Math.round(n.beat*4))<1e-4),'straight sixteenth-note subdivision');add('straight-16-backbeat',sn.some(n=>n.beat%4===1)&&sn.some(n=>n.beat%4===3)&&k.some(n=>n.beat%4===0),'snare on beats 2 and 4 with kick support');add('straight-16-unswung',h.every(n=>Math.abs(n.beat*4-Math.round(n.beat*4))<1e-4),'no swung subdivision')}
 if(s.rules.includes('broken-beat')){const t=s.tracks.find(x=>x.channel===9&&x.notes.length>0),[kick,snare]=t?drumPitches(t):[36,38],k=t?.notes.filter(n=>n.pitch===kick)??[],sn=t?.notes.filter(n=>n.pitch===snare)??[],onsets=t?starts(t):[],distinctRoles=kick!==snare,handTexture=Boolean(t&&['congas','bongos','timbales','soft-shaker','brazilian-percussion'].includes(t.instrumentId));const syncopated=handTexture?onsets.some(n=>Math.abs(n%1)>.01):distinctRoles&&k.length&&sn.length?k.some(n=>n.beat%4===1.75||n.beat%4===3.25)&&sn.some(n=>n.beat%4===2.75):onsets.some(n=>[.75,1.75,2.75,3.25,3.5].includes(n%4));add('broken-beat-asymmetry',Boolean(syncopated),'asymmetric syncopated kick/snare or percussion event grid');if(!handTexture)add('broken-beat-not-four-floor',distinctRoles&&k.length?k.every(n=>![1,2,3].includes(n.beat%4)):Boolean(t&&onsets.some(n=>n%4!==Math.floor(n%4))),'no four-on-the-floor kick')}
 if(s.rules.includes('modal-pedal')){const t=s.tracks.find(x=>x.role==='bass')!;add('modal-pedal-stability',t.notes.length>=4&&t.notes.every(n=>n.pitch===t.notes[0]?.pitch),'stable repeated pitch');add('modal-pedal-register',t.notes.every(n=>n.pitch>=28&&n.pitch<=48),'bass register')}
 if(s.rules.includes('quartal-voicing')){const track=s.tracks.find(t=>t.role==='harmony')!;const first=Math.min(...track.notes.map(n=>n.beat));const p=[...new Set(track.notes.filter(n=>n.beat===first).map(n=>n.pitch))].sort((a,b)=>a-b);add('quartal-intervals',p.length===3&&(p[1]! - p[0]!)===5&&(p[2]! - p[1]!)===5,'stacked perfect fourths in each opening voicing')}
 if(s.rules.includes('groove-ensemble'))add('groove-mini-ensemble',s.tracks.some(t=>t.role==='rhythm')&&s.tracks.some(t=>t.role==='bass')&&s.tracks.some(t=>t.role==='harmony'),'drums, bass and chordal instrument');return r}
function validateSemanticMusicSpec(s:MusicSpec):RuleResult[] {
 const results:RuleResult[]=[];
 const add=(rule:string,ok:boolean,detail:string)=>results.push({rule,ok,detail});
 const expectedFamily=s.category==='instrument'?'instrument-tone':semanticFamilyForPattern(s.source);
 add('semantic-family-pattern',s.semanticFamily===expectedFamily,s.semanticFamily+' → '+s.source+'; expected '+expectedFamily);
 add('semantic-family-rule',s.rules.includes('family:'+expectedFamily),'family:'+expectedFamily+' is present in structural rules');
 const rhythm=s.tracks.find(track=>track.role==='rhythm');
 const bass=s.tracks.find(track=>track.role==='bass');
 const hats=rhythm?.notes.filter(event=>event.pitch===42)??[];
 const snares=rhythm?.notes.filter(event=>event.pitch===38)??[];
 if(s.rules.includes('conversational-response')){const response=s.tracks.find(track=>track.role==='response');const onsets=response?starts(response):[];add('conversational-response-gaps',Boolean(response&&onsets.length===6&&onsets.some((beat,index)=>index>0&&beat-onsets[index-1]!>=2)),'six short replies are separated by conversational pauses')}
 if(s.rules.includes('bass-foundation'))add('bass-foundation-register',Boolean(bass&&bass.notes.length===4&&bass.notes.every(event=>event.pitch>=28&&event.pitch<=48)),'four restrained low-register root anchors');
 if(s.rules.includes('sparse-bass-foundation'))add('sparse-bass-foundation-space',Boolean(bass&&bass.notes.length===4&&bass.notes.every(event=>event.pitch>=28&&event.pitch<=48)&&bass.notes.some(event=>event.duration>=2)),'four low-register notes with long spaces between changes');
 if(s.rules.includes('laid-back-bass-pocket'))add('laid-back-bass-syncopation',Boolean(bass&&bass.notes.length===12&&bass.notes.some(event=>Math.abs(event.beat%1)>.05)),'three offset bass attacks per bar');
 if(s.rules.includes('bass-ostinato'))add('bass-ostinato-cell',Boolean(bass&&bass.notes.length===16&&bass.notes.every(event=>event.pitch>=28&&event.pitch<=48)),'repeating monophonic bass cell in the low register');
 if(s.rules.includes('clave-improvisation')){const claveTrack=s.tracks.find(track=>track.instrumentId==='acoustic-drums'&&track.role==='rhythm');const hits=claveTrack?.notes.map(event=>event.beat).filter(beat=>beat<8)??[];add('clave-improvisation-grid',JSON.stringify(hits)===JSON.stringify([1,3,4,5.5,7]),'lead improvisation sits over a 2-3 clave support part')}
 if(s.rules.includes('arranged-solo'))add('arranged-solo-support',s.tracks.some(track=>track.role==='lead')&&s.tracks.some(track=>track.role==='ensemble-stabs'),'featured lead has arranged ensemble support');
 if(s.rules.includes('ensemble-section-line'))add('section-line-support',s.tracks.some(track=>track.role==='section-line')&&s.tracks.some(track=>track.role==='ensemble-stabs'),'section voicing line is paired with arranged ensemble stabs');
 if(s.rules.includes('ensemble-counterline'))add('ensemble-counterline-overlap',s.tracks.some(track=>track.role==='countermelody')&&s.tracks.some(track=>track.role==='lead'),'upper counterline overlaps the principal melody');
 if(s.rules.includes('tailgate-response'))add('tailgate-response-low-register',Boolean(s.tracks.find(track=>track.role==='response')?.notes.every(event=>event.pitch<=58)),'low-register answering phrases for tailgate trombone');
 if(s.rules.includes('low-register-support'))add('low-register-support-range',Boolean(s.tracks.find(track=>track.role==='foundation')?.notes.every(event=>event.pitch<=58)),'support notes stay in the lower register');
 if(s.rules.includes('low-brass-pulse'))add('low-brass-pulse-register',Boolean(bass&&bass.notes.length===8&&bass.notes.every(event=>event.pitch<=43)),'low-brass pulse alternates low roots and fifths');
 if(s.category==='instrument'&&rhythm?.percussionMapping){
  const mapping=rhythm.percussionMapping,id=rhythm.instrumentId,pitches=new Set(rhythm.notes.map(event=>event.pitch));
  add('percussion-instrument-kit-program',mapping.soundFontBank===128&&mapping.soundFontProgram===rhythm.program,'bank 128 / '+mapping.soundFontPreset+' program '+mapping.soundFontProgram);
  if(id==='acoustic-drums')add('acoustic-drum-tone-identity',mapping.percussionKitFamily==='acoustic-jazz'&&mapping.soundFontProgram===32&&[36,38,51].every(pitch=>pitches.has(pitch)),'generic acoustic tone uses FluidR3 Jazz kit with kick, snare and ride');
  if(id==='brush-drums')add('brush-drum-tone-identity',mapping.percussionKitFamily==='brush'&&mapping.soundFontProgram===40&&pitches.has(40)&&pitches.has(38)&&pitches.has(39),'FluidR3 Brush kit uses MIDI 40 Brush Swirl and brush snares 38/39');
  if(id==='heavy-rock-drums')add('heavy-rock-tone-identity',mapping.percussionKitFamily==='power-rock'&&mapping.soundFontProgram===16&&[36,38].every(pitch=>pitches.has(pitch))&&rhythm.notes.some(event=>event.pitch===38&&event.velocity>=100),'FluidR3 Power kit has strong kick and snare events');
  if(id==='congas')add('conga-note-range',rhythm.notes.length>0&&rhythm.notes.every(event=>event.pitch>=62&&event.pitch<=64),'mute/open/low conga MIDI notes 62–64');
  if(id==='bongos')add('bongo-note-range',rhythm.notes.length>0&&rhythm.notes.every(event=>event.pitch===60||event.pitch===61),'high/low bongo MIDI notes 60–61');
  if(id==='timbales')add('timbales-note-range',rhythm.notes.some(event=>event.pitch===65)&&rhythm.notes.some(event=>event.pitch===66),'high/low timbales MIDI notes 65/66');
  if(id==='soft-shaker')add('shaker-articulation',rhythm.notes.length>0&&rhythm.notes.every(event=>event.pitch===70)&&mapping.fidelity==='TIMBRE_APPROXIMATION','soft GM maracas/shaker approximation at MIDI 70 is labeled');
  if(id==='brazilian-percussion')add('brazilian-percussion-mapping',[36,38,67,68,70].every(pitch=>pitches.has(pitch))&&mapping.fidelity==='TIMBRE_APPROXIMATION','surdo, caixa, agogo and maracas approximation is labeled');
 }
 if(rhythm?.percussionMapping?.percussionKitFamily==='brush')add('brush-articulation-mapping',rhythm.notes.some(event=>event.pitch===40)&&['brush-sweep-swirl','brush-sparse-swirl'].includes(rhythm.percussionMapping.articulationFamily)||rhythm.notes.some(event=>event.pitch===38||event.pitch===39),'Brush preset uses swirl or brush-snare pitches');
 if(rhythm?.percussionMapping?.percussionKitFamily==='power-rock')add('power-kit-mapping',rhythm.percussionMapping.soundFontBank===128&&rhythm.percussionMapping.soundFontProgram===16,'FluidR3 Power kit is explicitly selected');
 if(s.semanticFamily==='modal-bass-ostinato'){
  const positions=bass?starts(bass):[];
  const expected=[0,1.5,2.5,3.5];
  add('modal-ostinato-bass-role',Boolean(bass),'modal ostinato is carried by a bass part');
  add('modal-ostinato-repeating-cell',positions.length===16&&positions.every((beat,index)=>Math.abs(beat%4-expected[index%4]!)<1e-6),'four-note syncopated cell repeats across four bars');
 }
 if(s.semanticFamily==='jazz-waltz'){
  const expectedOffsets=[0,1,2];
  add('jazz-waltz-meter-3-4',s.meter[0]===3&&s.meter[1]===4,'three-beat 3/4 meter');
  if(bass){const positions=starts(bass);add('jazz-waltz-bass-three-beats',positions.length>=9&&positions.every((beat,index)=>Math.abs(beat%3-expectedOffsets[index%3]!)<1e-6),'bass articulates all three beats of each bar')}
  if(rhythm){const positions=starts(rhythm);add('jazz-waltz-rhythm-three-beats',positions.length>=9&&positions.every((beat,index)=>Math.abs(beat%3-expectedOffsets[index%3]!)<1e-6),'rhythm articulates all three beats of each bar')}
 }
 if(s.semanticFamily==='contemporary-flexible-eighths'){
  add('contemporary-flex-meter',s.meter[0]===4&&s.meter[1]===4,'flexible straight-eighth reference remains 4/4');
  add('contemporary-flex-eighth-grid',hats.length>=24&&hats.every(event=>Math.abs(event.beat*2-Math.round(event.beat*2))<1e-6),'steady eighth-note subdivision');
  add('contemporary-flex-asymmetrical-accents',Boolean(rhythm?.notes.some(event=>[36,38].includes(event.pitch)&&Math.abs(event.beat-Math.round(event.beat))>.1)),'asymmetrical accents vary inside the 4/4 pulse');
 }
 if(s.semanticFamily==='neo-soul-pocket'){
  add('neo-soul-meter',s.meter[0]===4&&s.meter[1]===4,'laid-back 4/4 pocket');
  add('neo-soul-displaced-sixteenths',hats.length>=24&&hats.length<64&&hats.every(event=>Math.abs(event.beat*4-Math.round(event.beat*4))<=.52),'sparse sixteenth-grid hats with subtle displacement');
  add('neo-soul-late-backbeat',snares.some(event=>{const offset=event.beat%1;return offset>=.03&&offset<=.1}),'snare placement sits slightly behind the beat');
 }
 if(s.semanticFamily==='hip-hop-half-time'){
  add('boom-bap-half-time-meter',s.meter[0]===4&&s.meter[1]===4,'4/4 boom-bap reference');
  add('boom-bap-half-time-snare',snares.length>=s.bars&&snares.every(event=>{const offset=event.beat%4;return offset>=2&&offset<=2.15}),'one delayed snare on beat three of each bar');
  add('boom-bap-half-time-hats',hats.length<=s.bars*8,'hi-hats stay at or below eighth-note density');
 }
 if(s.semanticFamily==='free-improvisation'){
  const backbeatNotes=rhythm?.channel===9?rhythm.notes.filter(event=>[36,38].includes(event.pitch)):[];
  const irregular=s.tracks.some(track=>track.notes.some(event=>Math.abs(event.beat*2-Math.round(event.beat*2))>.05));
  add('free-time-no-fixed-backbeat',backbeatNotes.length===0,'no repeated kick/snare backbeat');
  add('free-time-irregular-events',irregular,'event timing leaves the fixed eighth-note grid');
 }
 if(s.semanticFamily==='noir-sparse-brushes'){
  const events=rhythm?.notes??[];
  const gaps=events.slice(1).map((event,index)=>event.beat-events[index]!.beat);
  add('noir-brush-instrument',rhythm?.percussionMapping?.percussionKitFamily==='brush','brush-drum kit and articulation mapping');
  add('noir-slow-tempo',s.bpm<=64,'sparse brush tempo at '+s.bpm+' BPM');
  add('noir-sparse-dynamics',events.length>0&&events.length<=8&&events.every(event=>event.velocity<=56),'at most eight soft brush accents');
  add('noir-negative-space',gaps.some(gap=>gap>=2),'long pauses remain between brush accents');
 }
 if(s.semanticFamily==='third-stream-chamber-jazz'){
  const chamber=s.tracks.find(track=>['violin','clarinet'].includes(track.instrumentId)&&track.role==='countermelody');
  const piano=s.tracks.find(track=>track.instrumentId==='piano'&&track.role==='harmony');
  add('third-stream-chamber-line',Boolean(chamber&&chamber.notes.some(event=>event.duration>=.8)&&chamber.notes.some(event=>event.duration<.5)),'composed chamber counterline has varied sustained and short phrases');
  add('third-stream-jazz-harmony',Boolean(piano&&piano.notes.length>=6),'piano supplies a jazz-harmony reference');
 }
 return results;
}
export function validateMusicSpec(s:MusicSpec):RuleResult[] {
 return [...validateStructuralMusicSpec(s),...validateSemanticMusicSpec(s)];
}

function vlq(n:number):number[]{let v=Math.max(0,Math.floor(n));const o=[v&127];while((v>>=7)>0)o.unshift((v&127)|128);return o}
function chunk(type:string,d:number[]):number[]{const l=d.length;return[...Array.from(type).map(c=>c.charCodeAt(0)),l>>>24&255,l>>>16&255,l>>>8&255,l&255,...d]}
export function encodeMidi(s:MusicSpec):Uint8Array {const ppq=480,us=Math.round(60_000_000/s.bpm),tracks:number[][]=[];const conductor=[0,255,81,3,us>>>16&255,us>>>8&255,us&255,0,255,88,4,s.meter[0],Math.log2(s.meter[1]),24,8,0,255,47,0];tracks.push(chunk('MTrk',conductor));for(const t of s.tracks){const ch=t.channel%16,e:Array<{tick:number;order:number;bytes:number[]}>= [{tick:0,order:0,bytes:[192|ch,t.program&127]}];for(const n of t.notes){const a=Math.round(n.beat*ppq),b=Math.max(a+1,Math.round((n.beat+n.duration)*ppq));e.push({tick:a,order:2,bytes:[144|ch,n.pitch&127,n.velocity&127]},{tick:b,order:1,bytes:[128|ch,n.pitch&127,0]})}e.sort((a,b)=>a.tick-b.tick||a.order-b.order);const d:number[]=[];let prev=0;for(const x of e){d.push(...vlq(x.tick-prev),...x.bytes);prev=x.tick}d.push(0,255,47,0);tracks.push(chunk('MTrk',d))}const h=[77,84,104,100,0,0,0,6,0,1,tracks.length>>>8&255,tracks.length&255,1,224];return new Uint8Array([...h,...tracks.flat()])}
