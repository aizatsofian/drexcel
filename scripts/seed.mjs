import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
// Default local. Remote seeds require an explicit flag and an empty known DB.
const preview = process.argv.includes('--preview');
const production = process.argv.includes('--production');
if (preview && production) throw new Error('Choose one seed environment');
const environment = production ? 'production' : preview ? 'preview' : null;
const cli = resolve('node_modules/wrangler/bin/wrangler.js');
const scope = environment ? ['--remote', '--env', environment] : ['--local'];
await mkdir('.wrangler', { recursive: true });
if (environment) {
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  const binding = config.env?.[environment]?.d1_databases?.find(d => d.binding === 'DB');
  const expectedId = production ? '94f04e42-b38a-4e78-8806-947157fa760c' : '468597aa-cc71-47ed-94d3-8532bf63c081';
  if (binding?.database_name !== `drexcel-${environment}` || binding.database_id !== expectedId) throw new Error('Remote DB identity mismatch');
  const check = spawnSync(process.execPath, [cli, 'd1', 'execute', 'DB', ...scope, '--command', 'SELECT COUNT(*) AS n FROM admin', '--json'], { encoding: 'utf8' });
  if (check.status !== 0 || JSON.parse(check.stdout)[0].results[0].n !== 0) throw new Error('Remote seed requires empty admin table; refusing overwrite');
}
const data = JSON.parse(await readFile('sys/data.json', 'utf8'));
if (environment) {
  const password = randomBytes(24).toString('base64url'), salt = randomBytes(16);
  data.admin.password_hash = `pbkdf2$100000$${salt.toString('hex')}$${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
  await writeFile(`.wrangler/${environment}-admin.json`, JSON.stringify({ username: data.admin.username, password }), { mode: 0o600 });
  console.log(`Kredensial ${environment} rawak disimpan PRIVATE dalam .wrangler/${environment}-admin.json; tidak dipaparkan.`);
}
const q = v => `'${String(v ?? '').replaceAll("'", "''")}'`;
const rows = [];
for (const table of ['products', 'categories', 'testimonials', 'documents', 'admin', 'sessions', 'login_limits', 'counters', 'events']) rows.push(`DELETE FROM ${table};`);
for (const p of data.products) rows.push(`INSERT INTO products VALUES(${['id','nama','gambar','penerangan','kategori','demo'].map(k => q(p[k])).join(',')},${Number(p.likes) || 0});`);
for (const c of data.categories) rows.push(`INSERT INTO categories VALUES(${q(c)});`);
for (const t of data.testimonials) rows.push(`INSERT INTO testimonials VALUES(${q(t.id)},${q(t.nama)},${Number(t.rating) || 5},${q(t.komen)},${q(t.link)});`);
for (const k of ['profile', 'socials', 'settings']) rows.push(`INSERT INTO documents VALUES(${q(k)},${q(JSON.stringify(data[k] || {}))});`);
rows.push(`INSERT INTO documents VALUES('demo',${q(JSON.stringify(data.analytics?.demo || {}))});`);
rows.push(`INSERT INTO admin VALUES(1,${q(data.admin.username)},${q(data.admin.password_hash)});`);
const real = data.analytics?.real || {};
for (const [jenis, value] of [['visit', real.visitors], ['whatsapp', real.whatsapp_clicks]]) rows.push(`INSERT INTO counters VALUES(${q(jenis)},'',${Number(value) || 0});`);
for (const [jenis, map] of [['product', real.product_clicks], ['demo', real.demo_clicks]]) for (const [id, n] of Object.entries(map || {})) rows.push(`INSERT INTO counters VALUES(${q(jenis)},${q(id)},${Number(n) || 0});`);
for (const e of (real.events || []).slice(-5000)) rows.push(`INSERT INTO events(t,jenis,produk) VALUES(${q(e.t)},${q(e.jenis)},${q(e.produk)});`);
const file = resolve(`.wrangler/${environment || 'local'}.seed.sql`);
await mkdir('.wrangler', { recursive: true });
await writeFile(file, rows.join('\n'));
try {
  const result = spawnSync(process.execPath, [cli, 'd1', 'execute', 'DB', ...scope, '--file', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exitCode = 1;
} finally { await unlink(file); }
