import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
// Production smoke test: removes only the product created by this test.
const base='https://drexcel.pages.dev';
const credentials=JSON.parse(await readFile('.wrangler/production-admin.json','utf8'));
const data=await fetch(base+'/api/data').then(r=>r.json());
assert.equal(data.ok,true);assert.equal(data.data.products.length,107);assert.equal(data.data.admin,undefined);
const wrong=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({username:credentials.username,password:'admin123'})});
assert.equal(wrong.status,401);
const denied=await fetch(base+'/api/admin/data');assert.equal(denied.status,401);
for(const path of ['/sys/data.json','/.dev.vars','/md/3link.md','/.wrangler/production-admin.json']) {
  const text=await fetch(base+path).then(r=>r.text());assert.ok(!/github_pat_|password_hash|"password"\s*:/.test(text));
}
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[];
let productId=null;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{const u=new URL(r.url());if(u.origin===base&&u.pathname.startsWith('/api/'))requests.push({path:u.pathname,method:r.method()});});
const count=p=>requests.filter(r=>r.path===p).length;
await mkdir('.wrangler/screenshots',{recursive:true});
try {
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#productGrid .card').length===107);
  await page.screenshot({path:'.wrangler/screenshots/production-desktop.png'});
  assert.equal(count('/api/data'),1);
  await page.locator('#hSearch').fill('Sistem');await page.locator('#hSearch').fill('');
  for(const name of ['bakul','testimoni','tentang','socmed','home'])await page.locator(`#bottomNav [data-page="${name}"]`).click();
  assert.equal(count('/api/data'),1);
  await page.locator('#adminFab').click();await page.locator('#loginUser').fill(credentials.username);await page.locator('#loginPass').fill(credentials.password);await page.locator('#loginSubmit').click();
  await page.locator('#loginModal').waitFor({state:'hidden'});
  await page.locator('#homeEditBtn').click();
  const uploadPromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/upload');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await page.locator('#npFile').setInputFiles({name:'production-smoke.png',mimeType:'image/png',buffer:png});
  const uploadResponse=await uploadPromise;assert.equal(uploadResponse.status(),200);
  const upload=await uploadResponse.json();assert.equal(upload.ok,true);
  await page.waitForFunction(()=>document.querySelector('#npGambar').value.startsWith('https://raw.githubusercontent.com/'));
  await page.locator('#npNama').fill('[Ujian deployment - akan dipadam]');
  const savePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/products'&&r.request().method()==='POST');
  await page.locator('#npSaveBtn').click();const saved=await savePromise;assert.equal(saved.status(),200);productId=(await saved.json()).item.id;
  await page.waitForFunction(()=>document.querySelectorAll('#productGrid .card').length===108);
  assert.equal(count('/api/data'),1,'Save should not reload all data');
  const persisted=await context.request.get(base+'/api/data');assert.ok((await persisted.json()).data.products.some(p=>p.id===productId));
  const removed=await context.request.delete(base+'/api/admin/products/'+productId,{headers:{Origin:base}});assert.equal((await removed.json()).ok,true);productId=null;
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelectorAll('#productGrid .card').length===107);
  await page.locator('#bottomNav [data-page="tetapan"]').click();await page.waitForFunction(()=>!document.querySelector('#miniNote').textContent.includes('Memuatkan'));
  assert.equal(count('/api/admin/analytics'),1);
  await page.locator('#bottomNav [data-page="home"]').click();await page.locator('#bottomNav [data-page="tetapan"]').click();assert.equal(count('/api/admin/analytics'),1);
  const before=count('/api/admin/settings');await page.locator('#webSaveBtn').click();await page.locator('#adminSaveBtn').click();assert.equal(count('/api/admin/settings'),before);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportDataBtn').click();const download=await downloadPromise;assert.equal(await download.failure(),null);await download.saveAs('.wrangler/production-export-test.xlsx');
  await page.waitForTimeout(1000);const idle=requests.length;await page.waitForTimeout(6000);assert.equal(requests.length,idle);
  const logout=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/logout');await page.locator('#logoutBtn').click();assert.equal((await logout).status(),200);
  await page.waitForFunction(()=>document.querySelector('#adminFab').textContent==='Admin'&&document.querySelector('#page-home').classList.contains('active'));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.wrangler/screenshots/production-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);assert.deepEqual(errors,[]);
  await writeFile('.wrangler/production-test-result.json',JSON.stringify({public:true,admin:true,uploadPath:upload.path,crud:true,noPolling:true,export:true,mobile:true,errors},null,2));
  console.log('PASS: production public/auth, admin123 rejected, real UI GitHub upload + save + persistence + delete, cache/no-op/no polling, Excel export, desktop/mobile, private files hidden.');
} finally {
  if(productId)await context.request.delete(base+'/api/admin/products/'+productId,{headers:{Origin:base}});
  await context.request.post(base+'/api/logout',{headers:{Origin:base}});
  await context.close();await browser.close();
}
const final=await fetch(base+'/api/data').then(r=>r.json());assert.equal(final.data.products.length,107);
console.log('PASS: production kembali 107 produk; tiada overwrite/import data production semasa ujian.');
