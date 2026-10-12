/* Wrapper API -> Python local / Cloudflare Pages Functions */
const API = {
  _data: null,
  _pendingData: null,
  _analytics: null,
  _pendingAnalytics: null,
  _adminUsername: null,
  async get(k) {
    const r = await fetch(k);
    return r.json();
  },
  async post(k, body) {
    const r = await fetch(k, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    return r.json();
  },
  async put(k, body) {
    const r = await fetch(k, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    return r.json();
  },
  async del(k) {
    const r = await fetch(k, { method: "DELETE" });
    return r.json();
  },
  async data(force = false) {
    if (!force && this._data) return { ok: true, data: this._data };
    if (this._pendingData) return this._pendingData;
    this._pendingData = this.get("/api/data").then(r => { if (r.ok) this._data = r.data; return r; });
    try { return await this._pendingData; } finally { this._pendingData = null; }
  },
  async mutate(kind, method, id, body) {
    const collection = this._data && this._data[kind];
    const existing = collection && collection.find(p => p.id === id);
    if (method === "PUT" && existing && Object.keys(body).every(k => existing[k] === body[k])) return { ok: true, item: existing };
    const path = "/api/admin/" + kind + (id ? "/" + encodeURIComponent(id) : "");
    const r = method === "DELETE" ? await this.del(path) : await this[method === "PUT" ? "put" : "post"](path, body);
    if (r.ok && this._data) {
      if (method === "DELETE") this._data[kind] = collection.filter(p => p.id !== id);
      else if (r.item) {
        const index = collection.findIndex(p => p.id === r.item.id);
        if (index < 0) collection.push(r.item); else collection[index] = r.item;
      } else this._data = null;
    }
    return r;
  },
  track(jenis, produk) { return this.post("/api/track", { jenis, produk }).catch(() => ({})); },
  like(produk) { return this.post("/api/like", { produk }); },
  login(u, p) { return this.post("/api/login", { username: u, password: p }); },
  async logout() { const r = await this.post("/api/logout", {}); this._analytics = null; return r; },
  session() { return this.get("/api/session").catch(() => ({ loggedIn: false })); },
  async adminData(scope) {
    const r = await this.get("/api/admin/data" + (scope ? "?scope=" + encodeURIComponent(scope) : ""));
    if (r.ok) this._adminUsername = r.data?.admin?.username;
    return r;
  },
  async analytics(force = false) {
    if (!force && this._analytics) return this._analytics;
    if (this._pendingAnalytics) return this._pendingAnalytics;
    this._pendingAnalytics = this.get("/api/admin/analytics").then(r => { if (r.ok) this._analytics = r; return r; });
    try { return await this._pendingAnalytics; } finally { this._pendingAnalytics = null; }
  },
  addProduct(b) { return this.mutate("products", "POST", null, b); },
  updProduct(id, b) { return this.mutate("products", "PUT", id, b); },
  delProduct(id) { return this.mutate("products", "DELETE", id); },
  async category(method, oldName, nama) {
    if (method === "PUT" && oldName === nama) return { ok: true };
    if (method === "POST" && this._data?.categories.includes(nama)) return { ok: true };
    const path = "/api/admin/categories" + (oldName ? "/" + encodeURIComponent(oldName) : "");
    const r = method === "DELETE" ? await this.del(path) : await this[method === "PUT" ? "put" : "post"](path, { nama });
    if (r.ok && this._data) {
      if (r.categories) this._data.categories = r.categories;
      else if (method === "DELETE") this._data.categories = this._data.categories.filter(c => c !== oldName);
      else if (method === "PUT") this._data.categories = [...new Set(this._data.categories.map(c => c === oldName ? nama : c))];
      if (method === "PUT") this._data.products.forEach(p => { if (p.kategori === oldName) p.kategori = nama; });
    }
    return r;
  },
  addCat(nama) { return this.category("POST", null, nama); },
  renCat(lama, nama) { return this.category("PUT", lama, nama); },
  delCat(nama) { return this.category("DELETE", nama); },
  addTesti(b) { return this.mutate("testimonials", "POST", null, b); },
  updTesti(id, b) { return this.mutate("testimonials", "PUT", id, b); },
  delTesti(id) { return this.mutate("testimonials", "DELETE", id); },
  async saveSettings(b) {
    const patch = {};
    for (const [key, value] of Object.entries(b)) {
      if (key === "admin") {
        const admin = {};
        if (value.username && value.username !== this._adminUsername) admin.username = value.username;
        if (value.password) admin.password = value.password;
        if (Object.keys(admin).length) patch.admin = admin;
        continue;
      }
      if (["profile", "socials"].includes(key)) {
        const nested = {};
        for (const [field, item] of Object.entries(value)) if (JSON.stringify(this._data?.[key]?.[field]) !== JSON.stringify(item)) nested[field] = item;
        if (Object.keys(nested).length) patch[key] = nested;
        continue;
      }
      const current = ["profile", "socials"].includes(key) ? this._data?.[key] : key === "admin" ? null : this._data?.settings?.[key];
      if (current === undefined || JSON.stringify(current) !== JSON.stringify(value)) patch[key] = value;
    }
    if (!Object.keys(patch).length) return { ok: true };
    const r = await this.post("/api/admin/settings", patch);
    if (r.ok && patch.admin?.username) this._adminUsername = patch.admin.username;
    if (r.ok && this._data) {
      if (r.changed) for (const [key, value] of Object.entries(r.changed)) { if (key !== "admin") this._data[key] = value; }
      else this._data = null; // Python local returns no changed payload: read once after save.
    }
    return r;
  },
  async importData(b) { const r = await this.post("/api/admin/import", b); if (r.ok) { this._data = null; this._analytics = null; } return r; },
  async upload(file) {
    if (!file || !file.size) return { ok: false, error: "fail_diperlukan" };
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: "fail_terlalu_besar_maksimum_5MB" };
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file.name)) return { ok: false, error: "guna_png_jpg_webp_gif" };
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      return await r.json();
    } catch { return { ok: false, error: "upload_sambungan_gagal" }; }
  },
};
