import { digest, hashPassword, verifyPassword, session, token, cookie } from './auth.mjs';
import { tracks, socialKeys, object, text, cleanItem, cleanImport } from './validation.mjs';
import { stmt, insertItem, publicData, analyticsData, analyticsSummary, importStatements } from './store.mjs';
import { uploadGithub, deleteGithubFile, repoPathFromStored } from './uploads.mjs';
const json = (data, status=200, headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail = (error,status=400) => json({ok:false,error},status);
async function body(request, max=2*1024*1024) {
  if(Number(request.headers.get('Content-Length'))>max) throw new Error('payload_terlalu_besar');
  const reader=request.body?.getReader();
  if(!reader) return {};
  let size=0; const chunks=[];
  while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>max) {await reader.cancel();throw new Error('payload_terlalu_besar');} chunks.push(value); }
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  let value; try {value=JSON.parse(new TextDecoder().decode(bytes));} catch {throw new Error('json_tidak_sah');}
  if(!object(value)) throw new Error('format_tidak_sah'); return value;
}
export async function handle(request, env, ctx) {
  const background = (p) => { try { const r = (ctx && ctx.waitUntil) ? ctx.waitUntil(p) : p; if (r && r.catch) r.catch(() => {}); } catch {} };
  // Padam repo path jika tiada rekod guna lagi (refcount selamat, best-effort).
  // Banding ikut repoPath supaya URL raw commit-SHA dan path repo dianggap fail sama.
  async function cleanupRepoPaths(db, candidates) {
    const targets = new Map();
    for (const old of new Set((candidates || []).filter(Boolean))) {
      const rp = repoPathFromStored(old);
      if (rp && !targets.has(rp)) targets.set(rp, old);
    }
    if (!targets.size) return;
    try {
      const used = new Set();
      const prods = await stmt(db, 'SELECT gambar FROM products').all();
      for (const r of prods.results || []) { const rp = repoPathFromStored(r.gambar); if (rp) used.add(rp); }
      const docs = await stmt(db, "SELECT value FROM documents WHERE key IN ('profile','settings')").all();
      for (const r of docs.results || []) {
        try {
          const v = JSON.parse(r.value || '{}');
          for (const k of ['gambar', 'logo', 'qr_bank', 'qr_tng']) { const rp = repoPathFromStored(v[k]); if (rp) used.add(rp); }
          for (const s of Array.isArray(v.sijil) ? v.sijil : []) { const rp = repoPathFromStored(s); if (rp) used.add(rp); }
        } catch {}
      }
      for (const rp of targets.keys()) if (!used.has(rp)) background(deleteGithubFile(rp, env));
    } catch {}
  }
  const url=new URL(request.url), path=url.pathname, method=request.method,db=env.DB;
  try {
    if(!['GET','POST','PUT','DELETE'].includes(method)) return fail('method_tidak_sah',405);
    if(method!=='GET') {
      const origin=request.headers.get('Origin');
      if(origin && origin!==url.origin) return fail('origin_tidak_sah',403);
      if(request.headers.get('Sec-Fetch-Site')==='cross-site') return fail('origin_tidak_sah',403);
    }
    if(path.startsWith('/api/admin/') && !await session(db,request)) return fail('unauthorized',401);
    if(method==='GET' && path==='/api/session') return json({ok:true,loggedIn:await session(db,request)});
    if(method==='GET' && path==='/api/data') return json({ok:true,data:await publicData(db)});
    if(method==='GET' && path==='/api/admin/data') {
      if(url.searchParams.get('scope')==='username') return json({ok:true,data:{admin:await db.prepare('SELECT username FROM admin WHERE id=1').first()}});
      const [data,analytics,admin]=await Promise.all([publicData(db),analyticsData(db),db.prepare('SELECT username FROM admin WHERE id=1').first()]);
      return json({ok:true,data:{...data,analytics,admin}});
    }
    if(method==='GET' && path==='/api/admin/analytics') {
      return json({ok:true,...await analyticsSummary(db)});
    }
    if(method==='POST' && path==='/api/logout') {
      const value=token(request);if(value) await stmt(db,'DELETE FROM sessions WHERE token_hash=?',await digest(value)).run();
      return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
    }
    if(method==='POST' && path==='/api/admin/upload') return uploadGithub(request,env);
    const b=method==='GET'||method==='DELETE'?{}:await body(request,path==='/api/admin/import'?10*1024*1024:2*1024*1024);
    if(method==='POST' && path==='/api/login') {
      const now=Date.now(),key=await digest(request.headers.get('CF-Connecting-IP')||'local');
      // Count all attempts atomically, before expensive password verification.
      const limit=await stmt(db,'INSERT INTO login_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<=? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING attempts',key,now+15*60*1000,now,now).first();
      if(limit.attempts>10) return fail('login_terlalu_banyak',429);
      const admin=await db.prepare('SELECT username,password_hash FROM admin WHERE id=1').first();
      const valid=admin && await verifyPassword(String(b.password||''),admin.password_hash);
      if(!valid || text(b.username,50).trim()!==admin.username) return fail('login_gagal',401);
      const value=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
      await db.batch([stmt(db,'DELETE FROM login_limits WHERE key=? OR expires<=?',key,now),stmt(db,'DELETE FROM sessions WHERE expires<=?',now),stmt(db,'INSERT INTO sessions VALUES(?,?)',await digest(value),now+43200000)]);
      return json({ok:true},200,{'Set-Cookie':cookie(request,value)});
    }
    if(method==='POST' && path==='/api/track') {
      if(!tracks.includes(b.jenis)) return fail('jenis_tidak_sah');
      const id=text(b.produk,64),jenis=b.jenis;
      const list=[stmt(db,'INSERT INTO events(t,jenis,produk) VALUES(?,?,?)',new Date().toISOString(),jenis,id)];
      if(!['product','demo'].includes(jenis)||id) list.push(stmt(db,'INSERT INTO counters VALUES(?,?,1) ON CONFLICT(jenis,produk) DO UPDATE SET count=count+1',jenis,['product','demo'].includes(jenis)?id:''));
      await db.batch(list);return json({ok:true});
    }
    if(method==='POST' && path==='/api/like') {
      if(!b.produk) return fail('produk_diperlukan');
      const item=await stmt(db,'UPDATE products SET likes=likes+1 WHERE id=? RETURNING likes',text(b.produk,64)).first();
      return item?json({ok:true,likes:item.likes}):fail('produk_tidak_jumpa',404);
    }
    if(method==='POST' && path==='/api/admin/import') {
      const clean=cleanImport(b);await db.batch(importStatements(db,clean));return json({ok:true});
    }
    if(method==='POST' && path==='/api/admin/settings') {
      const writes=[],changed={};
      let oldDocs={};
      try {
        const rows=await stmt(db,"SELECT key,value FROM documents WHERE key IN ('profile','settings')").all();
        for(const r of rows.results||[]) { try { oldDocs[r.key]=JSON.parse(r.value||'{}'); } catch {} }
      } catch {}
      const specs={settings:['logo','whatsapp','header','bank_nama','bank_no','bank_penama','qr_bank','qr_tng','steps'],profile:['nama','biodata','kepakaran','penerangan','gambar','link','sijil'],socials:socialKeys};
      for(const [key,allowed] of Object.entries(specs)) {
        const input=key==='settings'?b:b[key];if(!object(input)) continue;
        const patch={};for(const k of allowed) if(k in input) {
          if(k==='kepakaran'||k==='sijil') {if(!Array.isArray(input[k])) return fail(k+'_tidak_sah');patch[k]=input[k].slice(0,20).map(x=>text(x,k==='sijil'?500:80));}
          else patch[k]=text(input[k],['penerangan','steps'].includes(k)?(k==='steps'?5000:2000):500);
        }
        if(!Object.keys(patch).length) continue;
        const row=await stmt(db,'SELECT value FROM documents WHERE key=?',key).first();
        const current=JSON.parse(row?.value||'{}');
        if(Object.keys(patch).every(k=>JSON.stringify(current[k])===JSON.stringify(patch[k]))) continue;
        // SQL json_patch avoids overwriting unrelated fields changed concurrently.
        writes.push(stmt(db,"INSERT INTO documents(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=json_patch(documents.value,excluded.value)",key,JSON.stringify(patch)));
        changed[key]={...current,...patch};
      }
      if(object(b.admin)) {
        const row=await db.prepare('SELECT username,password_hash FROM admin WHERE id=1').first();
        const username=b.admin.username?text(b.admin.username,50).trim():row.username;
        if(!username) return fail('username_diperlukan');
        if(b.admin.password && String(b.admin.password).length<8) return fail('password_minimum_8');
        const hash=b.admin.password?await hashPassword(String(b.admin.password)):row.password_hash;
        if(username!==row.username||hash!==row.password_hash) writes.push(stmt(db,'UPDATE admin SET username=?,password_hash=? WHERE id=1',username,hash));
        changed.admin={username};
      }
      if(writes.length) await db.batch(writes);
      try {
        const doomed=[];
        const np=changed.profile,op=oldDocs.profile||{};
        if(np) {
          if('gambar'in np&&op.gambar&&op.gambar!==np.gambar) doomed.push(op.gambar);
          if(Array.isArray(np.sijil)) for(const s of op.sijil||[]) if(!np.sijil.includes(s)) doomed.push(s);
        }
        const ns=changed.settings,os=oldDocs.settings||{};
        if(ns) for(const k of ['logo','qr_bank','qr_tng']) if(k in ns&&os[k]&&os[k]!==ns[k]) doomed.push(os[k]);
        if(doomed.length) background(cleanupRepoPaths(db,doomed));
      } catch {}
      return json({ok:true,changed});
    }
    const match=/^\/api\/admin\/(products|testimonials|categories)(?:\/([^/]+))?$/.exec(path);
    if(match) {
      const kind=match[1],id=match[2]?decodeURIComponent(match[2]):null;
      if(kind==='categories') {
        if(method==='DELETE'&&id) {const r=await stmt(db,'DELETE FROM categories WHERE nama=?',id).run();return json({ok:!!r.meta.changes});}
        const nama=text(b.nama,80).trim();if(!nama) return fail('nama_kategori_diperlukan');
        if(method==='POST'&&!id) await stmt(db,'INSERT OR IGNORE INTO categories VALUES(?)',nama).run();
        else if(method==='PUT'&&id) {
          if(!await stmt(db,'SELECT 1 FROM categories WHERE nama=?',id).first()) return json({ok:false});
          if(id!==nama) await db.batch([stmt(db,'INSERT OR IGNORE INTO categories VALUES(?)',nama),stmt(db,'DELETE FROM categories WHERE nama=?',id),stmt(db,'UPDATE products SET kategori=? WHERE kategori=?',nama,id)]);
        } else return fail('method_tidak_sah',405);
        const cats=await db.prepare('SELECT nama FROM categories ORDER BY rowid').all();return json({ok:true,categories:cats.results.map(c=>c.nama)});
      }
      if(method==='DELETE'&&id) {
        let doomed='';
        if(kind==='products') { try { doomed=(await stmt(db,'SELECT gambar FROM products WHERE id=?',id).first())?.gambar||''; } catch {} }
        const r=await stmt(db,`DELETE FROM ${kind} WHERE id=?`,id).run();
        if(doomed) background(cleanupRepoPaths(db,[doomed]));
        return json({ok:!!r.meta.changes});
      }
      if(method==='POST'&&!id) {
        const item={id:(kind==='products'?'p':'t')+crypto.randomUUID().replaceAll('-',''),...cleanItem(kind,b)};
        if(kind==='products') item.likes=10+crypto.getRandomValues(new Uint32Array(1))[0]%90;
        await insertItem(db,kind,item).run();return json({ok:true,item});
      }
      if(method==='PUT'&&id) {
        const patch=cleanItem(kind,b,true),keys=Object.keys(patch);
        let oldGambar='';
        if(kind==='products'&&'gambar'in patch) { try { oldGambar=(await stmt(db,'SELECT gambar FROM products WHERE id=?',id).first())?.gambar||''; } catch {} }
        const changed=keys.length?await stmt(db,`UPDATE ${kind} SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=? AND (${keys.map(k=>`${k} IS NOT ?`).join(' OR ')}) RETURNING *`,...Object.values(patch),id,...Object.values(patch)).first():null;
        const item=changed||await stmt(db,`SELECT * FROM ${kind} WHERE id=?`,id).first();
        if(item&&oldGambar&&item.gambar!==oldGambar) background(cleanupRepoPaths(db,[oldGambar]));
        return item?json({ok:true,item}):fail('item_tidak_jumpa',404);
      }
    }
    return fail('endpoint_tidak_wujud',404);
  } catch(error) {
    if(/^(medan_|url_|sheet_|.*_tidak_sah$|id_berulang$|payload_terlalu_besar$)/.test(error.message)) return fail(error.message);
    console.error(JSON.stringify({event:'api_error',path,method,name:error.name}));
    return fail('server_error',500);
  }
}
