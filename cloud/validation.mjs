export const tracks = ['visit', 'product', 'demo', 'whatsapp'];
export const socialKeys = ['whatsapp', 'tiktok', 'threads', 'facebook', 'instagram', 'linkedin', 'youtube'];
export const text = (v, cap = 500) => String(v ?? '').slice(0, cap);
export const integer = (v, fallback = 0) => Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback;
export const object = v => v && typeof v === 'object' && !Array.isArray(v);
export function cleanItem(kind, body, partial = false) {
  const fields = kind === 'products' ? { nama: 120, gambar: 500, penerangan: 2000, kategori: 80, demo: 500 } : { nama: 80, komen: 1000, link: 500 };
  const out = {};
  for (const [k, cap] of Object.entries(fields)) if (!partial || k in body) out[k] = text(body[k], cap);
  if (kind === 'testimonials' && (!partial || 'rating' in body)) out.rating = Math.max(1, Math.min(5, integer(body.rating, 5)));
  for (const k of kind === 'products' ? ['nama', 'kategori'] : ['nama', 'komen']) if ((!partial || k in body) && !out[k].trim()) throw new Error(`medan_${k}_diperlukan`);
  for (const k of ['gambar', 'demo', 'link']) if (out[k] && !/^(https?:\/\/|\/?(?:uploads|image|images)\/)/i.test(out[k])) throw new Error(`url_${k}_tidak_sah`);
  return out;
}
export function cleanImport(body) {
  for (const k of ['products','categories','testimonials','profile','socials','settings','analytics']) if (!(k in body)) throw new Error(`sheet_${k}_tiada`);
  for (const k of ['products','categories','testimonials']) if (!Array.isArray(body[k])) throw new Error(`${k}_tidak_sah`);
  for (const k of ['profile','socials','settings','analytics']) if (!object(body[k])) throw new Error(`${k}_tidak_sah`);
  const clean = {};
  for (const kind of ['products','testimonials']) {
    const seen = new Set();
    clean[kind] = body[kind].map(p => {
      if (!object(p)) throw new Error(`${kind}_tidak_sah`);
      const id = text(p.id || crypto.randomUUID(), 64);
      if (seen.has(id)) throw new Error('id_berulang');
      seen.add(id);
      return { id, ...cleanItem(kind, p), ...(kind === 'products' ? { likes: Math.max(0, integer(p.likes)) } : {}) };
    });
  }
  clean.categories = [...new Set(body.categories.map(x => text(x, 80).trim()).filter(Boolean))];
  clean.profile = {};
  for (const [k, cap] of Object.entries({nama:120,biodata:500,penerangan:2000,gambar:500})) clean.profile[k] = text(body.profile[k],cap);
  const kep = body.profile.kepakaran || [];
  if (!Array.isArray(kep) && typeof kep !== 'string') throw new Error('kepakaran_tidak_sah');
  clean.profile.kepakaran = (typeof kep === 'string' ? kep.split(';') : kep).map(x=>text(x,80)).filter(Boolean).slice(0,20);
  clean.socials = Object.fromEntries(socialKeys.map(k=>[k,text(body.socials[k])]));
  clean.settings = Object.fromEntries(['logo','whatsapp','header'].map(k=>[k,text(body.settings[k])]));
  const real = body.analytics.real || {}, demo = body.analytics.demo || {};
  const map = v => Object.fromEntries(Object.entries(object(v) ? v : {}).map(([k,n])=>[text(k,64),Math.max(0,integer(n))]));
  clean.analytics = { real: {
    visitors: Math.max(0,integer(real.visitors)), whatsapp_clicks: Math.max(0,integer(real.whatsapp_clicks)),
    product_clicks: map(real.product_clicks), demo_clicks: map(real.demo_clicks),
    events: (Array.isArray(real.events) ? real.events : []).slice(-5000).filter(e=>object(e)&&tracks.includes(e.jenis)).map(e=>({t:text(e.t,32),jenis:e.jenis,...(e.produk?{produk:text(e.produk,64)}:{})}))
  }, demo: {
    label:text(demo.label || 'demo',16),nota:text(demo.nota),
    ...Object.fromEntries(['visitors','product_clicks_total','demo_clicks_total','whatsapp_clicks'].map(k=>[k,Math.max(0,integer(demo[k]))])),
    daily:(Array.isArray(demo.daily)?demo.daily:[]).slice(-365).filter(object).map(d=>({tarikh:text(d.tarikh,16),pelawat:Math.max(0,integer(d.pelawat)),klik:Math.max(0,integer(d.klik))})),
    top:(Array.isArray(demo.top)?demo.top:[]).slice(0,50).filter(object).map(t=>({produk:text(t.produk,64),klik:Math.max(0,integer(t.klik))}))
  }};
  return clean;
}
