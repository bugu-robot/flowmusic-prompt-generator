/* global process, setTimeout, fetch, console, localStorage, document */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
  assert.deepEqual(errors,[]);
  console.log('PASS: 5 Chromium browser E2E groups, no uncaught page errors');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
