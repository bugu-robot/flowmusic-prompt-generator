import { previewRuntimeIndex } from './generated-index';

export type PreviewCategory='instrument'|'behaviour'|'groove';
let currentAudio:HTMLAudioElement|null=null;
let currentButton:HTMLButtonElement|null=null;
let currentPath:string|undefined;
function setButton(button:HTMLButtonElement|null,playing:boolean):void {
 if(!button)return;
 const idle=button.dataset.previewIdle??'▶ 預覽',stop=button.dataset.previewStop??'■ 停止';
 button.classList.toggle('is-playing',playing);button.setAttribute('aria-pressed',String(playing));button.textContent=playing?stop:idle;
 const name=button.dataset.previewName??'';button.setAttribute('aria-label',playing?`${stop} ${name}`:`${idle} ${name}`.trim());
}
export function stopPreview():void {if(currentAudio){currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.load()}setButton(currentButton,false);currentAudio=null;currentButton=null;currentPath=undefined}
function mapPath(category:PreviewCategory,key:string):string|undefined { const map=previewRuntimeIndex as unknown as {instruments:Record<string,string>;behaviours:Record<string,string>;grooves:Record<string,string>};return map[category==='instrument'?'instruments':category==='behaviour'?'behaviours':'grooves'][key] }
export function togglePreview(button:HTMLButtonElement,onError:(message:string)=>void):void {
 const category=button.dataset.previewCategory as PreviewCategory|undefined,key=button.dataset.previewKey??'';
 if(!category){onError('找不到預覽項目。');return}
 const path=mapPath(category,key);if(!path){onError('此項目的音訊預覽暫時未有。');return}
 const url=new URL(`${import.meta.env.BASE_URL}${path}`,window.location.origin).href;
 if(currentAudio&&currentPath===url){stopPreview();return}
 stopPreview();
 const audio=new Audio();audio.preload='none';audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');audio.src=url;
 currentAudio=audio;currentButton=button;currentPath=url;setButton(button,true);
 audio.addEventListener('ended',()=>{if(currentAudio===audio)stopPreview()},{once:true});
 audio.addEventListener('error',()=>{if(currentAudio===audio){stopPreview();onError('音訊暫時無法播放，請稍後再試。')}},{once:true});
 void audio.play().catch(()=>{if(currentAudio===audio){stopPreview();onError('音訊暫時無法播放，請確認裝置音量或網絡後重試。')}});
}
export interface PlaylistItem {category:PreviewCategory;key:string;label:string}
export function playSequence(items:PlaylistItem[],onProgress:(index:number,label:string)=>void,onComplete:()=>void,onError:(index:number,label:string)=>void):()=>void {
 stopPreview();let index=0;let stopped=false;const audio=new Audio();audio.preload='none';audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');currentAudio=audio;
 const ownsPlayback=()=>!stopped&&currentAudio===audio;
 const playNext=()=>{if(!ownsPlayback())return;if(index>=items.length){stopPreview();onComplete();return}const current=index,item=items[index]!;const path=mapPath(item.category,item.key);if(!path){index++;playNext();return}onProgress(current,item.label);currentPath=new URL(`${import.meta.env.BASE_URL}${path}`,window.location.origin).href;audio.src=currentPath;void audio.play().catch(()=>{if(ownsPlayback()){stopped=true;stopPreview();onError(current,item.label)}})};
 audio.addEventListener('ended',()=>{if(!ownsPlayback())return;index++;playNext()});audio.addEventListener('error',()=>{if(!ownsPlayback())return;const current=items[index];stopped=true;stopPreview();if(current)onError(index,current.label)});playNext();
 return()=>{stopped=true;if(currentAudio===audio)stopPreview()};
}
