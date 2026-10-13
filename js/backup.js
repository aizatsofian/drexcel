/* Backup Data: export/import Excel (.xlsx) via SheetJS CDN.
Export Data (kandungan): Produk, Kategori, Testimoni, Profil, Socmed, Tetapan.
Export Analisis: Ringkasan, KlikProduk, KlikDemo, Events, DemoHarian, DemoTop.
Import pintar: baca sheet yang ada dalam fail — fail data ganti kandungan
sahaja, fail analisis ganti analytics sahaja, fail penuh ganti semua.
Format sheet (wajib sama untuk import):
  Produk: id, nama, gambar, penerangan, kategori, demo, likes, harga_sebelum, harga_selepas
  Kategori: nama
  Testimoni: id, nama, rating, komen, link
  Profil: nama, biodata, kepakaran (pisah ";"), penerangan, gambar, link, sijil (pisah ";")
  Socmed: platform, url
  Tetapan: tetapan, nilai (logo, whatsapp, header, bank_nama, bank_no, bank_penama, qr_bank, qr_tng, steps)
  Ringkasan: metrik, nilai (visitors, whatsapp_clicks, demo_*)
  KlikProduk / KlikDemo: produk, klik
  Events: t, jenis, produk
  DemoHarian: tarikh, pelawat, klik
  DemoTop: produk, klik
Kredensial admin tidak diexport dan tidak disentuh import.
*/
const SOCMED_ORDER = ["whatsapp", "tiktok", "telegram", "threads", "facebook", "instagram", "linkedin", "youtube", "other"];
const SETTING_ORDER = ["logo", "whatsapp", "header", "bank_nama", "bank_no", "bank_penama", "qr_bank", "qr_tng", "steps"];
const DATA_SHEETS = ["Produk", "Kategori", "Testimoni", "Profil", "Socmed", "Tetapan"];
const ANA_SHEETS = ["Ringkasan", "KlikProduk", "KlikDemo", "Events", "DemoHarian", "DemoTop"];

function needXLSX() {
  if (window.XLSX) return true;
  toast("Library Excel gagal dimuat. Perlu sambungan internet (CDN).", "err");
  return false;
}
function rowsOf(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
}
function num(v, fb) {
  const n = Number(v);
  return Number.isFinite(n) ? n : (fb || 0);
}
function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function buildDataWorkbook(d) {
  const wb = XLSX.utils.book_new();
  const add = (name, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  add("Produk", [
    ["id", "nama", "gambar", "penerangan", "kategori", "demo", "likes", "harga_sebelum", "harga_selepas"],
    ...(d.products || []).map((p) => [p.id, p.nama, p.gambar, p.penerangan, p.kategori, p.demo, p.likes, p.harga_sebelum || 0, p.harga_selepas || 0]),
  ]);
  add("Kategori", [["nama"], ...(d.categories || []).map((c) => [c])]);
  add("Testimoni", [
    ["id", "nama", "rating", "komen", "link"],
    ...(d.testimonials || []).map((t) => [t.id, t.nama, t.rating, t.komen, t.link || ""]),
  ]);
  const pr = d.profile || {};
  add("Profil", [
    ["nama", "biodata", "kepakaran", "penerangan", "gambar", "link", "sijil"],
    [pr.nama, pr.biodata, (pr.kepakaran || []).join("; "), pr.penerangan, pr.gambar, pr.link || "", (pr.sijil || []).join("; ")],
  ]);
  const sc = d.socials || {};
  add("Socmed", [["platform", "url"], ...SOCMED_ORDER.map((k) => [k, sc[k] || ""])]);
  const st = d.settings || {};
  add("Tetapan", [["tetapan", "nilai"], ...SETTING_ORDER.map((k) => [k, st[k] || ""])]);
  return wb;
}

function buildAnaWorkbook(d) {
  const wb = XLSX.utils.book_new();
  const add = (name, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  const real = ((d.analytics || {}).real) || {};
  const demo = ((d.analytics || {}).demo) || {};
  add("Ringkasan", [
    ["metrik", "nilai"],
    ["visitors", real.visitors || 0],
    ["whatsapp_clicks", real.whatsapp_clicks || 0],
    ["demo_label", demo.label || "demo"],
    ["demo_nota", demo.nota || ""],
    ["demo_visitors", demo.visitors || 0],
    ["demo_product_clicks_total", demo.product_clicks_total || 0],
    ["demo_demo_clicks_total", demo.demo_clicks_total || 0],
    ["demo_whatsapp_clicks", demo.whatsapp_clicks || 0],
  ]);
  add("KlikProduk", [["produk", "klik"], ...Object.entries(real.product_clicks || {})]);
  add("KlikDemo", [["produk", "klik"], ...Object.entries(real.demo_clicks || {})]);
  add("Events", [
    ["t", "jenis", "produk"],
    ...(real.events || []).map((e) => [e.t, e.jenis, e.produk || ""]),
  ]);
  add("DemoHarian", [
    ["tarikh", "pelawat", "klik"],
    ...(demo.daily || []).map((x) => [x.tarikh, x.pelawat, x.klik]),
  ]);
  add("DemoTop", [["produk", "klik"], ...(demo.top || []).map((x) => [x.produk, x.klik])]);
  return wb;
}

function parseContent(wb) {
  const byHeader = (name) => {
    const rows = rowsOf(wb.Sheets[name]);
    const head = rows[0] || [];
    return rows.slice(1).map((r) => {
      const o = {};
      head.forEach((h, i) => { o[String(h)] = r[i]; });
      return o;
    });
  };
  const products = byHeader("Produk").map((o) => ({
    id: String(o.id || ""), nama: String(o.nama || ""), gambar: String(o.gambar || ""),
    penerangan: String(o.penerangan || ""), kategori: String(o.kategori || ""),
    demo: String(o.demo || ""), likes: num(o.likes),
    harga_sebelum: num(o.harga_sebelum), harga_selepas: num(o.harga_selepas),
  }));
  const categories = rowsOf(wb.Sheets["Kategori"]).slice(1).map((r) => String(r[0] || "").trim()).filter(Boolean);
  const testimonials = byHeader("Testimoni").map((o) => ({
    id: String(o.id || ""), nama: String(o.nama || ""),
    rating: num(o.rating, 5), komen: String(o.komen || ""), link: String(o.link || ""),
  }));
  const prRow = byHeader("Profil")[0] || {};
  const profile = {
    nama: String(prRow.nama || ""), biodata: String(prRow.biodata || ""),
    kepakaran: String(prRow.kepakaran || "").split(";").map((x) => x.trim()).filter(Boolean),
    penerangan: String(prRow.penerangan || ""), gambar: String(prRow.gambar || ""),
    link: String(prRow.link || ""),
    sijil: String(prRow.sijil || "").split(";").map((x) => x.trim()).filter(Boolean),
  };
  const socials = {};
  byHeader("Socmed").forEach((o) => {
    const k = String(o.platform || "").trim();
    if (SOCMED_ORDER.includes(k)) socials[k] = String(o.url || "");
  });
  const settings = {};
  byHeader("Tetapan").forEach((o) => {
    const k = String(o.tetapan || "").trim();
    if (SETTING_ORDER.includes(k)) settings[k] = String(o.nilai ?? "");
  });
  return { products, categories, testimonials, profile, socials, settings };
}

function parseAnalytics(wb) {
  const byHeader = (name) => {
    const rows = rowsOf(wb.Sheets[name]);
    const head = rows[0] || [];
    return rows.slice(1).map((r) => {
      const o = {};
      head.forEach((h, i) => { o[String(h)] = r[i]; });
      return o;
    });
  };
  const ring = {};
  if (wb.Sheets["Ringkasan"]) byHeader("Ringkasan").forEach((o) => { ring[String(o.metrik || "")] = o.nilai; });
  const clickMap = (name) => {
    const m = {};
    (wb.Sheets[name] ? byHeader(name) : []).forEach((o) => {
      const k = String(o.produk || "").trim();
      if (k) m[k] = num(o.klik);
    });
    return m;
  };
  const events = (wb.Sheets["Events"] ? byHeader("Events") : []).map((o) => {
    const ev = { t: String(o.t || ""), jenis: String(o.jenis || "") };
    if (String(o.produk || "").trim()) ev.produk = String(o.produk).trim();
    return ev;
  });
  const daily = (wb.Sheets["DemoHarian"] ? byHeader("DemoHarian") : []).map((o) => ({
    tarikh: String(o.tarikh || ""), pelawat: num(o.pelawat), klik: num(o.klik),
  }));
  const top = (wb.Sheets["DemoTop"] ? byHeader("DemoTop") : []).map((o) => ({
    produk: String(o.produk || ""), klik: num(o.klik),
  }));
  return {
    real: {
      visitors: num(ring.visitors), product_clicks: clickMap("KlikProduk"),
      demo_clicks: clickMap("KlikDemo"), whatsapp_clicks: num(ring.whatsapp_clicks), events,
    },
    demo: {
      label: String(ring.demo_label || "demo"), nota: String(ring.demo_nota || ""),
      visitors: num(ring.demo_visitors), product_clicks_total: num(ring.demo_product_clicks_total),
      demo_clicks_total: num(ring.demo_demo_clicks_total), whatsapp_clicks: num(ring.demo_whatsapp_clicks),
      daily, top,
    },
  };
}

// Import pintar: kembalikan {content, analytics} — null bagi bahagian tiada dalam fail.
function parseWorkbook(wb) {
  const has = (names) => names.some((s) => wb.Sheets[s]);
  const hasContent = has(DATA_SHEETS), hasAna = has(ANA_SHEETS);
  if (!hasContent && !hasAna) throw new Error("Tiada sheet dikenal. Guna fail hasil Export.");
  if (hasContent) {
    for (const s of DATA_SHEETS) {
      if (!wb.Sheets[s]) throw new Error("Sheet '" + s + "' tiada dalam fail data.");
    }
  }
  return {
    content: hasContent ? parseContent(wb) : null,
    analytics: hasAna ? parseAnalytics(wb) : null,
  };
}

async function downloadAdminData() {
  const r = await API.adminData();
  if (!r || !r.ok) throw new Error("gagal muat");
  return r.data;
}

document.getElementById("exportDataBtn").addEventListener("click", async () => {
  if (!needXLSX()) return;
  showLoader(true);
  try {
    XLSX.writeFile(buildDataWorkbook(await downloadAdminData()), `data-website-${stamp()}.xlsx`);
    toast("Fail Excel data dimuat turun", "ok");
  } catch { toast("Export gagal", "err"); }
  showLoader(false);
});

document.getElementById("exportAnaBtn").addEventListener("click", async () => {
  if (!needXLSX()) return;
  showLoader(true);
  try {
    XLSX.writeFile(buildAnaWorkbook(await downloadAdminData()), `analisis-website-${stamp()}.xlsx`);
    toast("Fail Excel analisis dimuat turun", "ok");
  } catch { toast("Export gagal", "err"); }
  showLoader(false);
});

document.getElementById("importBtn").addEventListener("click", () => {
  if (!needXLSX()) return;
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  let parsed;
  try {
    const buf = await f.arrayBuffer();
    parsed = parseWorkbook(XLSX.read(buf, { type: "array" }));
  } catch (err) {
    toast("Fail tidak sah: " + (err.message || err), "err");
    return;
  }
  const skop = parsed.content && parsed.analytics ? "SEMUA data"
    : parsed.content ? `DATA sahaja (${parsed.content.products.length} produk)` : "ANALISIS sahaja";
  if (!await confirmDialog(`Import "${f.name}" akan OVERWRITE ${skop} website. Teruskan?`)) return;
  showLoader(true);
  try {
    const cur = await downloadAdminData();
    const payload = {
      products: parsed.content ? parsed.content.products : cur.products,
      categories: parsed.content ? parsed.content.categories : cur.categories,
      testimonials: parsed.content ? parsed.content.testimonials : cur.testimonials,
      profile: parsed.content ? parsed.content.profile : cur.profile,
      socials: parsed.content ? parsed.content.socials : cur.socials,
      settings: parsed.content ? parsed.content.settings : cur.settings,
      analytics: parsed.analytics || cur.analytics,
    };
    const r = await API.importData(payload);
    if (r && r.ok) { await reloadAll(); toast("Import berjaya — data diganti", "ok"); }
    else toast("Import gagal: " + ((r && r.error) || ""), "err");
  } catch { toast("Import gagal", "err"); }
  showLoader(false);
});
