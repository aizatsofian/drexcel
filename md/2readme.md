# 2README — Website Koleksi Sistem (MVP SIAP)

> Fail ini panduan sambungan kerja untuk session/agent baharu.
> Baca fail ini sahaja — tidak perlu baca keseluruhan kod kecuali mahu ubah bahagian spesifik.
>
> **Status terkini: production LIVE di https://drexcel.pages.dev — lihat Seksyen 12.** Maklumat Python/JSON dan admin123 di bawah merujuk versi local sahaja. Versi online menggunakan Pages Functions + D1 + upload GitHub, password admin rawak private.

## 1. Status & Cara Jalan

- **Status:** MVP lengkap (Fasa 1–4). Semua menu berfungsi secara local.
- **Jalan:** klik `buka.bat` (buka `http://localhost:8000` + jalan `py/server.py`).
  Manual: `python py/server.py` dari root (port `8000`, bind `127.0.0.1`, stdlib sahaja — tiada dependency).
- **Login admin:** `admin / admin123` (butang `Admin` di footer bawah content → popup).
- **Stack:** HTML + CSS + JS vanilla (tiada framework), Python stdlib, `sys/data.json` sebagai database fail. Satu-satunya dependency luar: SheetJS via CDN (cdnjs) untuk export/import Excel — perlu internet untuk butang Export/Import sahaja.

## 2. Peta Fail

| Fail / Folder | Peranan |
|---|---|
| `index.html` | 6 halaman (`page-home/bakul/testimoni/tentang/socmed/tetapan` — **menu Tambah, Analisis & Kategori dibuang**), bottom nav **icon sahaja** + tooltip hover (mobile: icon sahaja), footer Admin non-sticky, Logout di bawah Tetapan, modal login/detail/testimoni/**product**/about/confirm, toast/loader. **Tiada topbar. Tiada h2 tajuk halaman. Tiada bar biru** (diganti header Home). Home: header `.home-head` — **1 kotak, 1 baris** (logo `settings.logo` + fallback teks, tajuk `homeTitle` dari `settings.header`, search `hSearch`, filter `hCat`) + butang `Edit` atas-kanan (admin) → modal `productModal` tambah produk. Bakul: **tiada harga**. Testimoni: kotak boleh klik → `link` (tab baharu, ikon 🔗); butang `Edit` atas-kanan (admin) kawal mod edit (`+Tambah` + Edit/Padam per item); modal guna `tLink` (tiada `tGambar`). Tentang: butang `Edit` atas-kanan (admin) → modal `aboutModal`. Socmed: butang `Edit` atas-kanan (admin) → kad `socmedEditCard` isi 7 link. Tetapan: 5 kotak tanpa nombor — **Website** (WhatsApp+Header sebaris, logo URL+Upload, +`webSaveBtn`; Header = teks tajuk dalam header Home), **Kategori** (`cNama/cAddBtn/catList`), **carta garis pelawat harian** (`miniChart/miniNote/miniRefresh`), **Admin** (`sAdminUser/sAdminPass/adminSaveBtn`), **Data** (`exportDataBtn/exportAnaBtn/importBtn/importFile` + Logout) |
| `sys/style.css` | Mobile-first. `.home-head` 1 kotak flex 1-baris (logo+tajuk+cari+filter), hijau lembut. Grid produk `1fr 1fr` (mobile) → 3/4 (desktop). Token tema `--theme` (statik, tiada tetapan warna). Nav icon-only (`.ico+span` sorok, tooltip bila hover). Kad: nama center, badge kategori kiri-atas & like kanan-atas dalam gambar (`.card-img`). `.testi[data-link]` klik + `.golink`. `.footer` + `.admin-fab-static`. `body padding-bottom:150px` anti-tindih nav |
| `py/` | Backend 7 modul: `server.py` (entry+routing+handler), `config.py` (BASE_DIR=root/parent, DATA/UPLOAD path, PORT), `store.py` (lock+atomic save), `auth.py` (pbkdf2+session), `analytics.py` (track+summary+public), `uploads.py` (multipart), `backup.py` (`validate_import()` untuk import). Jalan mesti dari root: `python py/server.py` |
| `buka.bat` | `start http://localhost:8000` + `python py/server.py` (fallback `py`) |
| `sys/data.json` | Semua data (produk, kategori, testimoni, profil, socmed, settings, admin hash, analytics real+demo). Laluan ditetapkan di `py/config.py` (`DATA_FILE`) |
| `js/api.js` | Wrapper `API.*` (get/post/put/del, login, `like(produk)`, CRUD produk/kategori/testimoni, settings, upload, analytics, `importData(payload)`) |
| `js/backup.js` | Export/import Excel via SheetJS CDN: `buildDataWorkbook()` (6 sheet kandungan) + `buildAnaWorkbook()` (6 sheet analisis) + `parseWorkbook()` pintar (fail data → kandungan sahaja, fail analisis → analytics sahaja, fail penuh → semua) + handler `exportDataBtn/exportAnaBtn/importBtn/importFile`. Import gabung dengan data semasa, `confirmDialog()` sebut skop, `POST /api/admin/import` + `reloadAll()`. Kepakaran dipisah `";"` dalam Excel |
| `js/ui.js` | `toast()`, `showLoader()`, `confirmDialog()->Promise`, `esc()` |
| `js/app.js` | State `S` (`kq/kcat` carian Home, cart, `LIKED` in `localStorage["liked"]`) + flag mod edit `TESTI_EDIT_MODE`/`SOCMED_EDIT_MODE`, router `go(page)`, `reloadAll()`, `productCard()`+`bindCards()` (nama center, badge kategori+like, butang **Video**/+Bakul; klik badge like → `likeProduct()`), `renderHome()` (logo + filter `hCat` + carian `hSearch`), `openDetail()` (public+admin view statik; admin butang **Edit** → input nama/kategori/penerangan/**gambar URL+Upload+preview** + Simpan/Padam; tutup klik-luar), `renderAbout()` (+ hook `bindAboutAdmin`), Bakul (checkout WhatsApp senarai nama)/Testimoni (kotak klik → `link` tab baharu; admin gated `TESTI_EDIT_MODE`)/Socmed (+ `socmedEditCard` gated `SOCMED_EDIT_MODE`), checkout WhatsApp |
| `js/admin.js` | `refreshAdmin()` + gate `.admin-only` (kecuali `addTestiBtn` dikawal mod Edit; logout reset kedua-dua mod; `adminFab`/login hala ke `home`), **Home: `homeEditBtn` → `productModal` tambah produk (`np*`)**, **CRUD kategori di Tetapan** (`catList`, medan kategori produk dikekalkan), Testimoni via `testiEditBtn` toggle + modal (`tLink`), Tentang via `aboutEditBtn` (atas) + `aboutModal`, **Socmed via `socmedEditBtn` + `fillSocmedForm()` + `socmedSaveBtn`** (`{socials}` sahaja), Tetapan 5 kotak (website `webSaveBtn`, admin `adminSaveBtn`, data split export), upload gambar Tentang/produk baharu, Logout (`#logoutBtn` di kotak Data). Tiada `adminBadge`/topbar |
| `js/analytics.js` | Carta mini Tetapan kotak3: `loadMiniChart()` (dimuat via `go('tetapan')` + butang `miniRefresh`), garis SVG vanilla pelawat harian 30 hari (data sebenar `GET /api/admin/analytics` → `real.daily`). Dashboard Analisis lama dibuang; tracking server (`POST /api/track`) + API analytics dikekalkan |
| `uploads/` | Gambar dimuat naik (`uploads/<timestamp>_<rand>.<ext>`). Dibenar: png/jpg/jpeg/webp/gif/svg, ≤5MB |
| `md/1prom.md` | Spesifikasi asal (rujukan sahaja) |

## 3. Kontrak API (`py/server.py` + modul)

Public (tanpa auth):

| Method & Laluan | Body | Nota |
|---|---|---|
| `GET /api/data` | — | Produk, kategori, testimoni, profil, socmed, settings public. **Tiada** `admin.hash` |
| `POST /api/track` | `{jenis: visit\|product\|demo\|whatsapp, produk?: id}` | Rekod analytics sebenar |
| `GET /api/session` | — | `{loggedIn: bool}` |
| `POST /api/login` | `{username, password}` | Set cookie `session` HttpOnly jika betul |
| `POST /api/logout` | — | Padam session |

Admin (perlu cookie session, else `401`):

| Method & Laluan | Body |
|---|---|
| `GET /api/admin/data` | — (username sahaja, **hash tidak dihantar**) |
| `GET /api/admin/analytics` | — → `{real: {...}, demo: {...}}` |
| `POST /api/admin/products` | `{nama, kategori, penerangan?, gambar?, demo?}` |
| `PUT /api/admin/products/:id` | separa (cth `{nama}`) |
| `DELETE /api/admin/products/:id` | — |
| `POST /api/admin/categories` | `{nama}` |
| `PUT /api/admin/categories/:namaLama` | `{nama}` (rename + update produk berkaitan) |
| `DELETE /api/admin/categories/:nama` | — |
| `POST /api/admin/testimonials` | `{nama, komen, rating 1-5?, link?}` |
| `PUT /api/admin/testimonials/:id` | separa |
| `DELETE /api/admin/testimonials/:id` | — |
| `POST /api/admin/settings` | `{whatsapp?, header?, logo?, profile?{nama,biodata,kepakaran[],penerangan,gambar}, socials?{7 kunci}, admin?{username?, password?}}` |
| `POST /api/admin/import` | `{products[], categories[], testimonials[], profile{}, socials{}, settings{}, analytics{real,demo}}` (format sama seperti export) → overwrite semua **kecuali admin** (login dikekalkan). Validasi di `py/backup.py`; salah format → `400` + `error: sheet_<nama>_tiada` |
| `POST /api/like` | `{produk}` (public, tiada auth) → `{ok, likes}` — tambah 1 like, kekal dalam `data.json` |
| `POST /api/admin/upload` | `multipart/form-data` medan `file` → `{ok, path:"uploads/..."}` |

Laluan lain `GET` → fail statik (fallback `index.html` jika wujud).

## 4. Skema `sys/data.json` (ringkas)

```json
{
  "products": [{"id":"p01","nama":"","gambar":"","penerangan":"","kategori":"","demo":"","likes":97}],
  "categories": ["Sistem Jualan","Landing Page","Dashboard","Tempahan","Edukasi"],
  "testimonials": [{"id":"t01","nama":"","rating":5,"komen":"","link":"https://..."}],
  "profile": {"nama":"","biodata":"","kepakaran":[],"penerangan":"","gambar":""},
  "socials": {"whatsapp":"","tiktok":"","threads":"","facebook":"","instagram":"","linkedin":"","youtube":""},
  "settings": {"logo":"","whatsapp":"601...","header":""},
  "admin": {"username":"admin","password_hash":"pbkdf2$..."},
  "analytics": {
    "real": {"visitors":0,"product_clicks":{},"demo_clicks":{},"whatsapp_clicks":0,"events":[{"t":"iso","jenis":"visit","produk":"p01?"}]},
    "demo": {"label":"demo","nota":"...","visitors":1250,"product_clicks_total":860,"demo_clicks_total":320,"whatsapp_clicks":145,"daily":[],"top":[]}
  }
}
```

Contoh sedia ada: **12 produk, 5 kategori, 8 testimoni**, demo analytics berlabel `demo`.

## 5. Perkara Wajib Tahu

1. **Auth:** pbkdf2-hmac-sha256 (`hash_password/verify_password`), token `secrets.token_hex(32)` dalam `_sessions` (TTL 12j), cookie `session HttpOnly; SameSite=Lax`. Semua `/api/admin/*` wajib `require_admin()`.
2. **Simpan selamat:** semua tulis via `update_data()` → `threading.Lock` + tulis `.tmp` + `os.replace` (atomic). Jangan tulis `sys/data.json` manual tanpa lock.
3. **Upload:** parser sokong `filename="x"` (browser) DAN `filename=x` tanpa petik (PowerShell `.NET`). Jangan ketatkan semula kepada satu format.
4. **Frontend refresh:** selepas apa-apa mutasi, panggil `await reloadAll()` (muat `/api/data` + render semula Home/Testimoni/About/Socmed + `renderAdminLists()` + `fillSettingsForm()`). Carian + filter kategori kini dalam header Home (`hSearch`/`hCat` → `renderHome()`). Nota: `refreshAdmin()` juga render semula Testimoni+About+Socmed dan reset mod bila logout.
5. **Bakul/checkout:** `localStorage["bakul"]` (array id). Butang `Empty` (kiri) + `Checkout` (kanan) sebaris. Checkout buka `https://wa.me/<settings.whatsapp>?text=...` (hanya senarai nama bernombor) + `API.track("whatsapp")`. Medan `harga` dibuang sepenuhnya dari kod + data (backend tolak jika dihantar? tidak — whitelist abaikan kunci asing; `rm()` turut dibuang).
6. **Analytics:** semua event melalui `POST /api/track` (visit di `app.js`, product/demo di kad/detail, whatsapp di checkout). Summary dikira server (`build_analytics_summary`, `GET /api/admin/analytics`). UI analisis penuh dibuang — hanya carta garis mini pelawat harian di Tetapan kotak3 (`loadMiniChart`). Tracking kekal walaupun tiada dashboard.
7. **Like:** kiraan dalam `products[].likes` (stabil, kekal). Klik badge → `POST /api/like` → +1; anti-double via `localStorage["liked"]`. Produk baharu dapat rawak 10–99 (server).
8. **Edit admin di frontend (semua gated mod Edit / butang Edit atas-kanan):** produk dalam popup Home (view dulu → butang `Edit` → input nama/kategori/penerangan/gambar+upload + Simpan/Padam) dan produk baharu via `homeEditBtn` → `productModal` di Home; testimoni via `testiEditBtn` (kawal `+Tambah` + Edit/Padam); socmed via `socmedEditBtn` + `socmedEditCard`; tentang via `aboutEditBtn` (atas) + `aboutModal` (**butang statik di-wire terus di `admin.js` + `renderAbout()` dipanggil dalam `refreshAdmin()` supaya berfungsi selepas login**); kategori di Tetapan; website + admin masing-masing ada butang Simpan sendiri (`webSaveBtn` hantar `{whatsapp, header}`, `adminSaveBtn` hantar `{admin}`); backup di kotak Data. Semua simpan via API admin + `reloadAll()`.
9. **Backup Excel:** Export Data jana 6 sheet kandungan (`Produk` tanpa `harga`, `Kategori`, `Testimoni` tanpa `gambar` + ada `link`, `Profil`, `Socmed`, `Tetapan` tanpa `siteName`/`themeColor`); Export Analisis jana 6 sheet (`Ringkasan/KlikProduk/KlikDemo/Events/DemoHarian/DemoTop`) — SheetJS CDN, perlu internet. Import pintar: baca sheet yang ada (fail data → kandungan sahaja, fail analisis → analytics sahaja, fail penuh → semua), gabung dengan data semasa supaya bahagian tiada dikekalkan, `confirmDialog()` sebut skop. `POST /api/admin/import` validasi+sanitasi di `py/backup.py`, overwrite semua **kecuali `admin`** — login tidak pernah diganti import.

## 6. Tugas Lazim

- **Tambah medan produk:** `py/server.py` (POST/PUT whitelist) + `index.html` input (`productModal`/`detailModal`) + `admin.js`/`app.js` body + `app.js` render.
- **Tambah halaman:** `<section id="page-X">` + butang `.nav-btn[data-page=X]` + kes `go()` (CSS `.page/.active` automatik). Nota: menu `tambah` telah dibuang — jangan hidupkan semula; produk baharu di Home, kategori di Tetapan.
- **Tukar kredensial:** Tetapan → Admin, atau `POST /api/admin/settings` `{admin:{username?, password?}}`.
- **Reset analytics real:** set `analytics.real={visitors:0,product_clicks:{},demo_clicks:{},whatsapp_clicks:0,events:[]}`.

## 7. Ujian Pantas (PowerShell)

```powershell
python -u py/server.py   # dari root; background semasa dev; henti via:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess) -Force
# Nota: JANGAN guna $pid sebagai nama pembolehubah (reserved).
node --check js/api.js; node --check js/app.js; node --check js/admin.js; node --check js/analytics.js; node --check js/ui.js; node --check js/backup.js
```

Aliran uji: `GET /api/data` (12 produk, tiada `harga`/`siteName`/`themeColor`, testimoni ada `link`) → login salah=401 → login betul → tambah produk=testimoni dengan `link`=ok → import payload salah=400 → import round-trip=ok → import tanpa auth=401 → padam data uji → kiraan kembali 12/8.

## 8. Gotcha Diketahui

- PowerShell `Invoke-RestMethod -Form` hantar `filename=` **tanpa petik** — parser telah dibaiki, jangan regress.
- `sys/data.json` ditulis semula penuh setiap mutasi — had events 5000 terakhir.
- Windows `SO_REUSEADDR` benarkan 2 proses bind port sama — pastikan hanya 1 server hidup (semak `Get-NetTCPConnection -LocalPort 8000`), else request berpecah antara proses lama/baharu.
- Port `8000` dalam `TIME_WAIT` selepas kill adalah normal; tunggu sebentar sebelum restart.

## 9. Migrasi Cloudflare — Fasa 2 (local, belum deploy)

- Data semasa ketika semakan: **107 produk, 12 kategori, 8 testimoni**, 6 fail upload. Angka contoh di atas bukan kiraan semasa.
- Akaun Wrangler disahkan `aizatsofian2000@gmail.com`; pengguna mengesahkan Workers Free. Pages `drexcel` lama masih disambung ke **`aizatsofian/MINE`**, auto-deploy aktif. Jangan push/deploy pengganti sebelum sambungan lama ditangani pada fasa launch.
- Repo sasaran `aizatsofian/drexcel` public, akses ADMIN. Tiada backup projek lama diminta. Jangan padam projek Pages bernama `drexcel`; gantikan kandungan supaya URL kekal.
- Backend baharu: `functions/api/[[path]].js` → `cloud/api.mjs`, `auth.mjs`, `store.mjs`, `validation.mjs`. Backend Python tidak diubah.
- D1 berasingan per rekod: produk, kategori, testimoni, dokumen settings/profile/socials, admin, sesi (hash token + TTL), had login, counters dan events (5000 terakhir). Mutasi SQL berparameter, import batch atomic, import tidak menyentuh admin/sesi. Tiada polling atau cron.
- `wrangler.jsonc` masih **local placeholder UUID**, bukan database production. Compatibility date `2026-10-12`: runtime ketika ujian menolak `2026-10-13` sebagai tarikh masa depan. Tiada D1 remote dicipta/dimigrasi lagi. Jangan deploy config placeholder.
- `package.json` pin Wrangler **4.149.0**, lockfile disertakan; audit semasa 0 vulnerability. `npm install` pada Google Drive G: gagal tulis; dependency dan emulator diuji di `C:\Users\aizat\AppData\Local\Temp\opencode\drexcel-phase2`. Kod utama tetap dalam root asal; folder temp hanya salinan ujian.
- Aliran local pada disk biasa: `npm ci`, `npm run db:local`, `npm run seed:local`, `npm run dev` (8788). Terminal lain: `npm test`, `npm run test:api`. Seed **menggantikan data emulator local sahaja** daripada `sys/data.json`, SQL sementara hash admin dipadam selepas digunakan. Password ujian lalai admin123; jika ditukar, gunakan environment `DREXCEL_TEST_PASSWORD`, jangan commit secrets.
- `scripts/build.mjs` hanya salin index, CSS, JS dan gambar ke `dist`; tidak salin `sys/data.json`, Python, Excel atau hash admin. `_routes.json` hanya `/api/*` invoke Functions; aset statik tidak menggunakan kuota Functions.
- Auth mengekalkan PBKDF2 100000 untuk hash Python sedia ada, Web Crypto comparison, cookie HttpOnly/SameSite Strict (+Secure pada HTTPS), origin checks dan 10 cubaan login/15 minit/IP. Cleanup sesi luput berlaku semasa login, bukan scheduler.
- Carta analytics agregasi SQL (tidak hantar semua events). `API.adminData('username')` untuk login UI baca username sahaja, tetapi export/import masih full admin data tanpa hash. PUT produk/testimoni no-op tidak menulis jika nilai sama; settings juga skip no-op.
- **Belum siap Fasa 3:** upload `/api/admin/upload` sengaja pulangkan 501 `github_upload_fasa_3`; integrasi GitHub/token belum dibuat. Frontend `reloadAll()` selepas mutasi dan carta request ketika buka Tetapan masih perlu dioptimumkan pada Fasa 3. Jangan dakwa frontend sudah fully optimized.
- **Sebelum production:** cipta D1 sebenar + preview berasingan, pindah data secara private (jangan commit JSON/hash/SQL seed), tukar password lalai, tambah GitHub secret, uji CPU Free runtime (emulator tidak membuktikan 10ms production), urus sambungan MINE dan deployment lama. Tiada upgrade berbayar atau deployment production dibuat dalam Fasa 2.

## 10. Fasa 3 — upload GitHub & request frontend

- Implementasi `cloud/uploads.mjs`: admin/origin gate di `cloud/api.mjs`; multipart limit 5MB + overhead, magic bytes PNG/JPEG/GIF/WebP, UUID unik di `images/uploads/`. SVG tidak lagi diterima oleh UI/endpoint Cloudflare (mengelakkan active content). Backend Python asal tidak diubah.
- Upload GitHub Contents API hanya ke `aizatsofian/drexcel`, branch `main` daripada vars, secret `GITHUB_TOKEN`. Respons hanya `{ok,path}` dengan URL raw **commit SHA immutable**, bukan link GitHub HTML. Tidak memerlukan redeploy Pages untuk gambar tersedia; GitHub raw ada limit/ketersediaan sendiri, bukan jaminan CDN. Upload tidak automatik simpan produk/profile/logo: admin masih klik Simpan. Gambar yang upload tetapi tidak disimpan boleh kekal orphan dalam repo; tiada cleanup berkala.
- Commit gambar menggunakan `[skip ci]`; sebelum launch pastikan Pages auto-build juga mengecualikan `images/uploads/*` supaya upload tidak mencetuskan build berulang. Ini belum dikonfigurasi remote. Concurrent GitHub commit boleh konflik; API pulangkan `github_conflict_cuba_semula`, tidak retry automatik/berkala.
- Token **belum ditetapkan**, tiada commit upload sebenar dibuat. Mock menguji encoding, destinasi tetap, URL commit, fail besar/SVG, permission gagal dan tiada token bocor. Ujian sebenar masih perlu selepas secret.
- Cipta fine-grained PAT dalam GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens, pilih ONLY `aizatsofian/drexcel`, Contents Read and write, expiry yang sesuai. Jangan beri Actions/Workflows permission atau hantar token dalam chat.
- Untuk ujian local pada C: jalankan `scripts/set-github-token.ps1 -Directory 'C:\Users\aizat\AppData\Local\Temp\opencode\drexcel-phase2'` dari projek utama. Input disembunyikan; `.dev.vars` plaintext private, ignored Git, bukan Cloudflare secret. Restart emulator selepas set. Jangan salin `.dev.vars` ke repo, dist atau chat. Skrip tidak menimpa secret sedia ada.
- Secret Cloudflare Pages (preview/production) ditetapkan semasa persediaan deployment; PAT local tidak automatik dihantar. Gunakan prompt `wrangler pages secret put GITHUB_TOKEN --project-name drexcel` mengikut environment/help semasa, atau dashboard Encrypt variable. Jangan masukkan token dalam argumen command.
- `API.data()` cache memory satu load per buka website, concurrent load dideduplikasi. `reloadAll()` render data cache selepas mutasi; produk/testimoni dikemas kini daripada response item, padam local selepas API berjaya, rename kategori kemas kini produk cache. Fallback Python atau respons tidak lengkap invalidate dan baca semula sekali. Import invalidate cache supaya load semula sekali selepas berjaya. `reloadAll(true)`/refresh browser boleh paksa bacaan.
- No-op PUT/kategori/settings tidak request jika nilai cache sama; nested profile/socials hantar medan berubah sahaja. Admin password kosong + username sama juga tidak request.
- Carta cache dalam sesi sehingga klik Refresh (`API.analytics(true)`), import atau logout. Tiada refresh automatik selepas analytics event. Search/filter/navigasi biasa local. Pelawat lain perlu refresh untuk menerima perubahan admin; tiada push/polling/cron.
- Ujian: `npm test` untuk validation/upload mock/frontend request count; `npm run test:api` pada emulator local. Belum menguji GitHub sebenar, preview remote, CPU Free bagi fail 5MB atau runtime browser interaktif.

### Fasa 3 — keputusan ujian GitHub sebenar

- Token baharu dibaca daripada `.dev.vars` folder emulator C: sahaja, nilainya tidak dipaparkan. Akses repo public `aizatsofian/drexcel` disahkan.
- `node scripts/test-github-upload.mjs` berjaya melalui login + API admin emulator: satu PNG 1x1 ditambah ke `images/uploads/`, commit `69be4895dc795d2388890af5729201e7ea927086`. URL raw commit memberi HTTP 200 dan bytes tepat. Fail ujian itu kekal dalam repo; tidak digunakan oleh produk. Kiraan 107 produk tidak berubah.
- Pembetulan runtime: Cloudflare fetch tidak menyokong `redirect:'error'`; gunakan `redirect:'manual'` dan tolak semua respons bukan 2xx. Jangan ikut redirect dengan token Authorization.
- Hentikan **proses Wrangler parent** bersama workerd selepas ujian. Membunuh workerd sahaja menyebabkan Wrangler restart runtime, dan Windows membenarkan beberapa proses bind port sama; ujian boleh terkena server lama tanpa secret.
- `md/3link.md` diabaikan Git kerana pernah mengandungi token terdedah. Jangan baca/publish nilai token lama. Token lama mesti revoked oleh pengguna; token baharu tidak disimpan di Markdown. Secret production belum ditetapkan.
- Fasa 3 kod + integrasi upload gambar kecil local selesai. Fasa 4 masih perlu: preview cloud, D1 remote berasingan, secret preview, CPU Free untuk login/import/upload besar dan ujian UI. Website lama production tidak disentuh.

## 11. Fasa 4 — preview Cloudflare siap diuji

- Pengguna memilih preview **public + admin password rawak**. Preview: **https://phase4-preview.drexcel.pages.dev** (deployment https://67299b97.drexcel.pages.dev), branch `phase4-preview`. Jangan guna `--branch main` sehingga Fasa 5 dibenarkan.
- Akaun `73e7467a6ed7bcfecb494211d7a9e282`; Workers Free disahkan pengguna. D1 ujian **drexcel-preview**, UUID **468597aa-cc71-47ed-94d3-8532bf63c081**, lokasi APAC/HKG. `env.preview` dalam `wrangler.jsonc` gunakan DB ini; top-level masih placeholder local, **bukan production**.
- Migrasi remote preview + seed 107 produk/12 kategori/8 testimoni selesai. `node scripts/seed.mjs --preview` mengesahkan identiti DB dan admin table kosong sebelum seed; menolak overwrite preview berisi. Password preview random menggantikan admin123 untuk preview sahaja, tidak ubah JSON/Python local.
- Kredensial preview private di `C:\Users\aizat\AppData\Local\Temp\opencode\drexcel-phase2\.wrangler\preview-admin.json`. Buka local dengan Notepad jika mahu login. Jangan commit/publish/hantar dalam chat. Password production belum diputuskan.
- GitHub PAT dimasukkan melalui API Pages PATCH **deployment_configs.preview.env_vars.GITHUB_TOKEN** sebagai `secret_text`; tidak mengubah secret/config production. Elakkan `pages secret put` tanpa scope: CLI ini tidak menawarkan env flag dan boleh menyentuh production. Nilai secret tidak dalam source/config/artifact.
- Ujian remote `node scripts/test-preview.mjs`: admin123 ditolak 401, login random berjaya, cookie HttpOnly/Secure/SameSite Strict, CSRF 403, CRUD/rename/concurrent likes/settings/analytics, import invalid/unauth, import round-trip tidak tukar admin. Data ujian dipulihkan dan sesi test logout.
- PNG **5,072,913 bytes (~4.84 MiB)** berjaya upload dari Functions Cloudflare ke GitHub (200), URL raw commit bytes tepat. Satu gambar noise ujian besar kini kekal dalam `images/uploads/`, tidak dipakai produk. Kejayaan request dalam pelan Free bukan jaminan semua saiz/semua trafik bebas CPU errors; belum menguji import 5000 events maksimum.
- `scripts/test-preview-ui.mjs` headless Edge isolated (Playwright dipasang hanya dalam folder temp, bukan dependency production): desktop 1280x900/mobile 390x844, carian/filter/navigasi tiada extra data request, carta cached + explicit Refresh, no-op website/admin save tiada request, SheetJS sebenar export dua workbook dan import data workbook, logout selesai, tiada JS errors/overflow mobile. Idle 6 saat tidak menghasilkan request API; kod tiada polling/cron. Screenshots/report private dalam `.wrangler/` folder temp.
- Production deployment **188faf7d-d93b-409a-9271-ad05fa6e8715** dan hash konfigurasi production disahkan **tidak berubah** selepas deploy preview. Sambungan lama `MINE` masih aktif; belum dipadam/ditukar. Semua remote writes Fasa 4 terhad DB/config/deployment preview, selain satu commit gambar ujian di repo sasaran.
- Fasa 5 belum dibuat: cipta DB production berasingan, seed data private + password selamat, secret production, hentikan auto-deploy MINE, publish kod terpilih tanpa data/secrets ke GitHub, deploy branch main, uji URL production dan urus deployment lama tanpa padam projek bernama drexcel.

## 12. Fasa 5 — PRODUCTION LIVE

- **Website rasmi: https://drexcel.pages.dev**. Production deployment `f7fcaabc-1fae-49a5-8c2e-d2c93b2a48fb`, URL deployment https://f7fcaabc.drexcel.pages.dev. Preview https://phase4-preview.drexcel.pages.dev kekal berasingan.
- D1 production **drexcel-production**, UUID **94f04e42-b38a-4e78-8806-947157fa760c**, APAC/NRT, terikat melalui `env.production`. Migrasi+seed 107 produk/12 kategori/8 testimoni, profil/settings/socials/likes/analytics dipindahkan daripada JSON local semasa. JSON local tidak diubah. Jangan reseed DB production berisi; skrip menolak overwrite apabila admin table tidak kosong.
- Password admin production rawak baharu; **admin123 tidak berfungsi online**. Kredensial private di `.wrangler/production-admin.json` dalam root projek asal (juga salinan folder emulator C:). Buka dengan Notepad secara local; jangan commit/hantar dalam chat. Login boleh ditukar melalui Tetapan → Admin. Preview menggunakan password berbeza.
- Secret `GITHUB_TOKEN` production dipasang sebagai encrypted `secret_text`, tidak dalam kod/GitHub/dist. Upload terus melalui admin ke GitHub berjaya diuji online; URL raw commit tidak memerlukan redeploy. Tiada R2/pelan berbayar diaktifkan.
- **10 deployment website lama sudah dipadam**, tanpa backup kod/data lama. Pages project bernama drexcel dikekalkan untuk URL. Kini hanya production baharu + preview Fasa 4. Repo `MINE` tidak dipadam; sambungan Git lamanya masih tercatat tetapi `deployments_enabled=false`, `production_deployments_enabled=false`, `preview_deployment_setting=none`. Tidak ada auto-deploy dari repo lama. Projek lain dalam akaun tidak disentuh.
- Kod baharu disimpan di repo **https://github.com/aizatsofian/drexcel**, branch main, commit aplikasi awal `1a8d987` (commit gambar/docs susulan boleh lebih baharu). Kod dipublish melalui staging clone bersih `C:\Users\aizat\AppData\Local\Temp\opencode\drexcel-publish`; root asal pada Google Drive masih bukan Git repo. Gambar sedia ada repo dikekalkan, bukan ditimpa.
- Git hanya kandungan terpilih: frontend/backend cloud/migrasi/scripts/tests/CSS/Python/gambar. `sys/data.json`, `.dev.vars`, `.wrangler`, fail Excel, `md/3link.md`, hash admin sebenar/token PAT tidak dipublish. Fail private dalam build dicegah oleh `scripts/deploy.mjs`.
- Deployment **manual** melalui Wrangler, bukan push-trigger GitHub. Dari disk C: selepas `npm ci`, `npm run deploy:production` (main) atau `npm run deploy:preview` (phase4-preview). Jangan deploy dari root Google Drive dengan node_modules rosak; gunakan folder disk biasa. `scripts/build.mjs` menyokong fresh clone walaupun folder image kosong tidak wujud. Jangan upload root keseluruhan sebagai Pages assets.
- Ujian production `scripts/test-production.mjs` (Playwright hanya folder temp): default password ditolak, login random/cookie selamat, private paths tidak bocor, upload PNG melalui UI, tambah produk/simpan tanpa reload penuh, semak persist dari API, padam hanya produk ujian, cache chart/no-op settings saves, Excel export, desktop/mobile tanpa JS errors/overflow, idle tanpa polling. Kiraan kembali 107; **tiada import/overwrite seluruh DB production dalam ujian**. Satu PNG ujian public kekal dalam repo, tidak dipakai produk.
- Laporan/screenshot private di `.wrangler/production-test-result.json` dan `.wrangler/screenshots/production-*.png` folder emulator. Data masih local+online berasingan: perubahan admin online disimpan dalam D1, bukan JSON/Excel/GitHub kod. Gunakan Export Data/Analisis untuk backup data baharu jika diperlukan.

## 13. Fasa 6 — Harga, Bayar, Sijil & Checkout (belum deploy)

- **Skop jawapan pengguna:** harga RM auto-kira % (`(sebelum-selepas)/sebelum`, produk lama kosong = tiada harga), kotak bayar = nama bank + no akaun + penama + QR bank/TnG (tiada medan ke-4), bukti bayaran manual di WhatsApp (tiada upload resit), sijil = gambar `uploads/` sahaja, backend full Python + D1 + Excel.
- **Umum:** bottom nav teks + ikon sentiasa nampak (`sys/style.css` buang sorok label); butang `Admin` pindah dari footer global ke dalam menu Socmed bawah-kanan; `<title>` statik `Koleksi Dr Excel`.
- **Produk:** skema baharu `harga_sebelum/harga_selepas` (nombor ≥0, default 0 = tiada harga). Kad Home + view popup + bakul tunjuk `sebelum (potong) | -% | selepas`. View popup: badge kategori kiri-atas + like kanan-atas dalam gambar. Edit popup: gambar + butang `Tukar` kanan-atas, nama, kategori, description, harga sebelah-menyebelah, link video, 1 baris `Batal|Simpan|Padam`; butang Video/+Bakul disorok ketika mod edit.
- **Bakul:** butang Buang jadi ikon 🗑️; harga di kiri ikon; badge `-%` kiri-atas gambar; kotak jumlah baharu angka ke kanan (`total sebelum | % | total selepas`). Checkout buka `#checkoutModal` 5 kotak (butiran pelanggan / info bank / QR / tick bayar / Batal-Hantar); Hantar buka WhatsApp nombor Tetapan dengan mesej nama/no/email/socmed/status/senarai produk + `ini bukti bayaran saya`.
- **Step Dapatkan Sistem:** kandungan `settings.steps` (teks multiline, had 5000), kotak di Bakul bawah jumlah, admin Edit inline.
- **Tentang:** profil tambah `link` (URL tunggal) + `sijil[]` (≤20 URL gambar). View 5 kotak (gambar/nama/biodata/link/sijil 2-kolumn klik magnify `#sijilModal`). Edit modal susun: gambar → nama → biodata → link → upload multiple sijil. Medan lama `kepakaran/penerangan` dikekalkan dalam data + Excel, tidak dipapar UI.
- **Socmed:** kunci baharu `telegram`, `other` (jumlah 9). Ikon SVG inline sebenar (`SOCMED_SVG` di `js/app.js`), bukan emoji.
- **Tetapan:** buang teks penerangan kotak Data + buang `miniNote`; tajuk carta jadi `Analisis`; kotak baharu `Bayar` (nama/no/penama + upload QR bank/TnG) simpan top-level settings.
- **Backend:** `migrations/0002_prices.sql` tambah `harga_sebelum/selepas` (NOT NULL DEFAULT 0) — **wajib `wrangler d1 migrations apply` pada local + preview + production sebelum deploy kod baharu**, else INSERT/SELECT harga gagal. Python (`server.py`, `backup.py`, `analytics.py`) + Cloud (`validation.mjs`, `api.mjs`, `seed.mjs`) + Excel (`backup.js`: Produk +2 kolum, Profil +`link/sijil`, Socmed/Settings +kunci baharu) semuanya dikemaskini; import lama tanpa kolum baharu masih sah (default 0/kosong). `sys/data.json` local tidak dimigrasi (107 produk tiada harga = papar tanpa harga).
- **Ujian semasa:** `node --check` semua JS/Cloud/scripts OK; `node --test tests/*.test.mjs` 7/7 lulus; `py_compile` OK; `validate_import(sys/data.json)` OK dengan defaults. Belum uji: emulator D1 + migrasi 0002, preview remote, production deploy, UI browser.

## 14. Fasa 6b — Baiki popup & padam gambar lama (belum deploy)

- **Skop jawapan pengguna:** replace sahaja (tiada purge orphans), refcount selamat (kongsi = jangan padam), kedua-dua backend (Python + GitHub delete, gagal tidak block Simpan), preview-then-Simpan (Batal = lama kekal, fail preview jadi orphan dibiarkan).
- **Image 1 (scroll):** `#aboutModal .modal-card` max-height 88vh + overflow auto; `#aSijilList` scroll dalaman 32vh. Modal checkout sama.
- **Image 2 (nama|link):** view Tentang gabung nama (kiri, flex) + `Lihat site` (kanan) dalam satu `.row`; pautan penuh jika tiada link.
- **Image 3 (1 gambar):** popup edit produk kini 1 gambar `#dImg` sahaja — badge kategori/like (view) ↔ butang `Tukar` overlay bawah-kanan (edit). Upload = preview sahaja; `Batal` pulihkan gambar asal.
- **Image 4 (checkout):** QR `flex-direction: column` (vertical); `#coBankBox` wrap + small block (penama tidak tersorok); input flex-shrink 0.
- **Padam gambar lama:** Python `py/uploads.py` (`is_local_upload`, `collect_refs`, `remove_if_orphan`) hook dalam `PUT/DELETE products` + `POST settings` (gambar profil/sijil dibuang, logo/QR diganti) — hanya `uploads/*` local, double-check refcount dalam lock, gagal senyap. Cloud `cloud/uploads.mjs` (`repoPathFromStored`, `deleteGithubFile` GET-sha→DELETE) + `cleanupRepoPaths` di `cloud/api.mjs` (banding ikut repoPath supaya URL raw-SHA dan path repo dianggap sama; background via `ctx.waitUntil`, fallback await) hook titik sama. Laluan luar (`http...`, `uploads/` lama Python, picsum) tidak disentuh.
- **Ujian baharu:** `tests/uploads.test.mjs` +2 (repoPath parse, delete GET→DELETE + gagal senyap). Semasa: `node --test` 9/9 lulus; `collect_refs` sahkan `uploads/1 (1).png` kongsi masih dirujuk. Belum uji: emulator/upload sebenar, GitHub delete sebenar, preview/production deploy.

## 15. Fasa 6c — Nota bakul + buang tajuk Sijil (belum deploy)

- **Skop jawapan pengguna:** kotak Nota local + hantar WA; field `nama sistem (optional) + .web.app` dan validasi format **ditangguh — tak perlu dulu**; popup sijil kekal fungsi sedia ada.
- **Bakul — Nota:** `#notaCard` baharu di `index.html` (atas `#stepCard`) — tajuk `Nota (nak custom, demo etc)` + `textarea#notaText` (`cth: nak demo, nak custom...`). Nilai simpan `localStorage["nota"]` setiap input (`js/app.js` init), dimuat semula bila buka. `sendCheckout()` baca textarea (fallback localStorage) dan tambah baris `nota : ...` dalam mesej WhatsApp selepas `status` jika tidak kosong; kosong = baris tiada. Tiada perubahan backend/D1/Excel — Nota bukan medan server.
- **Tentang — buang Sijil:** `renderAbout()` di `js/app.js` buang `<b>Sijil</b>`, grid gambar kekal; klik gambar → `#sijilModal` magnify kekal (tutup klik-luar), tiada butang zoom/tutup baharu. Label `Sijil` dalam `#aboutModal` (admin edit) dikekalkan supaya admin tahu medan upload.
- **Ujian semasa:** `node --check js/app.js` OK. Belum uji: emulator D1, preview remote, production deploy, UI browser.

## 16. Fasa 7 — Deploy Fasa 6/6b/6c LIVE (13 Okt 2026)

- **Status: LIVE.** Preview https://phase4-preview.drexcel.pages.dev (deployment `3e37c71a`), production https://drexcel.pages.dev (deployment `c99ed6f0`). Kod GitHub main commit `0afd010` (19 fail, +`migrations/0002_prices.sql` baharu). Gambar/repo sedia ada tidak ditimpa; root `1 (1..5).png` dan `images/uploads/*` dikekalkan.
- **Migrasi:** `0002_prices.sql` applied preview + production (`harga_sebelum/harga_selepas` disahkan via PRAGMA). Ujian `npm test` 9/9 lulus, `npm ci` 0 vulnerability, `npm run build` OK sebelum deploy.
- **Verifikasi preview:** HTML ada `#notaCard/#notaText`, `js/app.js` ada `notaText`, `GET /api/data` ada `harga_sebelum/harga_selepas`, kiraan 107 produk kekal.
- **Verifikasi production (read-only, tiada tulis DB):** HTML ada notaCard/notaText, produk pertama `p01` ada kedua-dua medan harga, kiraan 107 kekal. Tiada reseed/import overwrite production.
- **Prosedur dipakai:** sync terpilih G: → staging `drexcel-publish` (18 ubah + 1 baharu, tanpa gambar/private), `npm ci` di disk C:, migrasi preview → deploy preview → sahkan → migrasi production → deploy production → sahkan → push main. Deploy manual Wrangler 4.149.0, bukan push-trigger.

## 17. Repair data — website ikut local (13 Okt 2026)

- **Punca:** `data.xlsx` (96 produk, katalog lama berharga) diimport ke local, `sys/data.json` local berubah 107→96 produk dan tidak lagi sama dengan website (production 107 produk, katalog baharu tanpa harga).
- **Keputusan pengguna (disahkan 2x):** website ikut local + skop semua kecuali admin + `data.xlsx` dikekalkan. Tindakan destruktif ini direkod di sini.
- **Backup dahulu:** export penuh production (admin data + analytics) ke `C:\Users\aizat\AppData\Local\Temp\opencode\prod-backup-2026-10-13-04-45-33.json` (private, bukan dalam repo). Gunakan fail ini untuk rollback jika perlu.
- **Diff sebelum tulis:** padam `p97`–`p107` (11 produk), ganti 96 produk (nama/kategori/demo/likes berbeza; local ada `harga_sebelum/selepas`), settings/profil/socmed berbeza, analytics 25→19 pelawat. Kategori 12=12 sama, testimoni 8=8 sama.
- **Baiki kredensial:** `.wrangler/production-admin.json` di root G: lapuk (password 3 aksara, login 401); disegerakkan semula dari salinan C: yang sah (32 aksara). Jangan edit manual.
- **Pelaksanaan:** pra-validasi `cleanImport()` local OK (96/8) → `POST /api/admin/import` ke production 200 `{"ok":true}` → verifikasi `GET /api/data` 96/12/8, `p01` local + harga 210/90 → login admin selepas import OK (import tidak sentuh admin). Skrip sementara (bukan repo): `prod-backup-diff.mjs`, `prod-import-local.mjs` dalam folder temp C:.
- **Nota:** data local dan website kini sama (96 produk). `data.xlsx` dikekalkan atas permintaan — import semula fail itu akan mengulangi mismatch; arkibkan jika tidak diperlukan lagi.

## 18. Sync gambar uploads/ ke website (13 Okt 2026)

- **Kenapa gambar tak ikut:** `/api/admin/import` hanya pindah data JSON — medan `gambar` cuma teks laluan, fail binari tidak dihantar. Sync kod Fasa 7 pula sengaja salin kod sahaja (gambar repo dikekalkan). Website hidang gambar sebagai fail statik dari repo ketika deploy — jadi 91/96 fail tiada (lagi 5 nama sama tapi kandungan lain), dan URL tiada pula fallback ke `index.html` (HTML 200, bukan PNG) → gambar produk pecah/salah.
- **Baiki (diluluskan pengguna):** salin 96 PNG yang dirujuk katalog dari `uploads/` local ke repo (termasuk timpa 5 konflik dengan versi local, fail lain cth `1791815152_2db55121.jpg` dikekalkan), commit `c3d9593`, push main, rebuild + redeploy production (`9a2b5b63`).
- **Verifikasi live:** `uploads/1 (1)/(10)/(50)/(96).png` semua `image/png` dengan saiz tepat (161047/144633/209599/197629 bytes).
