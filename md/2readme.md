# 2README — Website Koleksi Sistem (panduan sambungan kerja)

> Baca fail ini sahaja untuk sambung kerja. Rujuk kod hanya bila ubah bahagian spesifik.
> **Production LIVE: https://drexcel.pages.dev** (preview: https://phase4-preview.drexcel.pages.dev).
> Local = Python + `sys/data.json` (login `admin/admin123`). Online = Pages Functions + D1 + upload GitHub (password rawak, BUKAN admin123).

## 1. Status & Cara Jalan

- **Status:** Live. Data semasa: **96 produk, 12 kategori, 8 testimoni** (local dan production sama sejak repair Seksyen 11).
- **Jalan local:** klik `buka.bat`, atau `python py/server.py` dari root (port `8000`, bind `127.0.0.1`, stdlib sahaja).
- **Login admin:** butang `Admin` dalam menu Socmed bawah-kanan → popup. Local: `admin / admin123`.
- **Stack:** HTML+CSS+JS vanilla (tiada framework), Python stdlib, `sys/data.json`. Satu dependency luar: SheetJS via CDN (perlu internet untuk Export/Import sahaja).

## 2. Peta Fail (keadaan semasa)

| Fail | Peranan |
|---|---|
| `index.html` | 6 halaman (`home/bakul/testimoni/tentang/socmed/tetapan`). Bottom nav teks+ikon. Tiada topbar. `#announceBar` sticky atas sekali (teks `settings.pengumuman`, klik buka WA, X tutup sesi semasa). Home: header `.home-head` sticky 1-baris (logo + tajuk `settings.header` + search `hSearch` + filter `hCat`) + butang `Edit` (admin) → `productModal`. Bakul (atas→bawah): `#infoCard` (nama / wasap+email / socmed / nota) + butang Transfer\|QR Bank\|QR TnG → `#bayarModal` (imej QR tanpa label teks) + radio status bayar (`bayarDah/bayarBelum`, default belum) + `#cartList` + `#jumlahCard` (jumlah + Empty/Hantar) + `#stepCard`. Tentang: kad gambar/nama+link/biodata/sijil. Socmed: grid 9 + butang `Admin` bawah-kanan. Tetapan: Logout atas sekali, kotak Website (`sWhatsapp/sHeader/sLogo` + `sPengumuman`) / Kategori / Bayar / Analisis (`#miniChart` garis + `#topChart` Top 10) / Admin / Data (row1 Export Data\|Export Lain, row2 Export Analisis\|Import). Modal: login/detail/testimoni/product/about/bayar/sijil/confirm + `#waFloat` + toast/loader |
| `sys/style.css` | Tema biru-emas (`--theme:#2563eb`, `--theme-dark:#1e3a8a`, `--accent:#d4a017` emas; bar pengumuman gradient emas teks gelap; butang WA kekal hijau brand), radius 16px, shadow berlapis, hover lift (desktop), butang gradient, nav blur + pill aktif, `.home-head` sticky, `.announce-bar` sticky atas + `.announce-close`, `.hbar` bar melintang Top 10, animasi `fadeUp`, `.wa-float` bulatan 58px bawah-kanan atas nav. Jangan ganti nama class/ID (hook JS) |
| `js/app.js` | State `S`, router `go()` (+`updateWaFloat()` sorok butang di Tetapan), `reloadAll()`, `renderAnnounce()` (teks `settings.pengumuman`, kosong/session-hide = sorok; klik bar → WA mesej `saya nak <teks bar>` via `openAnnounceWa()`), kad produk (badge kategori+like, Video/+Bakul), popup detail (view → Edit: nama/kategori/penerangan/harga/gambar+upload), Bakul (`localStorage["bakul"]`, harga sebaris `sebelum\|-%\|selepas`, tiada badge dalam gambar; `openBayar()` popup transfer/QR; `sendHantar()` terus WA tanpa modal), Nota (`localStorage["nota"]` → baris `nota :` dalam WA), Tentang (sijil klik → magnify), Socmed SVG (`SOCMED_SVG`, 9 kunci), `#waFloat` → `wa.me` mesej `Assalamualaikum Dr Excel. saya nak sistem ... ` + senarai bakul |
| `js/admin.js` | `refreshAdmin()`, gate `.admin-only`, tambah produk (Home), CRUD kategori (Tetapan), testimoni/tentang/socmed mod Edit, simpan website (`whatsapp/header/logo/pengumuman`)/admin/bayar, upload, Logout `#logoutBtn` |
| `js/backup.js` | Export Data (Produk+Kategori) / Export Lain (Testimoni,Profil,Socmed,Tetapan) / Export Analisis (6 sheet). Import separa gabung per-bahagian (sheet tiada → null → kekalkan semasa), skop dinamakan dalam confirm. Kepakaran/sijil pisah `;` |
| `js/api.js`, `js/ui.js`, `js/analytics.js` | Wrapper `API.*` (+cache data, no-op skip, carta cache); `toast/showLoader/confirmDialog/esc`; carta garis mini Analisis + `topBarsHTML()` Top 10 gabungan klik produk+demo (`r.real.top10`) |
| `py/` | 7 modul (`server`,`config`,`store` lock+atomic,`auth` pbkdf2+sesi 12j,`analytics`,`uploads` multipart,`backup.validate_import`). Jalan mesti dari root |
| `cloud/` + `functions/api/[[path]].js` | Backend online (Wrangler): `api.mjs` (admin/origin gate, `ctx` ketiga untuk cleanup background), `auth.mjs` (PBKDF2 100k, cookie Strict+Secure, had 10 login/15min/IP), `store.mjs`, `validation.mjs` (`cleanImport`), `uploads.mjs` (PNG/JPEG/GIF/WebP ≤5MB, UUID ke `images/uploads/`, SVG ditolak; padam via GET-sha→DELETE, gagal senyap). Python tidak diubah untuk Cloudflare |
| `migrations/` | `0001_initial.sql`, `0002_prices.sql` (`harga_sebelum/selepas`). Wajib apply sebelum deploy kod baharu |
| `scripts/` | `build.mjs` (salin index/sys/js/image/uploads → `dist`; sokong clone kosong), `deploy.mjs` (semak target DB + tiada fail private dalam dist; deploy `main`/`phase4-preview`), `seed.mjs` (tolak overwrite bila admin wujud), `test-*.mjs` (preview/production/API/UI) |
| `uploads/` | Gambar local (`uploads/<nama>`). Dibenar png/jpg/jpeg/webp/gif/svg ≤5MB |
| `sys/data.json` | DB local (produk, kategori, testimoni, profil, socmed, settings 10 kunci termasuk `pengumuman`, admin hash, analytics). Laluan di `py/config.py` |
| `data.xlsx` | DIKEKALKAN atas permintaan — import semula akan ulangi mismatch Seksyen 11. Arkibkan jika tidak perlu |
| `md/1prom.md` | Spesifikasi asal (rujukan) |

## 3. Kontrak API (Python + Cloud sama bentuk)

Public: `GET /api/data` (tiada admin.hash) · `POST /api/track` (`visit\|product\|demo\|whatsapp`) · `GET /api/session` · `POST /api/login|logout` · `POST /api/like` (`{produk}`→`{ok,likes}`).
Admin (cookie, else 401): `GET /api/admin/data|analytics` · CRUD `products|categories|testimonials` · `POST /api/admin/settings` (`whatsapp/header/logo/pengumuman/steps/bank_* /qr_*/profile*/socials(9)/admin`) · `POST /api/admin/import` (overwrite semua **kecuali admin**; format salah → 400) · `POST /api/admin/upload` (→`{ok,path}`; Cloud: URL raw commit-SHA).
Nota: respons cipta/kemaskini item ialah `{ok,item}` (BUKAN `product`). Laluan lain → statik (fail tiada → `index.html`, status 200!).

## 4. Skema Data (ringkas, semasa)

```json
{
  "products": [{"id":"p..","nama":"","gambar":"uploads/..","penerangan":"","kategori":"","demo":"","likes":0,"harga_sebelum":0,"harga_selepas":0}],
  "categories": ["Pendidikan","Automasi","Jualan","Analisis","Tempahan","Acara","Kesihatan","Projek","Operasi","Sumber Manusia","Hartanah","Kewangan"],
  "testimonials": [{"id":"t..","nama":"","rating":5,"komen":"","link":""}],
  "profile": {"nama":"","biodata":"","kepakaran":[],"penerangan":"","gambar":"","link":"","sijil":[]},
  "socials": {"whatsapp":"","tiktok":"","telegram":"","threads":"","facebook":"","instagram":"","linkedin":"","youtube":"","other":""},
  "settings": {"logo":"","whatsapp":"601..","header":"","pengumuman":"Custom Website rm140 saja","bank_nama":"","bank_no":"","bank_penama":"","qr_bank":"","qr_tng":"","steps":""},
  "admin": {"username":"admin","password_hash":"pbkdf2$..."},
  "analytics": {"real": {"visitors":0,"product_clicks":{},"demo_clicks":{},"whatsapp_clicks":0,"events":[]}, "demo": {"label":"demo", "...": 0}}
}
```

## 5. Deploy (manual Wrangler — auto-deploy Git DIMATIKAN sengaja)

- Akaun `73e7467a6ed7bcfecb494211d7a9e282` (Workers Free). D1: preview `468597aa-…` (HKG), production `94f04e42-…` (NRT). Repo kod: `aizatsofian/drexcel` (main). Wrangler pin **4.149.0**.
- Root G: (Google Drive) BUKAN git repo — kerja staging di `C:\Users\aizat\AppData\Local\Temp\opencode\drexcel-publish` (jangan `npm install` di G:).
- Aliran: sync fail terpilih G:→staging (KOD sahaja; gambar sedia ada jangan ditimpa; JANGAN sentuh `sys/data.json`, `.dev.vars`, `.wrangler`, Excel, `md/3link.md`, secrets) → `npm ci` → `npm test` → `npm run build` → migrasi D1 jika ada (`migrations list/apply --remote --env preview|production`) → `deploy:preview` → sahkan → `deploy:production` → sahkan → commit+push main.
- Ujian tulis production hanya dengan cleanup penuh (cipta→padam, id disahkan; JANGAN like — tidak boleh undur; JANGAN import/overwrite DB). Gambar ujian kecil dibuang semula dari repo.
- Jika push ditolak (commit gambar `[skip ci]` masuk dahulu): `pull --rebase`, push semula.
- JANGAN padam projek Pages `drexcel` (URL kekal). JANGAN reseed DB berisi (skrip menolak). Badge `Deployment paused`/rujukan MINE = sambungan lama yang dimatikan — jangan resume; unlink penuh hanya via dashboard.

## 6. Rahsia & Pantang

- Password admin online rawak: preview di `drexcel-phase2/.wrangler/preview-admin.json`, production di root `.wrangler/production-admin.json` (G: disegerak dari C:). Buka dengan Notepad. JANGAN commit/publish/hantar dalam chat. Boleh tukar via Tetapan → Admin (import tidak sentuh admin).
- `GITHUB_TOKEN`: `.dev.vars` local (input tersembunyi via `set-github-token.ps1`), secret preview/production via API Pages `deployment_configs.*.env_vars` (JANGAN `pages secret put` tanpa skop). PAT fine-grained: ONLY repo drexcel, Contents Read+write.
- Backup production pra-repair: `C:\Users\aizat\AppData\Local\Temp\opencode\prod-backup-2026-10-13-04-45-33.json` (rollback). `uploads/1791815152_2db55121.jpg` dikekalkan untuk rollback yang sama.
- Fail/Command sementara (bukan repo) duduk di `C:\Users\aizat\AppData\Local\Temp\opencode\` (`prod-*.mjs`, `test-split-backup.mjs`, `audit-*.txt`).

## 7. Ujian Pantas (PowerShell)

```powershell
python -u py/server.py   # background dev; henti:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess) -Force
# JANGAN guna $pid sebagai nama pembolehubah (reserved).
node --check js/api.js; node --check js/app.js; node --check js/admin.js; node --check js/analytics.js; node --check js/ui.js; node --check js/backup.js
npm test   # dari staging C: (9 ujian)
```

Aliran: `GET /api/data` (kiraan + `harga_*` + `link` testimoni) → login salah 401 → login betul → CRUD + upload + padam → kiraan kembali asal → logout.

## 8. Gotcha

- `Invoke-RestMethod -Form` hantar `filename=` tanpa petik — parser sokong dua format, jangan regress. urllib Python tanpa User-Agent kena 403 Cloudflare — guna Invoke-WebRequest.
- Windows benarkan 2 proses bind port sama — pastikan 1 server (`Get-NetTCPConnection -LocalPort 8000`); `TIME_WAIT` selepas kill adalah normal.
- Cloudflare fetch: `redirect:'manual'`, tolak bukan-2xx (jangan ikut redirect bawa token). Bunuh proses Wrangler **parent** + workerd (jangan workerd sahaja).
- Import hanya pindah JSON — gambar binari mesti disync ke repo + redeploy (gambar tiada → fallback `index.html`, pecah senyap).
- Tertunda: medan `nama sistem + .web.app` (Fasa 6c); `logo=uploads/logo.jpg` tiada di mana-mana (fallback teks); browser interaktif + SheetJS sebenar di production belum diuji.

## 9. Sejarah Ringkas (detail lama dipadat — fakta operasi di atas adalah sah)

- **Fasa 2 (migrasi Cloud):** backend `cloud/` + D1 per-rekod + `wrangler.jsonc` (placeholder local; `env.preview/production` sebenar) + `build.mjs`/`deploy.mjs` + cache/no-op frontend. Emulator di `drexcel-phase2` (C:).
- **Fasa 3 (upload GitHub + request):** `cloud/uploads.mjs`, commit `[skip ci]`, URL raw SHA; `API.data()` cache + `reloadAll` tanpa reload penuh. Token: PAT fine-grained, secret via API Pages.
- **Fasa 4 (preview):** D1 preview + seed 107/12/8 + password rawak + secret preview + ujian remote/UI (Edge headless, folder temp). Production tidak disentuh.
- **Fasa 5 (LIVE):** D1 production + seed + password rawak + secret production; 10 deployment lama dipadam; auto-deploy MINE dimatikan; kod ke GitHub via staging bersih; deploy manual; ujian production dengan cleanup.
- **Fasa 6 (harga/bayar/sijil/checkout):** `harga_sebelum/selepas` (migrasi 0002), kotak Bayar + QR, `settings.steps`, profil `link`+`sijil[]`, socmed 9 kunci SVG, checkout 5-kotak → WA.
- **Fasa 6b:** scroll modal, 1-gambar edit + `Tukar`, QR menegak, padam gambar lama refcount-selamat (Python + GitHub, gagal senyap, Batal = orphan dibiarkan).
- **Fasa 6c:** `#notaCard` (localStorage → baris WA) + buang tajuk Sijil. Margas `nama sistem` DITANGGUH.
- **Fasa 7 (deploy, 13 Okt):** migrasi 0002 preview+production; preview `3e37c71a`, production `c99ed6f0`; kod `0afd010`.
- **Repair data (13 Okt):** `data.xlsx` terimport ke local (107→96) → keputusan 2x disahkan: website ikut local (backup pra-tulis disimpan, diff: padam p97–p107, settings/profil/socmed/analytics diganti; kredensial G: lapuk dibaiki) → import 200, 96/12/8, admin kekal.
- **Sync gambar (13 Okt):** 96 produk + 19 (profil/sijil/QR) disalin ke repo + redeploy (`9a2b5b63`, `3086aa3d`); semakan bytes tepat. Audit: 12 local + 8 repo tidak dirujuk dibuang (`4b99c03`); JPG rollback dikekalkan; tiada redeploy diperlukan.
- **Fasa 8 + split export (13 Okt):** refresh hijau + `#waFloat` (SVG, public sahaja, mesej + bakul); Bakul melintang + badge keluar gambar; Logout atas; Export Data(2 sheet)/Lain(4 sheet) + import separa gabung. Ujian harness + curl lulus.
- **Bar pengumuman + Top 10 (13 Okt):** `#announceBar` sticky nipis (font .78rem, padding 5px; teks `settings.pengumuman`, default `Custom Website rm140 saja`, kosong = sorok; klik → WA mesej `saya nak <teks bar>`, X tutup sesi); input `sPengumuman` di kotak Website; `#topChart` bar melintang Top 10 gabungan klik produk+demo.
- **Tema biru-emas (13 Okt):** `--theme:#2563eb` / `--theme-dark:#1e3a8a` / `--theme-soft:#dbeafe`, `--accent:#d4a017` (bintang), bar pengumuman gradient emas teks gelap; hijau lama dibuang sepenuhnya dari CSS; merah (diskaun/bahaya) dan hijau butang WA dikekalkan.
- **Deploy pengumuman/Top10/tema (13 Okt):** production terus (preview dilangkau atas permintaan); deployment `1c5ca3b8`, kod `07129aa` (12 fail); tiada migrasi baharu; ujian tulis terkawal (cipta→padam, 96 kekal); `pengumuman` production diset `Custom Website rm140 saja` dan disahkan via public `/api/data`; push main tanpa rebase.
- **Bakul tanpa popup (13 Okt):** `#checkoutModal` dibuang; susunan Bakul: info pelanggan (nama/wasap+email/socmed/nota) → butang Transfer\|QR Bank\|QR TnG (popup `#bayarModal` masing-masing; imej QR tanpa label teks) → radio status bayar Dah/Belum (default Belum, `.radio-pill`) → senarai produk → jumlah + Empty/Hantar → step. Validasi Hantar sama (nama/wasap/email + bakul tidak kosong).
- **Deploy bakul baharu (13 Okt):** production terus; deployment `0c412670`, kod `778a15c` (4 fail); tiada migrasi baharu; live disahkan (infoCard/hantarBtn/bayarModal/radio + `sendHantar`, tiada `checkoutModal`); ujian tulis terkawal (cipta→padam, 96 kekal, pengumuman kekal); push main tanpa rebase.
- **Kemasan bakul (13 Okt, local sahaja, BELUM deploy):** `#bakulHint` panduan di atas infoCard; `#infoCard` input/textarea dan 5 butang bayar dipadatkan (padding/font dikurangkan). Label `lifetime` dibuang semula. Kunci baharu disokong py (`server/allowed`, `analytics/public_data`, `backup/SETTING_KEYS`), cloud (`validation/settingKeys`, `api/specs`), `backup.js/SETTING_ORDER`, export/import Tetapan. Cloud sengaja tidak disentuh — deploy berasingan nanti.
- **Deploy 8+21 (13 Okt):** production terus + tulis terkawal; `f73ac97e`, kod `c73c82a`; insiden 1 produk tertinggal (parse `item`) dibersihkan; PNG ujian dibuang (`e689ab7`).
- **MINE/paused (13 Okt):** `gh repo list` — repo MINE sudah tiada; unlink penuh hanya via dashboard (tiada API awam; tidak dibuat — tidak perlu).
