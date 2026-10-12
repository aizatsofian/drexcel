import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Opt-in integration test: creates ONE public PNG commit in the configured repo.
const base = 'http://127.0.0.1:8788';
const original = JSON.parse(await readFile('sys/data.json', 'utf8'));
const login = await fetch(base + '/api/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ username: original.admin.username, password: process.env.DREXCEL_TEST_PASSWORD || 'admin123' })
});
assert.equal(login.status, 200, 'Login local gagal');
const cookie = login.headers.get('Set-Cookie').split(';')[0];
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
try {
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: 'image/png' }), 'drexcel-upload-test.png');
  const response = await fetch(base + '/api/admin/upload', { method: 'POST', headers: { Cookie: cookie, Origin: base }, body: form });
  const result = await response.json();
  assert.equal(response.status, 200, result.error || 'Upload gagal');
  assert.equal(result.ok, true);
  assert.match(result.path, /^https:\/\/raw\.githubusercontent\.com\/aizatsofian\/drexcel\/[a-f0-9]{40}\/images\/uploads\/[^/]+\.png$/);
  console.log('Upload berjaya: ' + result.path);
  const image = await fetch(result.path);
  assert.equal(image.status, 200, 'URL gambar belum tersedia');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
  console.log('PASS: GitHub sebenar menerima PNG; URL public memulangkan bytes tepat.');
  const data = await fetch(base + '/api/data').then(r => r.json());
  assert.equal(data.data.products.length, original.products.length);
  console.log(`PASS: ${original.products.length} produk local tidak berubah; production tidak disentuh.`);
} finally {
  await fetch(base + '/api/logout', { method: 'POST', headers: { Cookie: cookie, Origin: base } });
}
