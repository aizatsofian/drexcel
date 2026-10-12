import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
// Explicit preview only: never accept production URL or database.
const base='https://phase4-preview.drexcel.pages.dev';
const credentials=JSON.parse(await readFile('.wrangler/preview-admin.json','utf8'));
let cookie='';
async function api(path,method='GET',body,auth=true,headers={}) {
  const response=await fetch(base+path,{method,headers:{...(cookie&&auth?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:base}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw new Error(`${path}: HTTP ${response.status}, non-JSON (possible CPU limit)`);}
  return {response,data};
}
let r=await api('/api/login','POST',{username:credentials.username,password:'admin123'});assert.equal(r.response.status,401);
r=await api('/api/login','POST',credentials);assert.equal(r.response.status,200);
const setCookie=r.response.headers.get('Set-Cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);cookie=setCookie.split(';')[0];
const snapshot=(await api('/api/admin/data')).data.data;
assert.equal(snapshot.products.length,107);assert.equal(snapshot.admin.password_hash,undefined);
try {
  assert.equal((await api('/api/admin/products','POST',{nama:'Blocked',kategori:'Test'},true,{Origin:'https://evil.example'})).response.status,403);
  const category='Phase4-'+Date.now();
  await api('/api/admin/categories','POST',{nama:category});
  const product=(await api('/api/admin/products','POST',{nama:'Phase4 test',kategori:category})).data.item;assert.ok(product);
  assert.equal((await api(`/api/admin/products/${product.id}`,'PUT',{nama:'Updated'})).data.item.nama,'Updated');
  const likes=await Promise.all(Array.from({length:5},()=>api('/api/like','POST',{produk:product.id},false)));assert.equal(Math.max(...likes.map(r=>r.data.likes)),product.likes+5);
  assert.equal((await api('/api/admin/categories/'+category,'PUT',{nama:category+'-renamed'})).data.ok,true);
  const t=(await api('/api/admin/testimonials','POST',{nama:'Test',komen:'Preview test',link:'https://example.com'})).data.item;
  assert.equal((await api('/api/admin/testimonials/'+t.id,'PUT',{rating:3})).data.item.rating,3);
  await api('/api/admin/testimonials/'+t.id,'DELETE');await api('/api/admin/products/'+product.id,'DELETE');await api('/api/admin/categories/'+category+'-renamed','DELETE');
  assert.equal((await api('/api/admin/settings','POST',{header:'Phase4 preview test'})).data.ok,true);
  await api('/api/track','POST',{jenis:'visit'},false);
  assert.equal((await api('/api/admin/analytics')).data.real.visitors,snapshot.analytics.real.visitors+1);
  assert.equal((await api('/api/admin/import','POST',{})).response.status,400);
  assert.equal((await api('/api/admin/import','POST',snapshot,false)).response.status,401);
  assert.equal((await api('/api/admin/import','POST',{...snapshot,admin:{username:'must-not-change'}})).data.ok,true);
  assert.equal((await api('/api/admin/data')).data.data.admin.username,credentials.username);
  console.log('PASS: preview login/CSRF/CRUD/concurrent likes/settings/analytics/import, admin123 rejected.');
  // Real, valid PNG with random RGB pixels; ~4.84 MiB validates near-5MB limit.
  function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  function chunk(type,data){const tag=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([tag,data])),out.length-4);return out;}
  const width=1300,height=1300,scan=Buffer.alloc(height*(1+width*3));
  for(let y=0;y<height;y++)randomBytes(width*3).copy(scan,y*(1+width*3)+1);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
  assert.ok(png.length<5*1024*1024);
  const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'phase4-large-test.png');
  const upload=await fetch(base+'/api/admin/upload',{method:'POST',headers:{Cookie:cookie,Origin:base},body:form});
  const raw=await upload.text();let result;try{result=JSON.parse(raw);}catch{result={error:'non-JSON runtime error'};}
  console.log(`Large upload: ${png.length} bytes, HTTP ${upload.status}, ${result.ok?'OK':result.error}`);
  await writeFile('.wrangler/preview-upload-result.json',JSON.stringify({bytes:png.length,status:upload.status,ok:result.ok||false,path:result.path||null}));
  assert.equal(upload.status,200,result.error);
  const image=await fetch(result.path);assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  console.log('PASS: near-5MB PNG upload from Cloudflare to GitHub, raw URL bytes verified.');
} finally {
  const restore=await api('/api/admin/import','POST',snapshot);assert.equal(restore.data.ok,true,'Preview restore failed');
  await api('/api/logout','POST',{});
}
console.log('PASS: preview data restored, test session logged out.');
