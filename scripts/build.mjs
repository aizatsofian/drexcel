import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
await mkdir('dist/sys', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyFile('sys/style.css', 'dist/sys/style.css');
for (const dir of ['js', 'image', 'uploads']) await cp(dir, `dist/${dir}`, { recursive: true });
await writeFile('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
await writeFile('dist/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Build siap: hanya fail awam disalin ke dist.');
