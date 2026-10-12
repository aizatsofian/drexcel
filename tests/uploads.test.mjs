import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadGithub } from '../cloud/uploads.mjs';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
function request(bytes=png,name='image.png') {
  const form=new FormData();form.set('file',new Blob([bytes]),name);
  return new Request('https://drexcel.pages.dev/api/admin/upload',{method:'POST',body:form});
}
test('upload unik ke repo tetap, URL commit dan token backend sahaja',async()=>{
  let calls=0;
  const response=await uploadGithub(request(),{GITHUB_TOKEN:'test-secret'},async(url,init)=>{
    calls++;assert.match(url,/^https:\/\/api.github.com\/repos\/aizatsofian\/drexcel\/contents\/images\/uploads\/[^/]+\.png$/);
    assert.equal(init.headers.Authorization,'Bearer test-secret');assert.equal(init.redirect,'manual');
    const body=JSON.parse(init.body);assert.equal(body.branch,'main');assert.match(body.message,/\[skip ci\]/);assert.equal(body.sha,undefined);
    assert.deepEqual(Buffer.from(body.content,'base64'),Buffer.from(png));
    return Response.json({commit:{sha:'a'.repeat(40)}},{status:201});
  });
  const result=await response.json();assert.equal(calls,1);assert.equal(result.ok,true);
  assert.match(result.path,/raw.githubusercontent.com\/aizatsofian\/drexcel\/a{40}\/images\/uploads\//);
  assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('tanpa token, SVG, fail besar, permission gagal',async()=>{
  assert.equal((await uploadGithub(request(),{})).status,503);
  let calls=0;const stub=async()=>{calls++;return new Response('private error',{status:403});};
  assert.equal((await uploadGithub(request(new TextEncoder().encode('<svg/>'),'x.svg'),{GITHUB_TOKEN:'x'},stub)).status,400);
  assert.equal((await uploadGithub(request(new Uint8Array(5*1024*1024+1)),{GITHUB_TOKEN:'x'},stub)).status,413);
  assert.equal(calls,0);
  const response=await uploadGithub(request(),{GITHUB_TOKEN:'x'},stub);
  assert.equal(response.status,502);assert.equal((await response.json()).error,'github_token_atau_permission_gagal');
});
