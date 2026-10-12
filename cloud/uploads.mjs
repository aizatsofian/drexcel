const MAX_FILE = 5 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 64 * 1024;
function failure(error, status = 400) { return Response.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function imageExtension(bytes) {
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'jpg';
  const head=new TextDecoder().decode(bytes.slice(0,12));
  if (/^GIF8[79]a/.test(head)) return 'gif';
  if (head.startsWith('RIFF') && head.slice(8,12)==='WEBP') return 'webp';
  return null;
}
export async function uploadGithub(request, env, githubFetch = fetch) {
  if (!env.GITHUB_TOKEN) return failure('github_token_belum_ditetapkan',503);
  // Backend controls destination; never accept a repository/path from the client.
  const owner=env.GITHUB_OWNER || 'aizatsofian', repo=env.GITHUB_REPO || 'drexcel', branch=env.GITHUB_BRANCH || 'main';
  if (owner!=='aizatsofian' || repo!=='drexcel' || !/^[\w./-]+$/.test(branch)) return failure('github_config_tidak_sah',503);
  if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data')) return failure('multipart_diperlukan');
  if (Number(request.headers.get('Content-Length'))>MAX_BODY) return failure('fail_terlalu_besar',413);
  const reader=request.body?.getReader();if(!reader) return failure('fail_diperlukan');
  const chunks=[];let size=0;
  while(true) { const {done,value}=await reader.read();if(done) break;size+=value.length;if(size>MAX_BODY){await reader.cancel();return failure('fail_terlalu_besar',413);}chunks.push(value); }
  const formRequest=new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')},body:new Blob(chunks)});
  let form;try {form=await formRequest.formData();} catch {return failure('multipart_tidak_sah');}
  const file=form.get('file');
  if(!file || typeof file.arrayBuffer!=='function' || !file.size) return failure('fail_diperlukan');
  if(file.size>MAX_FILE) return failure('fail_terlalu_besar',413);
  const bytes=new Uint8Array(await file.arrayBuffer()), ext=imageExtension(bytes);
  // No SVG: active content could execute if served from the website origin.
  if(!ext) return failure('gambar_tidak_sah_png_jpg_webp_gif');
  const path=`images/uploads/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  let binary='';for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  let response;
  try {
    response=await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,{
      method:'PUT',redirect:'manual',signal:AbortSignal.timeout(30000),
      headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'drexcel-upload','Content-Type':'application/json'},
      body:JSON.stringify({message:`Upload image ${path} [skip ci]`,branch,content:btoa(binary)})
    });
  } catch (error) {
    const message=String(error.message || '').replaceAll(env.GITHUB_TOKEN,'[REDACTED]').slice(0,240);
    console.error(JSON.stringify({event:'github_upload_connection_error',name:error.name,message,code:error.cause?.code || error.code || null}));
    return failure('github_sambungan_gagal',502);
  }
  if(!response.ok) {
    const status=response.status;
    await response.body?.cancel();
    return failure(status===401||status===403?'github_token_atau_permission_gagal':status===409?'github_conflict_cuba_semula':'github_upload_gagal',502);
  }
  let result;try {result=await response.json();} catch {return failure('github_respons_tidak_sah',502);}
  const sha=result.commit?.sha;
  if(!/^[a-f0-9]{40}$/.test(sha||'')) return failure('github_respons_tidak_sah',502);
  return Response.json({ok:true,path:`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`},{headers:{'Cache-Control':'no-store'}});
}
