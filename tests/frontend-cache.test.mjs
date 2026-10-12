import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../js/api.js',import.meta.url),'utf8');
function setup() {
  const calls=[];
  const context=vm.createContext({fetch:async(url,init)=>{
    calls.push({url,method:init?.method||'GET'});
    if(url==='/api/data') return Response.json({ok:true,data:{products:[{id:'p1',nama:'A',kategori:'Cat'}],categories:['Cat'],testimonials:[],settings:{header:'Old'},profile:{},socials:{}}});
    if(url==='/api/admin/analytics') return Response.json({ok:true,real:{daily:[]}});
    if(url==='/api/admin/products/p1') return Response.json({ok:true,item:{id:'p1',nama:'B',kategori:'Cat'}});
    if(url==='/api/admin/settings') return Response.json({ok:true,changed:{settings:{header:'New'}}});
    return Response.json({ok:true});
  }});
  vm.runInContext(source+'\nglobalThis.api=API;',context);
  return {api:context.api,calls};
}
test('initial read sekali, mutation response tanpa reload, skip no-op',async()=>{
  const {api,calls}=setup();await Promise.all([api.data(),api.data()]);assert.equal(calls.length,1);
  await api.updProduct('p1',{nama:'A'});assert.equal(calls.length,1);
  await api.updProduct('p1',{nama:'B'});await api.data();assert.equal(calls.length,2);assert.equal(api._data.products[0].nama,'B');
  await api.saveSettings({header:'Old'});assert.equal(calls.length,2);
  await api.saveSettings({profile:{},socials:{}});assert.equal(calls.length,2);
  await api.saveSettings({header:'New'});await api.data();assert.equal(calls.length,3);assert.equal(api._data.settings.header,'New');
  await api.data(true);assert.equal(calls.length,4);
});
test('analytics cache sehingga Refresh, import invalidate cache',async()=>{
  const {api,calls}=setup();await api.data();await Promise.all([api.analytics(),api.analytics()]);await api.analytics();
  assert.equal(calls.filter(c=>c.url==='/api/admin/analytics').length,1);
  await api.analytics(true);assert.equal(calls.filter(c=>c.url==='/api/admin/analytics').length,2);
  await api.importData({});await api.data();assert.equal(calls.filter(c=>c.url==='/api/data').length,2);
});
