/* global process, setTimeout, fetch, console, localStorage, document */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:4173';
const pageUrl=origin+'/flowmusic-prompt-generator/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort','--mode','pages'],{
  stdio:['ignore','pipe','pipe'],env:{...process.env,GITHUB_REPOSITORY:'bugu-robot/flowmusic-prompt-generator'},
});
let serverOutput='';
server.stdout.on('data',data=>{serverOutput+=String(data);});
server.stderr.on('data',data=>{serverOutput+=String(data);});
async function waitServer() {
  for(let i=0;i<90;i++){
    if(server.exitCode!==null)throw Error('Preview server stopped: '+serverOutput);
    try { const response=await fetch(pageUrl);if(response.ok)return; }catch { /* preview has not started yet */ }
    await sleep(500);
  }
  throw Error('Preview server unavailable: '+serverOutput);
}
let browser;
try{
  await waitServer();
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1280,height:850}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const response=await page.goto(pageUrl,{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  const state=await page.evaluate(()=>({
    title:document.title, appText:document.querySelector('#app')?.textContent?.slice(0,300),
    scripts:[...document.querySelectorAll('script')].map(node=>node.getAttribute('src')),
  }));
  console.log('BOOT DIAGNOSTIC',JSON.stringify({status:response?.status(),url:page.url(),state,errors,serverOutput:serverOutput.slice(0,500)}));
  if(!(await page.locator('#prompt-provider').count()))throw Error('App failed to mount provider control; diagnostic above');
  await page.locator('#prompt-provider').waitFor();
  assert.equal(await page.locator('#prompt-provider').inputValue(),'suno');
  console.log('PASS: Suno Simple is default; page booted');

  // Main and Smart B must be captured after actual clipboard success, and
  // later ratings must use the exact copied prompt, not the edited live config.
  const mainText=await page.locator('#prompt-output').inputValue();
  await page.locator('[data-action="copy-prompt"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]').length===1);
  const mainCapture=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]')[0]);
  assert.equal(mainCapture.promptText,mainText);
  assert.equal(mainCapture.kind,'main');
  const smartB=await page.locator('#smart-output-B').inputValue();
  await page.locator('[data-action="copy-smart"][data-id="B"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]').length===2);
  const captured=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]'));
  assert.equal(captured[1].promptText,smartB);
  assert.equal(captured[1].kind,'B');
  assert.equal(captured[1].provider,'suno');
  console.log('PASS: exact clipboard snapshot for main and Smart B');

  // Provider-dependent enable/disable must work on actual DOM, not mocks.
  await page.locator('#prompt-provider').selectOption('flow');
  await page.locator('[data-action="option-view"][data-view="all"]').first().click();
  const dreamy=page.locator('[data-action="toggle-chip"][data-group="moodIds"][data-value="dreamy"]');
  assert.equal(await dreamy.isDisabled(),true);
  await page.locator('[data-action="toggle-chip"][data-group="moodIds"][data-value="cozy"]').click();
  assert.equal(await dreamy.isEnabled(),true);
  await dreamy.click();
  assert.equal(await dreamy.getAttribute('aria-pressed'),'true');
  await page.locator('#prompt-provider').selectOption('suno');
  const cheerful=page.locator('[data-action="toggle-chip"][data-group="moodIds"][data-value="cheerful"]');
  await cheerful.click();
  assert.equal(await cheerful.getAttribute('aria-pressed'),'true');
  await page.locator('#prompt-provider').selectOption('flow');
  assert.equal(await cheerful.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#flow-overflow-panel').isVisible(),true);
  assert.match(await page.locator('#flow-overflow-panel').innerText(),/Cheerful|歡|Dreamy|夢幻/);
  assert.match(await page.locator('#compatibility-panel').innerText(),/100 分|此分數|跨設定/);
  console.log('PASS: real provider switching, cap release, overflow, score disclaimer');

  // A historic copied Smart B must survive edited live settings.
  await page.locator('[data-action="select-style"][data-id="jazz-fusion"]').click();
  await page.locator('#feedback-panel summary').click();
  await page.locator('#feedback-prompt-source').selectOption(captured[1].id);
  await page.locator('#feedback-note').fill('E2E Smart B feedback');
  await page.locator('[data-action="save-track-feedback"]').click();
  const feedback=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.feedback.v1')??'[]'));
  assert.equal(feedback.at(-1).snapshot.promptText,smartB);
  assert.equal(feedback.at(-1).snapshot.kind,'B');
  assert.equal(feedback.at(-1).configuration.styleId,captured[1].configuration.styleId);
  assert.equal(feedback.at(-1).provider,'suno');
  assert.equal(feedback.at(-1).note,'E2E Smart B feedback');
  await page.reload({waitUntil:'networkidle'});
  const reloaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.feedback.v1')??'[]'));
  assert.equal(reloaded.at(-1).snapshot.promptText,smartB);
  console.log('PASS: copied Prompt B is linked to rating after style/provider change and reload');

  // Mobile viewport: labels must be visible (not title-only) and named.
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-action="option-view"][data-view="all"]').first().click();
  const warm=page.locator('[data-action="toggle-chip"][data-group="moodIds"][data-value="warm"]');
  assert.equal(await warm.locator('.choice-status').isVisible(),true);
  assert.match((await warm.getAttribute('aria-label'))??'',/推薦|實驗|留意/);
  assert.equal(await page.locator('[data-action="option-view"][data-view="all"]').first().isVisible(),true);
  await page.locator('[data-action="option-view"][data-view="recommended"]').first().click();
  assert.equal(await page.locator('[data-action="option-view"][data-view="recommended"]').first().getAttribute('aria-pressed'),'true');
  console.log('PASS: mobile-sized viewport exposes semantic labels and recommended/all controls');

  // Built-in collection application must never overwrite user-owned presets.
  await page.setViewportSize({width:1280,height:850});
  await page.locator('#preset-name').fill('Existing preset before Midnight');
  await page.locator('[data-action="save-preset"]').click();
  const existingPresets=await page.evaluate(()=>localStorage.getItem('flowmusic.promptGenerator.presets.v1'));
  const profiles=[['midnight-ambient',58],['blue-city-lounge',72],['rainy-night-mellow',62],['silent-minimal',50],['moonlit-guitar',64],['slow-piano-trio',66],['late-night-saxophone',62],['warm-acoustic-cafe',68],['coastal-slow-bossa',64]];
  assert.equal(await page.locator('[data-action="apply-midnight"]').count(),profiles.length);
  for(const [id,tempo] of profiles) {
    await page.locator('[data-action="apply-midnight"][data-id="'+id+'"]').click();
    assert.equal(Number(await page.locator('#tempo-number').inputValue()),tempo);
    assert.equal(await page.evaluate(()=>localStorage.getItem('flowmusic.promptGenerator.presets.v1')),existingPresets);
    for(const provider of ['suno','flow']) {
      await page.locator('#prompt-provider').selectOption(provider);
      const prompt=await page.locator('#prompt-output').inputValue();
      assert.match(prompt,new RegExp(tempo+' BPM'));
      if(id==='blue-city-lounge') {
        const b=await page.locator('#smart-output-B').inputValue();
        assert.match(b,/straight-eighth/);
        assert.doesNotMatch(b,/\bswing\b/i);
      }
      if(id==='rainy-night-mellow'||id==='silent-minimal')assert.match(prompt,/soft felt piano/i);
      if(id==='warm-acoustic-cafe'||id==='coastal-slow-bossa') {
        const liveConfig=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
        assert.equal(liveConfig.secondaryStyleId,undefined);
        assert.deepEqual(liveConfig.harmonyIds,['maj7','min7','sixth','add9']);
        assert.deepEqual(liveConfig.instruments.map(part=>[part.instrumentId,part.role]),id==='warm-acoustic-cafe'
          ? [['piano','lead'],['nylon-guitar','harmony'],['upright-bass','bass'],['brush-drums','rhythm']]
          : [['nylon-guitar','lead'],['piano','harmony'],['upright-bass','bass'],['soft-shaker','rhythm']]);
        for(const output of ['#prompt-output','#smart-output-A','#smart-output-B','#smart-output-C']) {
          const text=await page.locator(output).inputValue();
          assert.match(text,new RegExp(tempo+' BPM(?:,| in) 4/4'));
          assert.match(text,/major 7th, minor 7th, 6th, (?:and )?occasional add9/);
          assert.match(text,/generous breathing space/);
          assert.doesNotMatch(text,/\b(?:swing|Felt|Rhodes|Cool Jazz)\b/i);
          if(id==='warm-acoustic-cafe') {
            assert.match(text,/soft straight-eighth groove/);
            assert.match(text,/very soft brush drums/i);
          } else {
            assert.match(text,/gently syncopated melody/);
            assert.match(text,/very soft shaker/i);
            assert.match(text,/relaxed, warm, peaceful/);
            assert.doesNotMatch(text,/\bdrums\b/i);
          }
        }
        await page.locator('#prompt-view').selectOption('both');
        const zh=await page.locator('.preview-card .prompt-zh-prose').innerText();
        assert.match(zh,/旋律密度低/);
        assert.match(zh,/非常柔和而穩定/);
        if(id==='coastal-slow-bossa')assert.match(zh,/放鬆 Relaxed/);
        await page.locator('#prompt-view').selectOption('en');
      }
    }
  }
  console.log('PASS: all nine built-in profiles, both providers, Café Smart A/B/C, Chinese and existing user presets');

  // Felt is piano-only, survives reload and successful copy, and is explicitly
  // not advertised as a dedicated audio preview.
  await page.locator('[data-action="apply-midnight"][data-id="rainy-night-mellow"]').click();
  await page.locator('#prompt-provider').selectOption('suno');
  const timbre=page.locator('[data-part-field="timbreId"]');
  assert.equal(await timbre.count(),1);
  assert.equal(await timbre.inputValue(),'felt');
  assert.match(await page.locator('.felt-preview-note').innerText(),/並非專屬 Felt/);
  await timbre.selectOption('standard');
  assert.doesNotMatch(await page.locator('#prompt-output').inputValue(),/\bfelt\b/i);
  await timbre.selectOption('felt');
  await page.locator('[data-action="copy-prompt"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]').length===3);
  const feltCapture=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]').at(-1));
  assert.equal(feltCapture.configuration.instruments.find(x=>x.instrumentId==='piano').timbreId,'felt');
  assert.match(feltCapture.promptText,/soft felt piano/i);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await timbre.inputValue(),'felt');
  assert.match(await page.locator('#prompt-output').inputValue(),/soft felt piano/i);
  console.log('PASS: Felt toggle, honest audio-preview note, copied configuration and reload');

  // The P2 warning is visible without silently removing the selected pads.
  await page.locator('#instrument-picker').selectOption('ambient-pads');
  const advanced=page.locator('.advanced-controls');
  if(!(await advanced.evaluate(node=>node.open)))await advanced.locator('summary').click();
  const exclusion=page.locator('[data-action="toggle-chip"][data-group="constraintIds"][data-value="electronic"]');
  await exclusion.click();
  assert.match(await page.locator('#guidance-panel').innerText(),/互相矛盾/);
  await page.locator('[data-action="apply-optimization"][data-id="remove-electronic-exclusion"]').click();
  assert.equal(await exclusion.getAttribute('aria-pressed'),'false');
  const live=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
  assert.equal(live.instruments.some(x=>x.instrumentId==='ambient-pads'&&x.enabled),true);
  console.log('PASS: electronic exclusion warning and explicit-only repair preserve selected pads');

  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-action="apply-midnight"][data-id="silent-minimal"]').click();
  assert.equal(await page.locator('[data-action="apply-midnight"]').count(),profiles.length);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
  await page.locator('#toast.is-visible').waitFor({state:'hidden'});
  await page.locator('.midnight-collection').screenshot({path:'.artifacts/midnight-collection-mobile.png'});
  await page.setViewportSize({width:1280,height:850});
  await page.locator('.midnight-collection').screenshot({path:'.artifacts/midnight-collection-desktop.png'});
  console.log('PASS: Midnight cards and Felt controls at mobile width without horizontal overflow');

  // Exercise the real preset download/import and saved-configuration reload.
  for(const id of ['warm-acoustic-cafe','coastal-slow-bossa']) {
    await page.locator('[data-action="apply-midnight"][data-id="'+id+'"]').click();
    const configuration=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
    await page.locator('#preset-name').fill('E2E '+id);
    await page.locator('[data-action="save-preset"]').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.presets.v1')));
    assert.deepEqual(saved[0],JSON.parse(existingPresets)[0]);
    const savedId=saved.at(-1).id;
    const downloadReady=page.waitForEvent('download');
    await page.locator('[data-action="export-preset"][data-id="'+savedId+'"]').click();
    const download=await downloadReady;
    const path=await download.path();
    assert.ok(path);
    const exported=JSON.parse(await readFile(path,'utf8'));
    assert.equal(exported.version,1);
    assert.deepEqual(exported.preset.configuration,configuration);
    await page.reload({waitUntil:'networkidle'});
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1'))),configuration);
    // Selecting a style alone retains all current musical controls.
    await page.locator('[data-action="select-style"][data-id="jazz-fusion"]').click();
    const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
    assert.deepEqual({...retained,styleId:configuration.styleId},configuration);
    await page.locator('[data-action="load-preset"][data-id="'+savedId+'"]').click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1'))),configuration);
    await page.locator('#preset-file').setInputFiles(path);
    await page.waitForFunction(expected=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.presets.v1')).length===expected,saved.length+1);
    const importedId=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.presets.v1')).at(-1).id);
    await page.locator('[data-action="select-style"][data-id="jazz-fusion"]').click();
    await page.locator('[data-action="load-preset"][data-id="'+importedId+'"]').click();
    const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
    assert.deepEqual(restored,configuration);
    if(id==='coastal-slow-bossa')assert.doesNotMatch(await page.locator('#prompt-output').inputValue(),/Cool Jazz/);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    await page.setViewportSize({width:1280,height:850});
  }
  console.log('PASS: both Café presets export/import v1, reload, explicit-only application and mobile width');
  // New-user defaults and opening state are persisted, never generated on render.
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#opening-mode').inputValue(),'auto');
  assert.equal(await page.locator('[data-field="trackDurationId"]').inputValue(),'7-8');
  const start=await page.locator('#prompt-output').inputValue();
  assert.match(start,/Target a total track duration of approximately 7 to 8 minutes/);
  assert.match(start,/Opening:/);
  await page.locator('#prompt-view').selectOption('both');
  assert.equal(await page.locator('#prompt-output').inputValue(),start);
  assert.match(await page.locator('#opening-description').innerText(),/[\u3400-\u9fff]/u);
  await page.locator('#prompt-view').selectOption('en');
  await page.locator('[data-action="recompile"]').click();
  assert.equal(await page.locator('#prompt-output').inputValue(),start);
  const beforeOpening=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')??'null'));
  await page.locator('[data-action="new-opening"]').click();
  const nextOpening=await page.locator('#prompt-output').inputValue();
  assert.notEqual(nextOpening,start);
  const newConfig=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.configuration.v1')));
  if(beforeOpening)assert.deepEqual({...newConfig,openingSeed:beforeOpening.openingSeed},beforeOpening);
  const smartBefore=await page.locator('#smart-output-A').inputValue();
  await page.locator('[data-action="reroll-smart"]').click();
  assert.notEqual(await page.locator('#smart-output-A').inputValue(),smartBefore);
  assert.equal(await page.locator('#prompt-output').inputValue(),nextOpening);
  await page.locator('[data-action="copy-smart"][data-id="B"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1')??'[]').length===1);
  const openingSnapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.copiedPrompts.v1'))[0]);
  assert.equal(openingSnapshot.promptText,await page.locator('#smart-output-B').inputValue());
  assert.equal(openingSnapshot.configuration.openingMode,'auto');
  assert.equal(openingSnapshot.configuration.openingSeed,newConfig.openingSeed);
  assert.notEqual(openingSnapshot.resolvedOpeningSeed,newConfig.openingSeed);
  for(const provider of ['flow','suno']) {
    await page.locator('#prompt-provider').selectOption(provider);
    for(const mode of ['chord','bass','pickup','arpeggio','mid-phrase','original','auto']) {
      await page.locator('#opening-mode').selectOption(mode);
      const output=await page.locator('#prompt-output').inputValue();
      if(mode==='original')assert.doesNotMatch(output,/Opening:/);
      else assert.match(output,/Opening:/);
      assert.equal(await page.locator('[data-action="new-opening"]').isDisabled(),mode==='original');
    }
  }
  await page.locator('[data-action="new-opening"]').click();
  const savedOpening=await page.locator('#prompt-output').inputValue();
  await page.locator('#preset-name').fill('Opening persisted');
  await page.locator('[data-action="save-preset"]').click();
  const openingPreset=await page.evaluate(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.presets.v1'))[0]);
  const ready=page.waitForEvent('download');
  await page.locator('[data-action="export-preset"][data-id="'+openingPreset.id+'"]').click();
  const openingDownload=await ready;
  const openingPath=await openingDownload.path();
  const openingJson=JSON.parse(await readFile(openingPath,'utf8'));
  assert.equal(openingJson.preset.configuration.openingSeed,openingPreset.configuration.openingSeed);
  assert.equal(openingJson.preset.configuration.trackDurationId,'7-8');
  await page.locator('#preset-file').setInputFiles(openingPath);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('flowmusic.promptGenerator.presets.v1')).length===2);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#prompt-output').inputValue(),savedOpening);
  assert.equal(await page.locator('#opening-mode').inputValue(),'auto');
  await page.locator('[data-field="trackDurationId"]').selectOption('2-3');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-field="trackDurationId"]').inputValue(),'2-3');
  assert.match(await page.locator('#prompt-output').inputValue(),/approximately 2 to 3 minutes/);
  console.log('PASS: opening modes, new-opening, stable views/copy/rerenders, Smart rotation, snapshots, export/import/reload and new/retained duration');
  assert.deepEqual(errors,[]);
  console.log('PASS: complete Chromium browser E2E suite, no uncaught page errors');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
