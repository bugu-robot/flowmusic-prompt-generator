import '../styles.css';
import { playSequence, togglePreview, type PlaylistItem } from './player';
import type { PreviewEntry, PreviewManifest } from './catalog';

interface SimilarityAsset { previewId: string; similarityFlags?: string[]; audioFeatures?: { spectralCentroidHzApprox?: number; onsetDensityPerSecond?: number } }
interface SimilarityReport { summary: { exactSpecDuplicateGroups: number; nearSpecDuplicateGroups: number; nearAudioSimilarityGroups: number; acceptedEquivalentGroups: number; expectedVariantGroups: number; invalidCollisionGroups: number }; assets: SimilarityAsset[] }

const root=document.querySelector<HTMLElement>('#audio-preview-review')!;
const esc=(value:unknown):string=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const FILTER_LABELS:Record<string,string>={'invalid-collision':'無效碰撞','near-duplicate':'相似預覽','accepted-equivalent':'已接受等價','expected-variant':'預期變體'};
function button(category:'instrument'|'behaviour'|'groove',key:string,name:string):string{return`<button type="button" class="preview-control" data-review-play data-preview-category="${category}" data-preview-key="${esc(key)}" data-preview-name="${esc(name)}" data-preview-idle="▶ 預覽" data-preview-stop="■ 停止" aria-label="預覽 ${esc(name)}" aria-pressed="false">▶ 預覽</button>`}
function similarityPills(flags:string[]):string {
 if(!flags.length)return'<span class="review-muted">無相似度警示</span>';
 const labels:Record<string,string>={'exact-spec-duplicate':'規格重複','near-spec-duplicate':'規格相似','near-audio-similarity':'PCM 相似','invalid-collision':FILTER_LABELS['invalid-collision']!,'accepted-equivalent':FILTER_LABELS['accepted-equivalent']!,'expected-variant':FILTER_LABELS['expected-variant']!};
 return flags.map(flag=>`<span class="qc-pill ${flag==='invalid-collision'?'qc-fail':flag==='expected-variant'?'qc-warn':'qc-pass'}">${esc(labels[flag]??flag)}</span>`).join(' ');
}
function row(e:PreviewEntry,category:'instrument'|'behaviour'|'groove',key:string,similarity:SimilarityAsset|undefined):string {
 const q=e.technicalQc as {ok?:boolean;integratedLufs?:number|null;truePeakDbtp?:number|null;durationSeconds?:number|null}|undefined;
 const flags=similarity?.similarityFlags??[];
 const percussion=Boolean(e.percussionKitFamily);
 const technical=q?.ok===true?'通過':'失敗';
 const musical=e.musicQcPassed?'通過':'失敗';
 const kit=e.percussionKitFamily??e.timbreFamily;
 const preset=`${e.soundFontBank}/${e.soundFontProgram} ${e.soundFontPreset}`;
 const qc=`<span class="qc-pill ${e.musicQcPassed?'qc-pass':'qc-fail'}">語意 ${musical}</span> <span class="qc-pill ${q?.ok?'qc-pass':'qc-fail'}">技術 ${technical}</span>`;
 const extra=`${q?.durationSeconds?.toFixed(2)??'—'} s · ${q?.integratedLufs?.toFixed(1)??'—'} LUFS · ${q?.truePeakDbtp?.toFixed(1)??'—'} dBTP`;
 return`<tr data-review-row data-review-category="${category}" data-percussion="${percussion}" data-similarity-flags="${esc(flags.join(' '))}"><td><strong>${esc(e.sourceLabel)}</strong><small>${esc(e.previewId)}</small></td><td>${esc(e.instrument??'—')}<small>${esc(e.instrumentId??'')}</small></td><td><strong>${esc(e.semanticFamily)}</strong><small>${esc(e.pattern)} · ${esc(e.meter)} · ${e.bpm} BPM</small></td><td><strong>${esc(kit)}</strong><small>${esc(preset)} · ${esc(e.articulationFamily)}</small><small>${esc(e.fidelityStatus)}</small></td><td>${qc}<small>${extra}</small></td><td>${similarityPills(flags)}</td><td>${button(category,key,e.sourceLabel)}</td></tr>`;
}
function section(title:string,summary:string,rows:string,open=false):string{return`<details class="panel audio-review-section" ${open?'open':''}><summary><strong>${title}</strong><span>${summary}</span></summary><div class="audio-review-table-wrap"><table class="audio-review-table"><thead><tr><th>目錄項目</th><th>樂器</th><th>行為語意與 pattern</th><th>音色／敲擊樂映射</th><th>QC</th><th>相似度旗標</th><th>試聽</th></tr></thead><tbody>${rows}</tbody></table></div></details>`}
function applyFilters():void {
 const checked=[...root.querySelectorAll<HTMLInputElement>('[data-audio-filter]:checked')].map(input=>input.dataset.audioFilter??'');
 const percussionOnly=checked.includes('percussion');
 const selected=checked.filter(filter=>filter!=='percussion');
 const rows=[...root.querySelectorAll<HTMLTableRowElement>('[data-review-row]')];
 let visible=0;
 for(const item of rows){
  const flags=(item.dataset.similarityFlags??'').split(' ').filter(Boolean);
  const matchedClass=selected.length===0||selected.some(filter=>filter==='near-duplicate'?flags.includes('near-spec-duplicate')||flags.includes('near-audio-similarity'):flags.includes(filter));
  const show=(!percussionOnly||item.dataset.percussion==='true')&&matchedClass;
  item.hidden=!show;
  if(show)visible++;
 }
 const status=root.querySelector<HTMLElement>('#review-filter-status');
 if(status)status.textContent=`顯示 ${visible} / ${rows.length} 項預覽`;
}
async function main():Promise<void>{
 try{
  const base=import.meta.env.BASE_URL;
  const [manifestResponse,similarityResponse]=await Promise.all([
   fetch(new URL(`${base}audio-previews/manifest.json`,window.location.origin)),
   fetch(new URL(`${base}audio-previews/audio-preview-similarity.json`,window.location.origin)),
  ]);
  if(!manifestResponse.ok||!similarityResponse.ok)throw new Error(`QC report ${manifestResponse.status}/${similarityResponse.status}`);
  const m=await manifestResponse.json() as PreviewManifest;
  const similarity=await similarityResponse.json() as SimilarityReport;
  const similarityById=new Map(similarity.assets.map((asset)=>[asset.previewId,asset]));
  const rows=(category:'instrument'|'behaviour'|'groove',items:Record<string,PreviewEntry>)=>Object.entries(items).map(([key,entry])=>row(entry,category,key,similarityById.get(entry.previewId))).join('');
  const instrumentRows=rows('instrument',m.instruments),behaviourRows=rows('behaviour',m.behaviours),grooveRows=rows('groove',m.grooves);
  const assetCount=m.coverage.instruments.mapped+m.coverage.behaviours.mapped+m.coverage.grooves.mapped;
  root.innerHTML=`<div class="audio-review-shell"><header class="audio-review-header"><div><p class="eyebrow">DEVELOPMENT · AUDIO QC</p><h1>Audio Preview Review</h1><p>檢視合成參考預覽的樂器映射、行為 pattern、結構與技術 QC，以及解碼 PCM 的相似度警示。</p></div></header><section class="panel audio-review-summary"><div><span>樂器音色</span><strong>${m.coverage.instruments.mapped} / ${m.coverage.instruments.expected}</strong></div><div><span>演奏方式</span><strong>${m.coverage.behaviours.mapped} / ${m.coverage.behaviours.behaviourPairsExpected}</strong><small>${m.coverage.behaviours.uniqueExpected} 個英文行為字串</small></div><div><span>Groove</span><strong>${m.coverage.grooves.mapped} / ${m.coverage.grooves.expected}</strong></div><div><span>音訊檔案</span><strong>${assetCount}</strong></div><div><span>相似度群組</span><strong>${similarity.summary.nearAudioSimilarityGroups}</strong><small>無效碰撞：${similarity.summary.invalidCollisionGroups}</small></div></section><section class="panel audio-review-filters" aria-label="音訊預覽篩選"><strong>篩選預覽</strong><label><input type="checkbox" data-audio-filter="percussion">敲擊樂</label><label><input type="checkbox" data-audio-filter="invalid-collision">無效碰撞</label><label><input type="checkbox" data-audio-filter="near-duplicate">相似預覽</label><label><input type="checkbox" data-audio-filter="accepted-equivalent">已接受等價</label><label><input type="checkbox" data-audio-filter="expected-variant">預期變體</label><span id="review-filter-status" role="status" aria-live="polite">顯示 ${assetCount} / ${assetCount} 項預覽</span></section><section class="panel audio-review-actions"><button class="button button-primary" type="button" id="play-representative">▶ 播放代表 QC 組合</button><span id="playlist-status" role="status" aria-live="polite">${m.representative.length} 段代表預覽 · 每次只播放一段</span></section>${section('樂器音色預覽',`${m.coverage.instruments.mapped}/${m.coverage.instruments.expected}`,instrumentRows,true)}${section('演奏方式預覽',`${m.coverage.behaviours.mapped}/${m.coverage.behaviours.behaviourPairsExpected} · ${m.coverage.behaviours.uniqueExpected} 個不同行為`,behaviourRows)}${section('Groove 預覽',`${m.coverage.grooves.mapped}/${m.coverage.grooves.expected}`,grooveRows)}<footer class="audio-review-footer">FluidR3 General MIDI 參考音色 · ${esc(m.format)} · 約 ${m.targetLufs} LUFS · <a href="${esc(base)}audio-previews/audio-preview-qc.md">查看技術 QC 報告</a> · <a href="${esc(base)}audio-previews/audio-preview-similarity.md">查看相似度報告</a> · <a href="${esc(base)}AUDIO_ASSET_LICENSES.md">授權資料</a></footer></div>`;
  root.addEventListener('change',event=>{if((event.target as HTMLElement).matches('[data-audio-filter]'))applyFilters()});
  const stop=(message:string)=>{const status=root.querySelector<HTMLElement>('#playlist-status');if(status)status.textContent=message};
  root.addEventListener('click',event=>{const target=event.target as HTMLElement;const play=target.closest<HTMLButtonElement>('[data-review-play]');if(play){togglePreview(play,message=>stop(message));return}if(target.closest('#play-representative')){const list:PlaylistItem[]=m.representative.map(item=>({category:item.category,key:item.key,label:item.label}));playSequence(list,(i,label)=>stop(`播放 ${i+1}/${list.length}：${label}`),()=>stop('代表 QC 組合播放完成。'),(_i,label)=>stop(`${label} 播放失敗。點擊個別預覽重試。`))}});
 }catch(error){root.innerHTML=`<section class="panel"><h1>Audio Preview QC</h1><p>QC 資料暫時無法載入：${esc(error instanceof Error?error.message:'未知錯誤')}</p><p>音訊故障不會影響 Prompt Generator。</p></section>`}
}
void main();
