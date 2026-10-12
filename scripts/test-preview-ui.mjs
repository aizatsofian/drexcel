import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://phase4-preview.drexcel.pages.dev';
const credentials=JSON.parse(await readFile('.wrangler/preview-admin.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
const page=await context.newPage(),requests=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{const u=new URL(r.url());if(u.origin===base&&u.pathname.startsWith('/api/'))requests.push({path:u.pathname,method:r.method()});});
const count=path=>requests.filter(r=>r.path===path).length;
await mkdir('.wrangler/screenshots',{recursive:true});
try {
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#productGrid .card').length===107);
  assert.equal(count('/api/data'),1);
  const first=await page.locator('#productGrid .card .card-name').first().textContent();
  await page.locator('#hSearch').fill(first);await page.locator('#hSearch').fill('');
  await page.locator('#hCat').selectOption({index:1});await page.locator('#hCat').selectOption('');
  for(const name of ['bakul','testimoni','tentang','socmed','home'])await page.locator(`#bottomNav [data-page="${name}"]`).click();
  assert.equal(count('/api/data'),1);
  await page.screenshot({path:'.wrangler/screenshots/preview-desktop.png'});
  await page.locator('#adminFab').click();await page.locator('#loginUser').fill(credentials.username);await page.locator('#loginPass').fill(credentials.password);await page.locator('#loginSubmit').click();
  await page.locator('#loginModal').waitFor({state:'hidden'});
  await page.locator('#bottomNav [data-page="tetapan"]').click();await page.waitForFunction(()=>!document.querySelector('#miniNote').textContent.includes('Memuatkan'));
  assert.equal(count('/api/admin/analytics'),1);
  await page.locator('#bottomNav [data-page="home"]').click();await page.locator('#bottomNav [data-page="tetapan"]').click();assert.equal(count('/api/admin/analytics'),1);
  await page.locator('#miniRefresh').click();await page.waitForFunction(()=>!document.querySelector('#miniNote').textContent.includes('Memuatkan'));assert.equal(count('/api/admin/analytics'),2);
  const beforeSave=count('/api/admin/settings');await page.locator('#webSaveBtn').click();await page.locator('#adminSaveBtn').click();assert.equal(count('/api/admin/settings'),beforeSave);
  // Both Excel exports, then import the data workbook unchanged using actual UI.
  for(const button of ['exportDataBtn','exportAnaBtn']) {
    const event=page.waitForEvent('download');await page.locator('#'+button).click();const download=await event;
    assert.equal(await download.failure(),null);await download.saveAs('.wrangler/'+button+'.xlsx');
  }
  const importPromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/import');
  await page.locator('#importFile').setInputFiles('.wrangler/exportDataBtn.xlsx');
  await page.locator('#confirmYes').click();const importResponse=await importPromise;assert.equal(importResponse.status(),200);
  await page.waitForFunction(()=>document.querySelectorAll('#productGrid .card').length===107);
  // Idle check only in this test; application has no timer/polling.
  await page.waitForTimeout(1000);const idleCount=requests.length;await page.waitForTimeout(6000);assert.equal(requests.length,idleCount);
  const logoutResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/logout');
  await page.locator('#logoutBtn').click();assert.equal((await logoutResponse).status(),200);
  await page.waitForFunction(()=>document.querySelector('#page-home').classList.contains('active')&&document.querySelector('#adminFab').textContent==='Admin');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.wrangler/screenshots/preview-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.deepEqual(errors,[]);
  await writeFile('.wrangler/preview-ui-result.json',JSON.stringify({requests,errors,desktop:true,mobile:true,excelExportImport:true,idleNoPolling:true},null,2));
  console.log('PASS: headless Edge desktop/mobile, navigation/search/filter/no-op save/chart cache, Excel export+import, no idle polling, no JS errors.');
} finally {await context.close();await browser.close();}
