import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanImport, cleanItem } from '../cloud/validation.mjs';
import { summary } from '../cloud/store.mjs';
test('whitelist produk dan validasi URL',()=>{
  assert.deepEqual(cleanItem('products',{nama:'A',kategori:'B',harga:500}),{nama:'A',kategori:'B',gambar:'',penerangan:'',demo:''});
  assert.throws(()=>cleanItem('products',{nama:'A',kategori:'B',gambar:'javascript:alert(1)'}));
  assert.deepEqual(cleanItem('products',{nama:'Baru'},true),{nama:'Baru'});
});
test('import mesti lengkap, tidak menerima kredensial admin',()=>{
  assert.throws(()=>cleanImport({}),/sheet_products_tiada/);
  const data={products:[],categories:['A','A'],testimonials:[],profile:{},socials:{},settings:{},analytics:{},admin:{username:'attacker'}};
  const result=cleanImport(data);
  assert.deepEqual(result.categories,['A']);assert.equal(result.admin,undefined);
});
test('ringkasan analytics mengekalkan format API',()=>{
  const result=summary({visitors:1,whatsapp_clicks:0,product_clicks:{p1:2},demo_clicks:{p1:1},events:[{t:'2026-10-13T00:00:00Z',jenis:'visit'}]},[{id:'p1',nama:'Produk'}]);
  assert.equal(result.popular.nama,'Produk');assert.equal(result.popular.klik,3);assert.equal(result.daily[0].pelawat,1);
});
