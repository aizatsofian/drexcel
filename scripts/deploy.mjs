import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const mode=process.argv[2];
if (!['preview','production'].includes(mode)) throw new Error('Specify preview or production');
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const expected={production:'94f04e42-b38a-4e78-8806-947157fa760c',preview:'468597aa-cc71-47ed-94d3-8532bf63c081'};
if(config.name!=='drexcel'||config.env?.[mode]?.d1_databases?.[0]?.database_id!==expected[mode])throw new Error('Deployment target mismatch');
for(const entry of await readdir('dist',{recursive:true})) {
  if(/(^|[\\/])(data\.json|data\.xlsx|\.dev\.vars.*|\.env.*|3link\.md|.*-admin\.json)$/.test(entry)||/\.(py|sql)$/.test(entry))throw new Error('Private file in dist: '+entry);
}
const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'pages','deploy','dist','--project-name','drexcel','--branch',mode==='production'?'main':'phase4-preview'],{stdio:'inherit'});
process.exitCode=result.status ?? 1;
