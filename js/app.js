/* App: router + halaman public (Home/Bakul/Testimoni/Tentang/Socmed) */
const S = { data: null, kq: "", kcat: "", cart: [] };
// mod edit admin (toggle via butang Edit di setiap menu)
let TESTI_EDIT_MODE = false;
let SOCMED_EDIT_MODE = false;

try { S.cart = JSON.parse(localStorage.getItem("bakul") || "[]"); } catch { S.cart = []; }
function saveCart() { localStorage.setItem("bakul", JSON.stringify(S.cart)); updateBadge(); }

let LIKED = [];
try { LIKED = JSON.parse(localStorage.getItem("liked") || "[]"); } catch { LIKED = []; }
function isLiked(id) { return LIKED.includes(id); }

function updateBadge() {
  const b = document.getElementById("cartBadge");
  b.textContent = S.cart.length;
  b.classList.toggle("hidden", S.cart.length === 0);
}

// navigasi bawah
document.querySelectorAll("#bottomNav .nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => go(btn.dataset.page));
});
function go(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const el = document.getElementById("page-" + page);
  if (el) el.classList.add("active");
  document.querySelectorAll("#bottomNav .nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  window.scrollTo({ top: 0 });
  if (page === "bakul") renderCart();
  if (page === "tetapan" && typeof loadMiniChart === "function") loadMiniChart();
  updateWaFloat(page);
}
// Butang terapung WhatsApp: public sahaja + perlu nombor Tetapan
function updateWaFloat(page) {
  const btn = document.getElementById("waFloat");
  if (!btn) return;
  const active = document.querySelector("#bottomNav .nav-btn.active");
  const cur = page || (active && active.dataset && active.dataset.page) || "home";
  const no = (S.data && S.data.settings && S.data.settings.whatsapp) || "";
  btn.classList.toggle("hidden", cur === "tetapan" || !no);
}
function openWaFloat() {
  const no = (S.data && S.data.settings && S.data.settings.whatsapp) || "";
  if (!no) { toast("Nombor WhatsApp belum ditetapkan", "err"); return; }
  let msg = "Assalamualaikum Dr Excel. saya nak sistem ... ";
  const items = S.cart.map(findP).filter(Boolean);
  if (items.length) {
    const lines = items.map((p, i) => {
      const b = Number(p.harga_selepas || 0) > 0 ? ` (${fmtRM(p.harga_selepas)})` : "";
      return `${i + 1}. ${p.nama}${b}`;
    });
    msg += "\n" + lines.join("\n");
  }
  API.track("whatsapp");
  window.open(`https://wa.me/${no}?text=${encodeURIComponent(msg)}`, "_blank");
}
// Bar pengumuman: mesej ikut teks bar semasa ("saya nak <teks>")
function openAnnounceWa() {
  const no = (S.data && S.data.settings && S.data.settings.whatsapp) || "";
  if (!no) { toast("Nombor WhatsApp belum ditetapkan", "err"); return; }
  const t = ((S.data && S.data.settings && S.data.settings.pengumuman) || "").trim();
  if (!t) { toast("Tiada pengumuman ditetapkan", "err"); return; }
  API.track("whatsapp");
  window.open(`https://wa.me/${no}?text=${encodeURIComponent("saya nak " + t)}`, "_blank");
}

async function init() {
  updateBadge();
  document.getElementById("homeLoading").classList.remove("hidden");
  await reloadAll();
  document.getElementById("homeLoading").classList.add("hidden");

  document.getElementById("hSearch").addEventListener("input", (e) => { S.kq = e.target.value.toLowerCase(); renderHome(); });
  document.getElementById("hCat").addEventListener("change", (e) => { S.kcat = e.target.value; renderHome(); });
  document.getElementById("hantarBtn").addEventListener("click", sendHantar);
  document.getElementById("bayarTutupBtn").addEventListener("click", () => document.getElementById("bayarModal").classList.add("hidden"));
  document.getElementById("bayarModal").addEventListener("click", (e) => {
    if (e.target.id === "bayarModal") e.target.classList.add("hidden");
  });
  document.getElementById("bayarTransferBtn").addEventListener("click", () => openBayar("transfer"));
  document.getElementById("bayarQrBankBtn").addEventListener("click", () => openBayar("qrbank"));
  document.getElementById("bayarQrTngBtn").addEventListener("click", () => openBayar("qrtng"));
  document.getElementById("sijilModal").addEventListener("click", (e) => {
    if (e.target.id === "sijilModal") e.target.classList.add("hidden");
  });
  document.getElementById("stepEditBtn").addEventListener("click", () => {
    const st = (S.data && S.data.settings) || {};
    document.getElementById("stepText").value = st.steps || "";
    document.getElementById("stepEditBox").classList.remove("hidden");
  });
  document.getElementById("stepCancelBtn").addEventListener("click", () => document.getElementById("stepEditBox").classList.add("hidden"));
  document.getElementById("stepSaveBtn").addEventListener("click", async () => {
    const steps = document.getElementById("stepText").value;
    showLoader(true);
    const r = await API.saveSettings({ steps });
    showLoader(false);
    if (r && r.ok) {
      document.getElementById("stepEditBox").classList.add("hidden");
      await reloadAll(); toast("Step disimpan", "ok");
    } else toast("Gagal simpan step", "err");
  });
  document.getElementById("clearCartBtn").addEventListener("click", async () => {    if (!S.cart.length) return;
    if (await confirmDialog("Kosongkan semua bakul?")) { S.cart = []; saveCart(); renderCart(); toast("Bakul dikosongkan", "ok"); }
  });
  // Butang terapung WhatsApp (ikon SVG sama seperti grid Socmed)
  const waBtn = document.getElementById("waFloat");
  if (waBtn) {
    try { waBtn.innerHTML = SOCMED_SVG.whatsapp || ""; } catch { waBtn.textContent = "WA"; }
    waBtn.addEventListener("click", openWaFloat);
  }
  // Bar pengumuman: klik buka WA dengan mesej ikut teks bar, X tutup sesi semasa
  const annBar = document.getElementById("announceBar");
  if (annBar) annBar.addEventListener("click", (e) => {
    if (e.target && e.target.id === "announceClose") return;
    openAnnounceWa();
  });
  const annClose = document.getElementById("announceClose");
  if (annClose) annClose.addEventListener("click", (e) => {
    e.stopPropagation();
    try { sessionStorage.setItem("announceHide", "1"); } catch {}
    document.getElementById("announceBar").classList.add("hidden");
  });
  // Nota bakul: local sahaja (localStorage["nota"]), dihantar dalam mesej WA checkout
  try {
    const savedNota = localStorage.getItem("nota") || "";
    if (document.getElementById("notaText")) document.getElementById("notaText").value = savedNota;
  } catch {}
  const notaEl = document.getElementById("notaText");
  if (notaEl) notaEl.addEventListener("input", (e) => {
    try { localStorage.setItem("nota", e.target.value); } catch {}
  });
  // tutup popup produk dengan klik luar kotak (butang Tutup dibuang)
  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") e.target.classList.add("hidden");
  });
}

async function reloadAll(force = false) {
  try {
    const r = await API.data(force);
    S.data = r.data;
    applyTheme();
    renderHome(); renderTesti(); renderAbout(); renderSocmed(); renderStep();
    updateWaFloat();
    if (typeof renderAdminLists === "function") renderAdminLists();
    if (typeof fillSettingsForm === "function") fillSettingsForm();
  } catch (e) {
    toast("Gagal muat data. Pastikan server berjalan.", "err");
  }
}

function applyTheme() {
  const st = (S.data && S.data.settings) || {};
  const t = document.getElementById("homeTitle");
  if (t) t.textContent = st.header || "Koleksi Dr Excel";
  renderAnnounce();
}
// Bar pengumuman: teks dari settings.pengumuman, kosong = sorok.
// Klik bar buka WA, X tutup untuk sesi semasa sahaja.
function renderAnnounce() {
  const bar = document.getElementById("announceBar");
  const txt = document.getElementById("announceText");
  if (!bar || !txt) return;
  const v = ((S.data && S.data.settings && S.data.settings.pengumuman) || "").trim();
  let dismissed = false;
  try { dismissed = sessionStorage.getItem("announceHide") === "1"; } catch {}
  if (!v || dismissed) { bar.classList.add("hidden"); return; }
  if (txt.textContent !== v) txt.textContent = v;
  bar.classList.remove("hidden");
}
function findP(id) { return (S.data.products || []).find((p) => p.id === id); }

function fmtRM(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  return "RM" + (Math.round(v * 100) / 100).toLocaleString("ms-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function discPct(p) {
  const a = Number(p.harga_sebelum || 0), b = Number(p.harga_selepas || 0);
  if (!(a > 0 && b > 0 && b < a)) return 0;
  return Math.round(((a - b) / a) * 100);
}
function priceRowHTML(p) {
  const a = Number(p.harga_sebelum || 0), b = Number(p.harga_selepas || 0);
  if (!(a > 0 || b > 0)) return "";
  const d = discPct(p);
  const parts = [];
  if (a > 0) parts.push(`<span class="price-old">${fmtRM(a)}</span>`);
  if (d > 0) parts.push(`<span class="price-disc">-${d}%</span>`);
  if (b > 0) parts.push(`<span class="price-new">${fmtRM(b)}</span>`);
  return `<div class="price-row">${parts.join("")}</div>`;
}

function productCard(p) {
  const likes = Number(p.likes || 0);
  return `
    <div class="card" data-id="${esc(p.id)}">
      <div class="card-img">
        <img src="${esc(p.gambar || "")}" alt="${esc(p.nama)}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${esc(p.id)}/600/400'">
        <span class="badge-cat">${esc(p.kategori || "")}</span>
        <span class="badge-like${isLiked(p.id) ? " liked" : ""}" data-like="${esc(p.id)}" title="Like">❤️ <b>${likes}</b></span>
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.nama)}</div>
        ${priceRowHTML(p)}
        <div class="card-actions">
          <button class="btn" data-act="demo">Video</button>
          <button class="btn" data-act="demowa">Demo</button>
          <button class="btn primary" data-act="bakul">+ Bakul</button>
        </div>
      </div>
    </div>`;
}
function bindCards(grid) {
  grid.querySelectorAll(".card").forEach((card) => {
    const id = card.dataset.id;
    card.addEventListener("click", (e) => {
      const likeEl = e.target.closest && e.target.closest("[data-like]");
      if (likeEl) { likeProduct(likeEl.dataset.like, likeEl); e.stopPropagation(); return; }
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "demo") { openDemo(id, e); return; }
      if (act === "demowa") { openDemoWa(id, e); return; }
      if (act === "bakul") { addCart(id); e.stopPropagation(); return; }
      openDetail(id);
    });
  });
}

async function likeProduct(id, badgeEl) {
  if (isLiked(id)) { toast("Anda sudah like produk ini", "ok"); return; }
  const r = await API.like(id).catch(() => ({}));
  if (r && r.ok) {
    LIKED.push(id);
    try { localStorage.setItem("liked", JSON.stringify(LIKED)); } catch {}
    const p = findP(id);
    if (p) p.likes = r.likes;
    badgeEl.classList.add("liked");
    badgeEl.querySelector("b").textContent = r.likes;
    toast("Terima kasih atas like!", "ok");
  } else toast("Gagal like", "err");
}

function renderHome() {
  const cats = S.data.categories || [];
  const sel = document.getElementById("hCat");
  if (sel) {
    const cur = S.kcat || "";
    sel.innerHTML = `<option value="">Semua Kategori</option>` + cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.value = cats.includes(cur) ? cur : "";
    S.kcat = sel.value;
  }
  const logo = document.getElementById("homeLogo");
  if (logo) {
    const src = (S.data.settings && S.data.settings.logo) || "";
    if (src && logo.getAttribute("src") !== src) { logo.classList.remove("hidden"); logo.src = src; }
    if (!src) { logo.classList.add("hidden"); document.getElementById("homeLogoFb").classList.remove("hidden"); }
  }
  let list = [...(S.data.products || [])];
  if (S.kcat) list = list.filter((p) => p.kategori === S.kcat);
  if (S.kq) list = list.filter((p) => (p.nama + " " + p.penerangan + " " + p.kategori).toLowerCase().includes(S.kq));
  const g = document.getElementById("productGrid");
  document.getElementById("homeEmpty").classList.toggle("hidden", list.length > 0);
  g.innerHTML = list.map(productCard).join("");
  bindCards(g);
}

function openDemo(id, e) {
  e.stopPropagation();
  const p = findP(id);
  if (!p || !p.demo) { toast("Link demo tiada", "err"); return; }
  API.track("demo", id);
  window.open(p.demo, "_blank");
}
// Butang Demo di kad/detail: buka WA admin dengan teks "saya nak demo <nama sistem>"
function openDemoWa(id, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const p = findP(id);
  if (!p) { toast("Produk tiada", "err"); return; }
  const no = (S.data && S.data.settings && S.data.settings.whatsapp) || "";
  if (!no) { toast("Nombor WhatsApp belum ditetapkan", "err"); return; }
  API.track("whatsapp");
  window.open(`https://wa.me/${no}?text=${encodeURIComponent("saya nak demo " + (p.nama || ""))}`, "_blank");
}
function addCart(id) {
  if (!S.cart.includes(id)) S.cart.push(id);
  saveCart();
  API.track("product", id);
  toast("Ditambah ke bakul", "ok");
}
function openDetail(id) {
  const p = findP(id);
  if (!p) return;
  API.track("product", id);
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  const cats = (S.data.categories || []).map((c) => `<option${c === p.kategori ? " selected" : ""}>${esc(c)}</option>`).join("");
  const likes = Number(p.likes || 0);
  document.getElementById("detailBody").innerHTML = `
    <div class="detail-img-wrap">
      <img class="detail" id="dImg" src="${esc(p.gambar || "")}" onerror="this.src='https://picsum.photos/seed/${esc(p.id)}/600/400'">
      <span class="badge-cat" id="dCatBadge">${esc(p.kategori || "")}</span>
      <span class="badge-like" id="dLike">❤️ <b>${likes}</b></span>
      ${isAdmin ? `<button class="btn small img-tukar hidden" id="eTukarBtn" type="button">Tukar</button>` : ""}
    </div>
    <div id="dView">
      <h3 style="text-align:center">${esc(p.nama)}</h3>
      ${priceRowHTML(p)}
      <p>${esc(p.penerangan || "")}</p>
    </div>
    <div id="dEdit" class="hidden">
      <input id="eNama" value="${esc(p.nama)}" placeholder="Nama produk" style="margin-top:8px">
      <div class="row" style="margin-top:8px"><select id="eKategori">${cats}</select></div>
      <textarea id="ePenerangan" rows="3" style="margin-top:8px" placeholder="Description">${esc(p.penerangan || "")}</textarea>
      <div class="row" style="margin-top:8px">
        <input id="eHargaSebelum" type="number" min="0" step="0.01" value="${Number(p.harga_sebelum || 0) || ""}" placeholder="Harga sebelum (RM)">
        <input id="eHargaSelepas" type="number" min="0" step="0.01" value="${Number(p.harga_selepas || 0) || ""}" placeholder="Harga selepas (RM)">
      </div>
      <input id="eDemo" value="${esc(p.demo || "")}" placeholder="Link video produk https://..." style="margin-top:8px">
      <input id="eGambar" value="${esc(p.gambar || "")}" type="hidden">
      <input id="eFile" type="file" accept=".png,.jpg,.jpeg,.webp,.gif" class="hidden">
    </div>
    <div class="row" id="dViewActions">
      <button class="btn" id="dDemo">Video</button>
      <button class="btn" id="dDemoWa">Demo</button>
      <button class="btn primary" id="dBakul">+ Bakul</button>
    </div>
    ${isAdmin ? `
    <div class="row" style="margin-top:8px">
      <button class="btn" id="dEditBtn">Edit</button>
    </div>
    <div class="row hidden" id="dAdminRow" style="margin-top:8px">
      <button class="btn" id="eCancelBtn">Batal</button>
      <button class="btn primary" id="eSaveBtn">Simpan</button>
      <button class="btn danger" id="eDelBtn">Padam</button>
    </div>` : ""}`;
  document.getElementById("detailModal").classList.remove("hidden");
  document.getElementById("dDemo").addEventListener("click", (e) => openDemo(id, e));
  document.getElementById("dDemoWa").addEventListener("click", (e) => openDemoWa(id, e));
  document.getElementById("dBakul").addEventListener("click", () => addCart(id));
  const likeEl = document.getElementById("dLike");
  if (likeEl) likeEl.addEventListener("click", () => likeProduct(id, likeEl));
  if (isAdmin) {
    const editBox = document.getElementById("dEdit");
    const viewBox = document.getElementById("dView");
    const viewActions = document.getElementById("dViewActions");
    const adminRow = document.getElementById("dAdminRow");
    const editBtn = document.getElementById("dEditBtn");
    const tukarBtn = document.getElementById("eTukarBtn");
    const catBadge = document.getElementById("dCatBadge");
    let editing = false;
    const setEditing = (v) => {
      editing = v;
      editBox.classList.toggle("hidden", !editing);
      viewBox.classList.toggle("hidden", editing);
      viewActions.classList.toggle("hidden", editing);
      adminRow.classList.toggle("hidden", !editing);
      editBtn.classList.toggle("hidden", editing);
      if (tukarBtn) tukarBtn.classList.toggle("hidden", !editing);
      if (catBadge) catBadge.classList.toggle("hidden", editing);
      if (likeEl) likeEl.classList.toggle("hidden", editing);
    };
    editBtn.addEventListener("click", () => setEditing(true));
    document.getElementById("eCancelBtn").addEventListener("click", () => {
      // Batal: pulihkan preview ke gambar asal, fail preview jadi orphan (dibiarkan)
      document.getElementById("eGambar").value = p.gambar || "";
      document.getElementById("dImg").src = p.gambar || "";
      setEditing(false);
    });
    document.getElementById("eTukarBtn").addEventListener("click", () => document.getElementById("eFile").click());
    document.getElementById("eFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      showLoader(true);
      const r = await API.upload(f);
      showLoader(false);
      if (r && r.ok) {
        // Preview sahaja; gambar lama hanya dipadam selepas Simpan (server, refcount selamat)
        document.getElementById("eGambar").value = r.path;
        document.getElementById("dImg").src = r.path;
        toast("Preview gambar baharu. Tekan Simpan untuk ganti.", "ok");
      } else toast("Upload gagal", "err");
    });
    document.getElementById("eSaveBtn").addEventListener("click", async () => {
      const body = {
        nama: document.getElementById("eNama").value.trim(),
        kategori: document.getElementById("eKategori").value,
        penerangan: document.getElementById("ePenerangan").value.trim(),
        gambar: document.getElementById("eGambar").value.trim(),
        demo: document.getElementById("eDemo").value.trim(),
        harga_sebelum: Number(document.getElementById("eHargaSebelum").value || 0),
        harga_selepas: Number(document.getElementById("eHargaSelepas").value || 0),
      };
      if (!body.nama || !body.kategori) { toast("Nama & kategori diperlukan", "err"); return; }
      showLoader(true);
      const r = await API.updProduct(id, body);
      showLoader(false);
      if (r && r.ok) {
        document.getElementById("detailModal").classList.add("hidden");
        await reloadAll(); toast("Produk dikemaskini", "ok");
      } else toast("Gagal simpan", "err");
    });
    document.getElementById("eDelBtn").addEventListener("click", async () => {
      document.getElementById("detailModal").classList.add("hidden");
      if (typeof delProduct === "function") await delProduct(id);
    });
  }
}

function renderCart() {
  const box = document.getElementById("cartList");
  const items = S.cart.map(findP).filter(Boolean);
  box.innerHTML = items.length ? items.map((p) => {
    const d = discPct(p);
    const a = Number(p.harga_sebelum || 0), b = Number(p.harga_selepas || 0);
    const harga = (a > 0 || b > 0)
      ? `<div class="cart-prices">${a > 0 ? `<span class="price-old">${fmtRM(a)}</span>` : ""}${d > 0 ? `<span class="price-disc">-${d}%</span>` : ""}${b > 0 ? `<span class="price-new">${fmtRM(b)}</span>` : ""}</div>`
      : "";
    return `<div class="cart-item">
      <img src="${esc(p.gambar || "")}" onerror="this.src='https://picsum.photos/seed/${esc(p.id)}/600/400'">
      <div style="flex:1"><b>${esc(p.nama)}</b><br><small>${esc(p.kategori || "")}</small>${harga}</div>
      <button class="icon-btn" data-del="${esc(p.id)}" title="Buang">🗑️</button>
    </div>`;
  }).join("") : '<p class="empty">Bakul kosong. Tambah produk dari Home.</p>';
  box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    S.cart = S.cart.filter((x) => x !== b.dataset.del);
    saveCart(); renderCart();
  }));
  // Kotak jumlah: total sebelum | % | total selepas, angka ke kanan
  const totalBox = document.getElementById("cartTotal");
  const jumlahCard = document.getElementById("jumlahCard");
  if (totalBox && jumlahCard) {
    if (!items.length) { jumlahCard.classList.add("hidden"); totalBox.innerHTML = ""; }
    else {
      const totA = items.reduce((a, p) => a + Number(p.harga_sebelum || 0), 0);
      const totB = items.reduce((a, p) => a + Number(p.harga_selepas || 0), 0);
      const d = (totA > 0 && totB > 0 && totB < totA) ? Math.round(((totA - totB) / totA) * 100) : 0;
      const hasPrice = totA > 0 || totB > 0;
      jumlahCard.classList.remove("hidden");
      totalBox.innerHTML = hasPrice
        ? `<div class="cart-total-right"><span class="price-old">${totA > 0 ? fmtRM(totA) : "-"}</span>${d > 0 ? `<span class="price-disc">-${d}%</span>` : ""}<b class="price-new">${totB > 0 ? fmtRM(totB) : "-"}</b></div>`
        : `<div class="cart-total-right"><small>Tiada harga ditetapkan</small></div>`;
    }
  }
  renderStep();
}
function renderStep() {
  const st = (S.data && S.data.settings) || {};
  const box = document.getElementById("stepContent");
  if (box) box.textContent = st.steps || "Langkah mendapatkan sistem akan dipaparkan di sini.";
}
// Popup bayar di Bakul: transfer = detail bank, qrbak/qrtng = imej QR
function openBayar(kind) {
  const st = (S.data && S.data.settings) || {};
  const body = document.getElementById("bayarBody");
  if (kind === "transfer") {
    if (!st.bank_nama && !st.bank_no) { toast("Maklumat bank belum ditetapkan", "err"); return; }
    body.innerHTML = `<b>${esc(st.bank_nama || "Bank")}</b><br><small>No akaun: ${esc(st.bank_no || "-")}<br>Penama: ${esc(st.bank_penama || "-")}</small>`;
  } else {
    const src = kind === "qrbank" ? st.qr_bank : st.qr_tng;
    const label = kind === "qrbank" ? "QR Bank" : "QR TnG";
    if (!src) { toast(label + " belum ditetapkan", "err"); return; }
    body.innerHTML = `<img src="${esc(src)}" alt="${label}" style="width:100%;border-radius:12px;border:1px solid var(--line)">`;
  }
  document.getElementById("bayarModal").classList.remove("hidden");
}
function sendHantar() {
  const items = S.cart.map(findP).filter(Boolean);
  if (!items.length) { toast("Bakul kosong", "err"); return; }
  const nama = document.getElementById("coNama").value.trim();
  const wasap = document.getElementById("coWasap").value.trim();
  const email = document.getElementById("coEmail").value.trim();
  const socmed = document.getElementById("coSocmed").value.trim();
  const paid = document.getElementById("bayarDah").checked;
  let nota = "";
  try { nota = ((document.getElementById("notaText") && document.getElementById("notaText").value) || localStorage.getItem("nota") || "").trim(); } catch { nota = (document.getElementById("notaText") && document.getElementById("notaText").value.trim()) || ""; }
  if (!nama || !wasap || !email) { toast("Isi nama, no whatsapp dan email", "err"); return; }
  const no = (S.data.settings && S.data.settings.whatsapp) || "";
  if (!no) { toast("Nombor WhatsApp belum ditetapkan", "err"); return; }
  const lines = items.map((p, i) => {
    const b = Number(p.harga_selepas || 0) > 0 ? ` (${fmtRM(p.harga_selepas)})` : "";
    return `${i + 1}. ${p.nama}${b}`;
  });
  const msg = `nama : ${nama}\nno whatsapp : ${wasap}\nemail : ${email}\nnama socmed : ${socmed || "-"}\nstatus : ${paid ? "saya dah bayar" : "belum bayar"}${nota ? `\nnota : ${nota}` : ""}\n\n${lines.join("\n")}\n\nini bukti bayaran saya`;
  API.track("whatsapp");
  window.open(`https://wa.me/${no}?text=${encodeURIComponent(msg)}`, "_blank");
}

function renderTesti() {
  const box = document.getElementById("testiList");
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  const canEdit = isAdmin && TESTI_EDIT_MODE;
  const addBtn = document.getElementById("addTestiBtn");
  if (addBtn) addBtn.classList.toggle("hidden", !canEdit);
  const editBtn = document.getElementById("testiEditBtn");
  if (editBtn && isAdmin) editBtn.textContent = TESTI_EDIT_MODE ? "Tutup" : "Edit";
  box.innerHTML = (S.data.testimonials || []).map((t) =>
    `<div class="testi"${t.link ? ` data-link="${esc(t.link)}"` : ""}><b>${esc(t.nama)}</b> <span class="stars">${"★".repeat(t.rating || 5)}</span><br><small>${esc(t.komen)}</small>
    ${t.link ? `<br><span class="golink">🔗 Lihat site</span>` : ""}
    ${canEdit ? `<div class="row" style="margin-top:8px"><button class="btn small" data-tedit="${esc(t.id)}">Edit</button><button class="btn small danger" data-tdel="${esc(t.id)}">Padam</button></div>` : ""}</div>`).join("");
  box.querySelectorAll(".testi[data-link]").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("[data-tedit],[data-tdel]")) return;
    window.open(el.dataset.link, "_blank");
  }));
  if (canEdit && typeof bindTestiAdmin === "function") bindTestiAdmin();
}
function renderAbout() {
  const p = S.data.profile || {};
  const sijil = Array.isArray(p.sijil) ? p.sijil.filter(Boolean) : [];
  document.getElementById("aboutCard").innerHTML = `
    ${p.gambar ? `<div class="card pad" style="margin-bottom:10px"><img class="detail" src="${esc(p.gambar)}" style="width:100%;border-radius:10px;object-fit:cover"></div>` : ""}
    <div class="row" style="margin-bottom:10px">
      <div class="card pad" style="flex:1;margin:0"><h3 style="margin:0">${esc(p.nama || "")}</h3></div>
      ${p.link ? `<div class="card pad" style="flex:0 0 auto;margin:0;display:flex;align-items:center"><a href="${esc(p.link)}" target="_blank">🔗 Lihat site</a></div>` : ""}
    </div>
    <div class="card pad" style="margin-bottom:10px"><p style="margin:0">${esc(p.biodata || "")}</p></div>
    <div class="card pad"><div class="sijil-grid">${sijil.map((s) => `<img src="${esc(s)}" data-sijil="${esc(s)}" loading="lazy">`).join("") || "<small>Tiada sijil dipaparkan.</small>"}</div></div>`;
  document.querySelectorAll("[data-sijil]").forEach((img) => img.addEventListener("click", () => {
    document.getElementById("sijilImg").src = img.dataset.sijil;
    document.getElementById("sijilModal").classList.remove("hidden");
  }));
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  if (isAdmin && typeof bindAboutAdmin === "function") bindAboutAdmin();
}
const SOCMED_SVG = {
  whatsapp: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#25D366"/><path d="M16 8c-4.4 0-8 3.6-8 8 0 1.4.4 2.8 1.1 4L8 24l4-1c1.2.7 2.6 1 4 1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm0 14.5c-1.2 0-2.4-.3-3.4-.9l-.2-.1-2.4.6.6-2.3-.2-.2c-.7-1-1-2.2-1-3.6 0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5zm3.6-4.9c-.2-.1-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1l-.6.7c-.1.1-.2.1-.4 0-.5-.2-1-.6-1.5-1.1-.4-.4-.7-.9-.9-1.2-.1-.2 0-.3.1-.4l.4-.5c.1-.1.1-.3 0-.4l-.7-1.6c-.2-.4-.3-.3-.5-.3h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.2 3.5 3 .5.2.9.3 1.2.4.5.2 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2z" fill="#fff"/></svg>`,
  tiktok: `<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#111"/><path d="M21 8.5c.6 2 2 3.5 4.2 3.7v3c-1.6 0-3-.5-4.2-1.4v6.1c0 3.4-2.6 5.6-5.7 5.6-3 0-5.3-2.2-5.3-5.2 0-3.1 2.6-5.3 5.9-5.1v3.1c-1.5-.3-3 .8-3 2 0 1.2 1 2.1 2.2 2.1 1.4 0 2.5-1 2.5-2.6V8.5H21z" fill="#fff"/><path d="M21 8.5c.6 2 2 3.5 4.2 3.7v3c-1.6 0-3-.5-4.2-1.4v.5c1.2.9 2.6 1.4 4.2 1.4v-3c-2.2-.2-3.6-1.7-4.2-3.7h-3v11.2" fill="#25F4EE" opacity=".7"/></svg>`,
  telegram: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#229ED9"/><path d="M7 15.5l14-6.5c.6-.3 1.2.4.8 1l-5.5 11c-.3.6-1.1.7-1.5.1l-2.6-3.1-3.4 2.6c-.4.3-1 .1-1.1-.4l-.7-4.7zm5.5 3.2l7-6.5-5.8 7.3-.4 2.7-1.4-1.6.6-1.9z" fill="#fff"/></svg>`,
  facebook: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#1877F2"/><path d="M18.5 25v-7h2.4l.4-3h-2.8v-1.9c0-.9.3-1.5 1.6-1.5h1.3V8.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V15h-2.5v3H16v7h2.5z" fill="#fff"/></svg>`,
  instagram: `<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="6" fill="none" stroke="#E1306C" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="none" stroke="#E1306C" stroke-width="2.5"/><circle cx="22.5" cy="9.5" r="1.8" fill="#E1306C"/></svg>`,
  linkedin: `<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="#0A66C2"/><rect x="9" y="14" width="3.4" height="9" fill="#fff"/><circle cx="10.7" cy="11" r="1.9" fill="#fff"/><path d="M15 23v-4.8c0-1.4.7-2.4 2.1-2.4 1.3 0 1.9.9 1.9 2.4V23h3.4v-5.3c0-3-1.6-4.4-3.9-4.4-1.7 0-2.6 1-3.1 1.7v-1.5H15V23z" fill="#fff"/></svg>`,
  youtube: `<svg viewBox="0 0 32 32"><rect x="3" y="7" width="26" height="18" rx="5" fill="#FF0000"/><path d="M13.5 12.5v7l6-3.5-6-3.5z" fill="#fff"/></svg>`,
  threads: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#111"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="#fff" font-family="system-ui">@</text></svg>`,
  other: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#6b7280"/><path d="M13 17l6-6c1-1 2.6-1 3.5 0s1 2.6 0 3.5l-3 3M19 15l-6 6c-1 1-2.6 1-3.5 0s-1-2.6 0-3.5l3-3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
};
const SOCMED_META = { whatsapp: "WhatsApp", tiktok: "TikTok", telegram: "Telegram", threads: "Threads", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", other: "Other" };
function renderSocmed() {
  const sc = S.data.socials || {};
  document.getElementById("socmedGrid").innerHTML = Object.keys(SOCMED_META).map((k) =>
    `<a href="${esc(sc[k] || "#")}" target="_blank">${SOCMED_SVG[k] || ""}${SOCMED_META[k]}</a>`).join("");
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  const card = document.getElementById("socmedEditCard");
  if (card) card.classList.toggle("hidden", !(isAdmin && SOCMED_EDIT_MODE));
  const editBtn = document.getElementById("socmedEditBtn");
  if (editBtn && isAdmin) editBtn.textContent = SOCMED_EDIT_MODE ? "Tutup" : "Edit";
  if (isAdmin && SOCMED_EDIT_MODE && typeof fillSocmedForm === "function") fillSocmedForm();
}
init();
API.track("visit");
