export const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
export const documentWrite = (db, key, value) => stmt(db, 'INSERT INTO documents(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
export function insertItem(db, table, item) {
  const keys = Object.keys(item);
  return stmt(db, `INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`, ...Object.values(item));
}
export async function publicData(db) {
  const results = await db.batch([
    db.prepare('SELECT * FROM products ORDER BY rowid'), db.prepare('SELECT nama FROM categories ORDER BY rowid'),
    db.prepare('SELECT * FROM testimonials ORDER BY rowid'), db.prepare("SELECT key,value FROM documents WHERE key IN ('profile','socials','settings')")
  ]);
  const docs = Object.fromEntries(results[3].results.map(r=>[r.key,JSON.parse(r.value)]));
  return {products:results[0].results,categories:results[1].results.map(r=>r.nama),testimonials:results[2].results,profile:docs.profile||{},socials:docs.socials||{},settings:docs.settings||{}};
}
export async function analyticsData(db) {
  const result = await db.batch([db.prepare('SELECT * FROM counters'), db.prepare('SELECT t,jenis,produk FROM events ORDER BY id'), db.prepare("SELECT value FROM documents WHERE key='demo'")]);
  const real = {visitors:0,whatsapp_clicks:0,product_clicks:{},demo_clicks:{},events:result[1].results.map(e=>({t:e.t,jenis:e.jenis,...(e.produk?{produk:e.produk}:{})}))};
  for(const c of result[0].results) {
    if(c.jenis==='visit') real.visitors=c.count;
    if(c.jenis==='whatsapp') real.whatsapp_clicks=c.count;
    if(c.jenis==='product') real.product_clicks[c.produk]=c.count;
    if(c.jenis==='demo') real.demo_clicks[c.produk]=c.count;
  }
  return {real,demo:JSON.parse(result[2].results[0]?.value || '{}')};
}
export function summary(real, products) {
  const daily={},monthly={},scores={};
  for(const map of [real.product_clicks,real.demo_clicks]) for(const [id,n] of Object.entries(map)) scores[id]=(scores[id]||0)+n;
  for(const e of real.events) {
    const day=e.t.slice(0,10),month=day.slice(0,7);
    if(day.length!==10) continue;
    daily[day] ||= {tarikh:day,pelawat:0,klik:0,demo:0,whatsapp:0};
    monthly[month] ||= {bulan:month,pelawat:0,klik:0};
    daily[day][{visit:'pelawat',product:'klik',demo:'demo',whatsapp:'whatsapp'}[e.jenis]]++;
    monthly[month][e.jenis==='visit'?'pelawat':'klik']++;
  }
  const names=Object.fromEntries(products.map(p=>[p.id,p.nama]));
  const top10=Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([produk,klik])=>({produk,nama:names[produk]||produk,klik}));
  return {visitors:real.visitors,whatsapp_clicks:real.whatsapp_clicks,product_clicks_total:Object.values(real.product_clicks).reduce((a,b)=>a+b,0),demo_clicks_total:Object.values(real.demo_clicks).reduce((a,b)=>a+b,0),popular:top10[0]||null,top10,daily:Object.keys(daily).sort().slice(-30).map(k=>daily[k]),monthly:Object.keys(monthly).sort().slice(-12).map(k=>monthly[k]),events_count:real.events.length};
}
export function importStatements(db, data) {
  const out=['products','categories','testimonials','counters','events'].map(t=>db.prepare(`DELETE FROM ${t}`));
  for(const kind of ['products','testimonials']) for(const item of data[kind]) out.push(insertItem(db,kind,item));
  for(const name of data.categories) out.push(stmt(db,'INSERT INTO categories VALUES(?)',name));
  for(const key of ['profile','socials','settings']) out.push(documentWrite(db,key,data[key]));
  out.push(documentWrite(db,'demo',data.analytics.demo));
  const real=data.analytics.real;
  out.push(stmt(db,"INSERT INTO counters VALUES('visit','',?)",real.visitors),stmt(db,"INSERT INTO counters VALUES('whatsapp','',?)",real.whatsapp_clicks));
  for(const [jenis,map] of [['product',real.product_clicks],['demo',real.demo_clicks]]) for(const [id,n] of Object.entries(map)) out.push(stmt(db,'INSERT INTO counters VALUES(?,?,?)',jenis,id,n));
  for(const e of real.events) out.push(stmt(db,'INSERT INTO events(t,jenis,produk) VALUES(?,?,?)',e.t,e.jenis,e.produk||''));
  return out;
}

export async function analyticsSummary(db) {
  // Dashboard does not load the 5,000-event export payload.
  const results = await db.batch([
    db.prepare("SELECT jenis,SUM(count) AS total FROM counters GROUP BY jenis"),
    db.prepare("SELECT c.produk,COALESCE(p.nama,c.produk) AS nama,SUM(c.count) AS klik FROM counters c LEFT JOIN products p ON p.id=c.produk WHERE c.jenis IN ('product','demo') GROUP BY c.produk ORDER BY klik DESC LIMIT 10"),
    db.prepare("SELECT substr(t,1,10) AS tarikh,SUM(jenis='visit') AS pelawat,SUM(jenis='product') AS klik,SUM(jenis='demo') AS demo,SUM(jenis='whatsapp') AS whatsapp FROM events GROUP BY tarikh ORDER BY tarikh DESC LIMIT 30"),
    db.prepare("SELECT substr(t,1,7) AS bulan,SUM(jenis='visit') AS pelawat,SUM(jenis!='visit') AS klik FROM events GROUP BY bulan ORDER BY bulan DESC LIMIT 12"),
    db.prepare('SELECT COUNT(*) AS total FROM events'),
    db.prepare("SELECT value FROM documents WHERE key='demo'")
  ]);
  const totals=Object.fromEntries(results[0].results.map(r=>[r.jenis,r.total]));
  const top10=results[1].results;
  return {real:{visitors:totals.visit||0,product_clicks_total:totals.product||0,demo_clicks_total:totals.demo||0,whatsapp_clicks:totals.whatsapp||0,popular:top10[0]||null,top10,daily:results[2].results.reverse(),monthly:results[3].results.reverse(),events_count:results[4].results[0].total},demo:JSON.parse(results[5].results[0]?.value||'{}')};
}
