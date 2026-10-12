import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Jalankan hanya terhadap emulator local yang di-seed; tidak menyokong remote URL.
const base='http://127.0.0.1:8788';let cookie='';
async function api(path,method='GET',body,auth=true,extra={}) {
  const response=await fetch(base+path,{method,headers:{...(auth&&cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
  const data=await response.json();return {response,data};
}
const original=JSON.parse(await readFile('sys/data.json','utf8'));
let result=await api('/api/data');assert.equal(result.data.data.products.length,original.products.length);assert.equal(result.data.data.admin,undefined);
assert.equal((await api('/api/admin/data')).response.status,401);
assert.equal((await api('/api/login','POST',{username:original.admin.username,password:'incorrect'})).response.status,401);
// Test uses the documented default login; if changed, supply local secret through environment.
result=await api('/api/login','POST',{username:original.admin.username,password:process.env.DREXCEL_TEST_PASSWORD||'admin123'});
assert.equal(result.response.status,200);cookie=result.response.headers.get('Set-Cookie').split(';')[0];
assert.equal((await api('/api/session')).data.loggedIn,true);
assert.equal((await api('/api/admin/data')).data.data.admin.password_hash,undefined);
const small=(await api('/api/admin/data?scope=username')).data.data;
assert.deepEqual(Object.keys(small),['admin']);
const snapshot=(await api('/api/admin/data')).data.data;
try {
  assert.equal((await api('/api/admin/products','POST',{nama:'Blocked',kategori:'Test'},true,{Origin:'https://evil.example'})).response.status,403);
  const product=(await api('/api/admin/products','POST',{nama:'Fasa 2 test',kategori:'Test'})).data.item;
  assert.ok(product.id);assert.equal((await api(`/api/admin/products/${product.id}`,'PUT',{nama:'Updated'})).data.item.nama,'Updated');
  const likes=await Promise.all(Array.from({length:5},()=>api('/api/like','POST',{produk:product.id},false)));
  assert.equal(Math.max(...likes.map(r=>r.data.likes)),product.likes+5);
  await api('/api/admin/categories','POST',{nama:'Test'});
  assert.equal((await api('/api/admin/categories/Test','PUT',{nama:'Renamed'})).data.ok,true);
  assert.equal((await api('/api/data')).data.data.products.find(p=>p.id===product.id).kategori,'Renamed');
  const testi=(await api('/api/admin/testimonials','POST',{nama:'Test',komen:'Test',link:'https://example.com'})).data.item;
  assert.equal((await api(`/api/admin/testimonials/${testi.id}`,'PUT',{rating:2})).data.item.rating,2);
  assert.equal((await api(`/api/admin/testimonials/${testi.id}`,'DELETE')).data.ok,true);
  assert.equal((await api(`/api/admin/products/${product.id}`,'DELETE')).data.ok,true);
  await api('/api/admin/categories/Renamed','DELETE');
  assert.equal((await api('/api/admin/settings','POST',{header:'Test header'})).data.changed.settings.header,'Test header');
  assert.deepEqual((await api('/api/admin/settings','POST',{header:'Test header'})).data.changed,{});
  await api('/api/track','POST',{jenis:'visit'},false);
  assert.equal((await api('/api/admin/analytics')).data.real.visitors,snapshot.analytics.real.visitors+1);
  assert.equal((await api('/api/admin/import','POST',{})).response.status,400);
  assert.equal((await api('/api/admin/import','POST',snapshot,false)).response.status,401);
  const malicious={...snapshot,admin:{username:'overwrite',password_hash:'bad'}};
  assert.equal((await api('/api/admin/import','POST',malicious)).data.ok,true);
  assert.equal((await api('/api/admin/data')).data.data.admin.username,original.admin.username);
  const uploadStatus=(await api('/api/admin/upload','POST',{})).response.status;
  assert.ok([400,503].includes(uploadStatus)); // Token configured: rejects non-multipart; absent: 503.
  assert.equal((await api('/api/admin/upload','POST',{},false)).response.status,401);
  const secret=await fetch(base+'/sys/data.json');assert.ok(!(await secret.text()).includes('password_hash'));
  console.log('PASS: public/auth/CSRF/CRUD/concurrent likes/settings no-op/analytics/import/upload placeholder/private data.');
} finally {
  await api('/api/admin/import','POST',snapshot);
  await api('/api/logout','POST',{});
}
assert.equal((await api('/api/session')).data.loggedIn,false);
assert.equal((await api('/api/data')).data.data.products.length,original.products.length);
console.log(`PASS: logout dan pemulihan ${original.products.length} produk.`);
