import { mkdir, copyFile, cp, writeFile, access } from 'node:fs/promises';
await mkdir('dist/sys', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyFile('sys/style.css', 'dist/sys/style.css');
await cp('js', 'dist/js', { recursive: true });
// Git does not track empty media directories; fresh clones may omit them.
for (const dir of ['image', 'uploads']) {
  try { await access(dir); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  await cp(dir, `dist/${dir}`, { recursive: true });
}
await writeFile('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
await writeFile('dist/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Build siap: hanya fail awam disalin ke dist.');
