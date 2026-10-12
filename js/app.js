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
}

async function init() {
  updateBadge();
  document.getElementById("homeLoading").classList.remove("hidden");
  await reloadAll();
  document.getElementById("homeLoading").classList.add("hidden");

  document.getElementById("hSearch").addEventListener("input", (e) => { S.kq = e.target.value.toLowerCase(); renderHome(); });
  document.getElementById("hCat").addEventListener("change", (e) => { S.kcat = e.target.value; renderHome(); });
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("clearCartBtn").addEventListener("click", async () => {
    if (!S.cart.length) return;
    if (await confirmDialog("Kosongkan semua bakul?")) { S.cart = []; saveCart(); renderCart(); toast("Bakul dikosongkan", "ok"); }
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
    renderHome(); renderTesti(); renderAbout(); renderSocmed();
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
}
function findP(id) { return (S.data.products || []).find((p) => p.id === id); }

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
        <div class="card-actions">
          <button class="btn" data-act="demo">Video</button>
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
  document.getElementById("detailBody").innerHTML = `
    <img class="detail" id="dImg" src="${esc(p.gambar || "")}" onerror="this.src='https://picsum.photos/seed/${esc(p.id)}/600/400'">
    <div id="dView">
      <h3 style="text-align:center">${esc(p.nama)}</h3>
      <div class="card-cat" style="text-align:center">${esc(p.kategori || "")}</div>
      <p>${esc(p.penerangan || "")}</p>
    </div>
    <div id="dEdit" class="${isAdmin ? "hidden" : "hidden"}">
      <input id="eNama" value="${esc(p.nama)}">
      <div class="row" style="margin-top:8px"><select id="eKategori">${cats}</select></div>
      <textarea id="ePenerangan" rows="3" style="margin-top:8px">${esc(p.penerangan || "")}</textarea>
      <div class="row" style="margin-top:8px">
        <input id="eGambar" value="${esc(p.gambar || "")}" placeholder="URL gambar / uploads/...">
        <button class="btn" id="eUpBtn" type="button">Upload</button>
        <input id="eFile" type="file" accept=".png,.jpg,.jpeg,.webp,.gif" class="hidden">
      </div>
    </div>
    <div class="row">
      <button class="btn" id="dDemo">Video</button>
      <button class="btn primary" id="dBakul">+ Bakul</button>
    </div>
    ${isAdmin ? `
    <div class="row" style="margin-top:8px">
      <button class="btn" id="dEditBtn">Edit</button>
    </div>
    <div class="row hidden" id="dAdminRow" style="margin-top:8px">
      <button class="btn primary" id="eSaveBtn">Simpan</button>
      <button class="btn danger" id="eDelBtn">Padam</button>
    </div>` : ""}`;
  document.getElementById("detailModal").classList.remove("hidden");
  document.getElementById("dDemo").addEventListener("click", (e) => openDemo(id, e));
  document.getElementById("dBakul").addEventListener("click", () => addCart(id));
  if (isAdmin) {
    const editBox = document.getElementById("dEdit");
    const viewBox = document.getElementById("dView");
    const adminRow = document.getElementById("dAdminRow");
    const editBtn = document.getElementById("dEditBtn");
    let editing = false;
    editBtn.addEventListener("click", () => {
      editing = !editing;
      editBox.classList.toggle("hidden", !editing);
      viewBox.classList.toggle("hidden", editing);
      adminRow.classList.toggle("hidden", !editing);
      editBtn.textContent = editing ? "Batal Edit" : "Edit";
    });
    document.getElementById("eUpBtn").addEventListener("click", () => document.getElementById("eFile").click());
    document.getElementById("eFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      showLoader(true);
      const r = await API.upload(f);
      showLoader(false);
      if (r && r.ok) {
        document.getElementById("eGambar").value = r.path;
        document.getElementById("dImg").src = r.path;
        toast("Gambar dimuat naik: " + r.path, "ok");
      } else toast("Upload gagal", "err");
    });
    document.getElementById("eSaveBtn").addEventListener("click", async () => {
      const body = {
        nama: document.getElementById("eNama").value.trim(),
        kategori: document.getElementById("eKategori").value,
        penerangan: document.getElementById("ePenerangan").value.trim(),
        gambar: document.getElementById("eGambar").value.trim(),
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
    return `<div class="cart-item">
      <img src="${esc(p.gambar || "")}" onerror="this.src='https://picsum.photos/seed/${esc(p.id)}/600/400'">
      <div style="flex:1"><b>${esc(p.nama)}</b><br><small>${esc(p.kategori || "")}</small></div>
      <button class="btn small" data-del="${esc(p.id)}">Buang</button>
    </div>`;
  }).join("") : '<p class="empty">Bakul kosong. Tambah produk dari Home.</p>';
  box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    S.cart = S.cart.filter((x) => x !== b.dataset.del);
    saveCart(); renderCart();
  }));
}
function checkout() {
  const items = S.cart.map(findP).filter(Boolean);
  if (!items.length) { toast("Bakul kosong", "err"); return; }
  const no = (S.data.settings && S.data.settings.whatsapp) || "";
  if (!no) { toast("Nombor WhatsApp belum ditetapkan", "err"); return; }
  const lines = items.map((p, i) => `${i + 1}. ${p.nama}`);
  const msg = `Assalamualaikum, saya berminat:%0A%0A${encodeURIComponent(lines.join("\n"))}`;
  API.track("whatsapp");
  window.open(`https://wa.me/${no}?text=${msg}`, "_blank");
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
  document.getElementById("aboutCard").innerHTML = `
    ${p.gambar ? `<img class="detail" src="${esc(p.gambar)}">` : ""}
    <h3>${esc(p.nama || "")}</h3><p>${esc(p.biodata || "")}</p>
    <p><b>Kepakaran:</b> ${esc((p.kepakaran || []).join(", "))}</p><p>${esc(p.penerangan || "")}</p>`;
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  if (isAdmin && typeof bindAboutAdmin === "function") bindAboutAdmin();
}
const SOCMED_META = { whatsapp: ["WhatsApp", "💬"], tiktok: ["TikTok", "🎵"], threads: ["Threads", "🧵"], facebook: ["Facebook", "📘"], instagram: ["Instagram", "📸"], linkedin: ["LinkedIn", "💼"], youtube: ["YouTube", "▶️"] };
function renderSocmed() {
  const sc = S.data.socials || {};
  document.getElementById("socmedGrid").innerHTML = Object.keys(SOCMED_META).map((k) =>
    `<a href="${esc(sc[k] || "#")}" target="_blank"><span class="big">${SOCMED_META[k][1]}</span>${SOCMED_META[k][0]}</a>`).join("");
  const isAdmin = typeof LOGGED !== "undefined" && LOGGED;
  const card = document.getElementById("socmedEditCard");
  if (card) card.classList.toggle("hidden", !(isAdmin && SOCMED_EDIT_MODE));
  const editBtn = document.getElementById("socmedEditBtn");
  if (editBtn && isAdmin) editBtn.textContent = SOCMED_EDIT_MODE ? "Tutup" : "Edit";
  if (isAdmin && SOCMED_EDIT_MODE && typeof fillSocmedForm === "function") fillSocmedForm();
}
init();
API.track("visit");
