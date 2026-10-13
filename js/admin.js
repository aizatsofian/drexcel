/* Admin: login/logout + CRUD produk/kategori/testimoni/tentang + tetapan + upload */
let LOGGED = false;
let editTestiId = null;

async function refreshAdmin() {
  const r = await API.session();
  LOGGED = !!(r && r.loggedIn);
  if (!LOGGED) { TESTI_EDIT_MODE = false; SOCMED_EDIT_MODE = false; }
  document.querySelectorAll(".admin-only").forEach((el) => {
    // butang +Tambah testimoni dikawal mod Edit, bukan sekadar LOGGED
    if (el.id === "addTestiBtn") return;
    el.classList.toggle("hidden", !LOGGED);
  });
  document.getElementById("logoutBtn").classList.toggle("hidden", !LOGGED);
  document.getElementById("adminFab").textContent = LOGGED ? "Admin ✓" : "Admin";
  if (S && S.data) { renderTesti(); renderAbout(); renderSocmed(); renderAdminLists(); fillSettingsForm(); }
  if (LOGGED) {
    try {
      const ad = await API.adminData("username");
      const u = ad && ad.data && ad.data.admin && ad.data.admin.username;
      if (u) { const el = document.getElementById("sAdminUser"); if (el) el.value = u; }
    } catch {}
  }
}
document.getElementById("adminFab").addEventListener("click", () => {
  if (LOGGED) { go("home"); return; }
  document.getElementById("loginModal").classList.remove("hidden");
});
document.getElementById("loginCancel").addEventListener("click", () => document.getElementById("loginModal").classList.add("hidden"));
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await API.logout(); await refreshAdmin(); go("home"); toast("Logout berjaya", "ok");
});
document.getElementById("loginSubmit").addEventListener("click", async () => {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  const err = document.getElementById("loginErr");
  err.classList.add("hidden");
  showLoader(true);
  const r = await API.login(u, p);
  showLoader(false);
  if (r && r.ok) {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("loginPass").value = "";
    await refreshAdmin(); go("home"); toast("Login berjaya", "ok");
  } else {
    err.textContent = "Username atau password salah.";
    err.classList.remove("hidden");
  }
});

// ---------- PRODUK BAHARU (modal di Home) + KATEGORI (di Tetapan) ----------
// Edit/padam produk dibuat dalam popup Home (openDetail, mod Edit). Borang di sini tambah baharu sahaja.
function renderAdminLists() {
  if (!S || !S.data) return;
  const sel = document.getElementById("npKategori");
  if (sel) sel.innerHTML = (S.data.categories || []).map((c) => `<option>${esc(c)}</option>`).join("");
  const cl = document.getElementById("catList");
  if (cl) {
    cl.innerHTML = (S.data.categories || []).map((c) =>
      `<div class="testi admin-row"><div>${esc(c)}</div><button class="btn small" data-cren="${esc(c)}">Rename</button><button class="btn small danger" data-cdel="${esc(c)}">Padam</button></div>`).join("");
    cl.querySelectorAll("[data-cdel]").forEach((b) => b.addEventListener("click", async () => {
      if (!await confirmDialog(`Padam kategori "${b.dataset.cdel}"?`)) return;
      const r = await API.delCat(b.dataset.cdel);
      if (r.ok) { await reloadAll(); toast("Kategori dipadam", "ok"); } else toast("Gagal padam", "err");
    }));
    cl.querySelectorAll("[data-cren]").forEach((b) => b.addEventListener("click", async () => {
      const lama = b.dataset.cren;
      const baru = prompt("Nama baharu kategori:", lama);
      if (!baru || !baru.trim() || baru === lama) return;
      const r = await API.renCat(lama, baru.trim());
      if (r.ok) { await reloadAll(); toast("Kategori dikemaskini", "ok"); } else toast("Gagal rename", "err");
    }));
  }
}

async function delProduct(id) {
  const p = findP(id);
  if (!await confirmDialog(`Padam produk "${p ? p.nama : id}"?`)) return;
  showLoader(true);
  const r = await API.delProduct(id);
  showLoader(false);
  if (r.ok) { S.cart = S.cart.filter((x) => x !== id); saveCart(); await reloadAll(); toast("Produk dipadam", "ok"); }
  else toast("Gagal padam", "err");
}

// ---------- PRODUK BAHARU (Home) ----------
document.getElementById("homeEditBtn").addEventListener("click", () => {
  if (!S || !S.data) return;
  renderAdminLists();
  ["npNama", "npDemo", "npGambar", "npPenerangan", "npHargaSebelum", "npHargaSelepas"].forEach((i) => { const el = document.getElementById(i); if (el) el.value = ""; });
  const pv = document.getElementById("npPreview");
  if (pv) { pv.src = ""; pv.classList.add("hidden"); }
  const f = document.getElementById("npFile");
  if (f) f.value = "";
  document.getElementById("productModal").classList.remove("hidden");
});
document.getElementById("npCancelBtn").addEventListener("click", () => document.getElementById("productModal").classList.add("hidden"));
document.getElementById("npSaveBtn").addEventListener("click", async () => {
  const body = {
    nama: document.getElementById("npNama").value.trim(),
    demo: document.getElementById("npDemo").value.trim(),
    kategori: document.getElementById("npKategori").value,
    gambar: document.getElementById("npGambar").value.trim(),
    penerangan: document.getElementById("npPenerangan").value.trim(),
    harga_sebelum: Number(document.getElementById("npHargaSebelum").value || 0),
    harga_selepas: Number(document.getElementById("npHargaSelepas").value || 0),
  };
  if (!body.nama || !body.kategori) { toast("Nama & kategori diperlukan", "err"); return; }
  showLoader(true);
  const r = await API.addProduct(body);
  showLoader(false);
  if (r && r.ok) {
    document.getElementById("productModal").classList.add("hidden");
    await reloadAll(); toast("Produk disimpan & kekal selepas refresh", "ok");
  } else toast("Gagal simpan: " + (r.error || ""), "err");
});
document.getElementById("npUploadBtn").addEventListener("click", () => document.getElementById("npFile").click());
document.getElementById("npFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  showLoader(true);
  const r = await API.upload(f);
  showLoader(false);
  if (r.ok) {
    document.getElementById("npGambar").value = r.path;
    const pv = document.getElementById("npPreview");
    pv.src = r.path; pv.classList.remove("hidden");
    toast("Gambar dimuat naik: " + r.path, "ok");
  } else toast("Upload gagal: " + (r.error || ""), "err");
});
document.getElementById("cAddBtn").addEventListener("click", async () => {
  const v = document.getElementById("cNama").value.trim();
  if (!v) { toast("Nama kategori diperlukan", "err"); return; }
  const r = await API.addCat(v);
  if (r.ok) { document.getElementById("cNama").value = ""; await reloadAll(); toast("Kategori ditambah", "ok"); }
  else toast("Gagal tambah", "err");
});

// ---------- TESTIMONI (mod Edit) ----------
document.getElementById("testiEditBtn").addEventListener("click", () => {
  TESTI_EDIT_MODE = !TESTI_EDIT_MODE;
  renderTesti();
});
document.getElementById("addTestiBtn").addEventListener("click", () => {
  editTestiId = null;
  document.getElementById("testiTitle").textContent = "Tambah Testimoni";
  ["tNama", "tLink", "tKomen"].forEach((i) => document.getElementById(i).value = "");
  document.getElementById("testiModal").classList.remove("hidden");
});
document.getElementById("tCancelBtn").addEventListener("click", () => document.getElementById("testiModal").classList.add("hidden"));
document.getElementById("tSaveBtn").addEventListener("click", async () => {
  const body = {
    nama: document.getElementById("tNama").value.trim(),
    rating: Number(document.getElementById("tRating").value || 5),
    link: document.getElementById("tLink").value.trim(),
    komen: document.getElementById("tKomen").value.trim(),
  };
  if (!body.nama || !body.komen) { toast("Nama & komen diperlukan", "err"); return; }
  const r = editTestiId ? await API.updTesti(editTestiId, body) : await API.addTesti(body);
  if (r && r.ok) {
    document.getElementById("testiModal").classList.add("hidden");
    editTestiId = null;
    await reloadAll(); toast("Testimoni disimpan", "ok");
  } else toast("Gagal simpan testimoni", "err");
});
function bindTestiAdmin() {
  document.querySelectorAll("[data-tdel]").forEach((b) => b.addEventListener("click", async () => {
    if (!await confirmDialog("Padam testimoni ini?")) return;
    const r = await API.delTesti(b.dataset.tdel);
    if (r.ok) { await reloadAll(); toast("Testimoni dipadam", "ok"); } else toast("Gagal padam", "err");
  }));
  document.querySelectorAll("[data-tedit]").forEach((b) => b.addEventListener("click", () => {
    const t = (S.data.testimonials || []).find((x) => x.id === b.dataset.tedit);
    if (!t) return;
    editTestiId = t.id;
    document.getElementById("testiTitle").textContent = "Edit Testimoni";
    document.getElementById("tNama").value = t.nama || "";
    document.getElementById("tRating").value = String(t.rating || 5);
    document.getElementById("tLink").value = t.link || "";
    document.getElementById("tKomen").value = t.komen || "";
    document.getElementById("testiModal").classList.remove("hidden");
  }));
}

// ---------- SOCMED (edit di menu Socmed, mod Edit) ----------
const SOCMED_KEYS = ["whatsapp", "tiktok", "telegram", "threads", "facebook", "instagram", "linkedin", "youtube", "other"];
function fillSocmedForm() {
  if (!S || !S.data) return;
  const sc = S.data.socials || {};
  const box = document.getElementById("socmedInputs");
  if (box && !box.dataset.built) {
    box.dataset.built = "1";
    box.innerHTML = SOCMED_KEYS.map((k) => `<input id="soc_${k}" placeholder="${k} URL" style="margin-top:6px">`).join("");
  }
  SOCMED_KEYS.forEach((k) => {
    const el = document.getElementById("soc_" + k);
    if (el && document.activeElement !== el) el.value = sc[k] || "";
  });
}
document.getElementById("socmedEditBtn").addEventListener("click", () => {
  SOCMED_EDIT_MODE = !SOCMED_EDIT_MODE;
  renderSocmed();
});
document.getElementById("socmedSaveBtn").addEventListener("click", async () => {
  const socials = {};
  SOCMED_KEYS.forEach((k) => { const el = document.getElementById("soc_" + k); socials[k] = el ? el.value.trim() : ""; });
  showLoader(true);
  const r = await API.saveSettings({ socials });
  showLoader(false);
  if (r && r.ok) { await reloadAll(); toast("Link socmed disimpan", "ok"); }
  else toast("Gagal simpan socmed", "err");
});
// ---------- TENTANG (edit via popup modal, butang Edit di atas) ----------
// Di-wire terus semasa muat (butang statik) supaya berfungsi walau renderAbout
// pernah berjalan ketika logout. bindAboutAdmin dikekalkan untuk renderAbout().
function openAboutModal() {
  if (typeof LOGGED !== "undefined" && !LOGGED) return;
  const pr = (S.data && S.data.profile) || {};
  document.getElementById("aNama").value = pr.nama || "";
  document.getElementById("aBiodata").value = pr.biodata || "";
  document.getElementById("aLink").value = pr.link || "";
  document.getElementById("aGambar").value = pr.gambar || "";
  renderSijilList(pr.sijil || []);
  document.getElementById("aboutModal").classList.remove("hidden");
}
let _sijilDraft = [];
function renderSijilList(list) {
  _sijilDraft = [...(list || [])];
  const box = document.getElementById("aSijilList");
  if (!box) return;
  box.innerHTML = _sijilDraft.map((s, i) => `<div class="row" style="align-items:center"><img src="${esc(s)}" style="width:64px;height:48px;object-fit:cover;border-radius:8px"><small style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(s)}</small><button class="btn small danger" data-sijildel="${i}">Padam</button></div>`).join("") || "<small>Tiada sijil.</small>";
  box.querySelectorAll("[data-sijildel]").forEach((b) => b.addEventListener("click", () => {
    _sijilDraft.splice(Number(b.dataset.sijildel), 1);
    renderSijilList(_sijilDraft);
  }));
}
function bindAboutAdmin() {
  const btn = document.getElementById("aboutEditBtn");
  if (btn) btn.onclick = openAboutModal;
}
document.getElementById("aboutEditBtn").addEventListener("click", openAboutModal);
document.getElementById("aSijilUpBtn").addEventListener("click", () => document.getElementById("aSijilFile").click());
document.getElementById("aSijilFile").addEventListener("change", async (e) => {
  const files = [...(e.target.files || [])];
  e.target.value = "";
  if (!files.length) return;
  showLoader(true);
  for (const f of files.slice(0, 20 - _sijilDraft.length)) {
    const r = await API.upload(f);
    if (r && r.ok) _sijilDraft.push(r.path);
  }
  showLoader(false);
  renderSijilList(_sijilDraft);
  toast("Sijil dimuat naik", "ok");
});
document.getElementById("aCancelBtn").addEventListener("click", () => document.getElementById("aboutModal").classList.add("hidden"));
document.getElementById("aUpBtn").addEventListener("click", () => document.getElementById("aFile").click());
document.getElementById("aFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  showLoader(true);
  const r = await API.upload(f);
  showLoader(false);
  if (r.ok) { document.getElementById("aGambar").value = r.path; toast("Dimuat naik: " + r.path, "ok"); }
  else toast("Upload gagal: " + (r.error || ""), "err");
});
document.getElementById("aSaveBtn").addEventListener("click", async () => {
  const body = {
    profile: {
      nama: document.getElementById("aNama").value.trim(),
      biodata: document.getElementById("aBiodata").value.trim(),
      link: document.getElementById("aLink").value.trim(),
      gambar: document.getElementById("aGambar").value.trim(),
      sijil: _sijilDraft,
    },
  };
  showLoader(true);
  const r = await API.saveSettings(body);
  showLoader(false);
  if (r && r.ok) {
    document.getElementById("aboutModal").classList.add("hidden");
    await reloadAll(); toast("Tentang dikemaskini", "ok");
  } else toast("Gagal simpan", "err");
});

// ---------- TETAPAN (website / bayar / kategori / carta / admin) ----------
function fillSettingsForm() {
  if (!S || !S.data) return;
  const st = S.data.settings || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v || ""; };
  set("sWhatsapp", st.whatsapp); set("sHeader", st.header); set("sLogo", st.logo);
  set("bBankNama", st.bank_nama); set("bBankNo", st.bank_no); set("bBankPenama", st.bank_penama);
  set("bQrBank", st.qr_bank); set("bQrTng", st.qr_tng);
  set("sAdminUser", (S.data.admin && S.data.admin.username) || "");
}

document.getElementById("sLogoUp").addEventListener("click", () => document.getElementById("sLogoFile").click());
document.getElementById("sLogoFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  showLoader(true);
  const r = await API.upload(f);
  showLoader(false);
  if (r && r.ok) { document.getElementById("sLogo").value = r.path; toast("Dimuat naik: " + r.path, "ok"); }
  else toast("Upload gagal: " + (r.error || ""), "err");
});

document.getElementById("webSaveBtn").addEventListener("click", async () => {
  const body = {
    whatsapp: document.getElementById("sWhatsapp").value.trim(),
    header: document.getElementById("sHeader").value.trim(),
    logo: document.getElementById("sLogo").value.trim(),
  };
  showLoader(true);
  const r = await API.saveSettings(body);
  showLoader(false);
  if (r && r.ok) { await reloadAll(); toast("Website disimpan", "ok"); }
  else toast("Gagal simpan website", "err");
});

document.getElementById("bayarSaveBtn").addEventListener("click", async () => {
  const body = {
    bank_nama: document.getElementById("bBankNama").value.trim(),
    bank_no: document.getElementById("bBankNo").value.trim(),
    bank_penama: document.getElementById("bBankPenama").value.trim(),
    qr_bank: document.getElementById("bQrBank").value.trim(),
    qr_tng: document.getElementById("bQrTng").value.trim(),
  };
  showLoader(true);
  const r = await API.saveSettings(body);
  showLoader(false);
  if (r && r.ok) { await reloadAll(); toast("Bayar disimpan", "ok"); }
  else toast("Gagal simpan bayar", "err");
});
document.getElementById("bQrBankUp").addEventListener("click", () => document.getElementById("bQrBankFile").click());
document.getElementById("bQrBankFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  showLoader(true);
  const r = await API.upload(f);
  showLoader(false);
  if (r.ok) { document.getElementById("bQrBank").value = r.path; toast("Dimuat naik: " + r.path, "ok"); }
  else toast("Upload gagal: " + (r.error || ""), "err");
});
document.getElementById("bQrTngUp").addEventListener("click", () => document.getElementById("bQrTngFile").click());
document.getElementById("bQrTngFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  showLoader(true);
  const r = await API.upload(f);
  showLoader(false);
  if (r.ok) { document.getElementById("bQrTng").value = r.path; toast("Dimuat naik: " + r.path, "ok"); }
  else toast("Upload gagal: " + (r.error || ""), "err");
});

document.getElementById("adminSaveBtn").addEventListener("click", async () => {
  const body = { admin: { username: document.getElementById("sAdminUser").value.trim() } };
  const np = document.getElementById("sAdminPass").value;
  if (np) body.admin.password = np;
  if (!body.admin.username && !np) { toast("Isi username atau password", "err"); return; }
  showLoader(true);
  const r = await API.saveSettings(body);
  showLoader(false);
  if (r && r.ok) {
    document.getElementById("sAdminPass").value = "";
    await reloadAll(); toast("Admin disimpan", "ok");
  } else toast("Gagal simpan admin", "err");
});

refreshAdmin();
