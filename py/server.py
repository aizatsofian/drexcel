#!/usr/bin/env python3
"""Entry point server. Jalan dengan:  python py/server.py  (dari root projek).
Routing + handler sahaja; logik dipecah ke config/store/auth/analytics/uploads.
"""
import json
import mimetypes
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from analytics import VALID_TRACK, build_analytics_summary, public_data, record_event
from auth import (
    check_session,
    create_session,
    drop_session,
    get_session_token,
    hash_password,
    verify_password,
)
from backup import validate_import
from config import BASE_DIR, DATA_FILE, PORT, UPLOAD_DIR
from store import _lock, load_data, update_data
from uploads import handle_upload, remove_if_orphan


class Handler(BaseHTTPRequestHandler):
    server_version = "KoleksiServer/2.0"

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

    # ----- helpers -----
    def send_json(self, obj, status=200, extra_headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self, max_bytes=2 * 1024 * 1024):
        ln = int(self.headers.get("Content-Length", "0") or 0)
        if ln <= 0 or ln > max_bytes:
            return {}
        raw = self.rfile.read(ln)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def serve_static(self, path):
        # path relatif selamat dalam BASE_DIR (root projek)
        rel = unquote(urlparse(path).path).lstrip("/")
        if rel == "":
            rel = "index.html"
        full = os.path.normpath(os.path.join(BASE_DIR, rel))
        if not full.startswith(BASE_DIR) or not os.path.isfile(full):
            idx = os.path.join(BASE_DIR, "index.html")
            if os.path.isfile(idx) and not rel.startswith("api/"):
                full = idx
            else:
                self.send_json({"ok": False, "error": "not_found"}, 404)
                return
        ctype, _ = mimetypes.guess_type(full)
        if full.endswith(".js"):
            ctype = "text/javascript; charset=utf-8"
        try:
            with open(full, "rb") as f:
                body = f.read()
        except Exception:
            self.send_json({"ok": False, "error": "read_failed"}, 500)
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def require_admin(self):
        if not check_session(self):
            self.send_json({"ok": False, "error": "unauthorized"}, 401)
            return False
        return True

    # ----- GET -----
    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/api/data":
            with _lock:
                data = load_data()
                pub = public_data(data)
            self.send_json({"ok": True, "data": pub})
            return
        if route == "/api/session":
            self.send_json({"ok": True, "loggedIn": check_session(self)})
            return
        if route == "/api/admin/data":
            if not self.require_admin():
                return
            with _lock:
                data = load_data()
            # jangan hantar hash ke client
            safe = dict(data)
            safe["admin"] = {"username": data.get("admin", {}).get("username", "")}
            self.send_json({"ok": True, "data": safe})
            return
        if route == "/api/admin/analytics":
            if not self.require_admin():
                return
            with _lock:
                data = load_data()
                summary = build_analytics_summary(data)
                demo = data.get("analytics", {}).get("demo", {})
            self.send_json({"ok": True, "real": summary, "demo": demo})
            return
        # selain itu: fail statik
        self.serve_static(route)

    # ----- POST -----
    def do_POST(self):
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/api/track":
            body = self.read_json()
            jenis = str(body.get("jenis", "")).strip()
            produk = str(body.get("produk", "") or "").strip() or None
            if jenis not in VALID_TRACK:
                self.send_json({"ok": False, "error": "jenis_tidak_sah"}, 400)
                return
            try:
                record_event(jenis, produk)
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)
                return
            self.send_json({"ok": True})
            return
        if route == "/api/login":
            body = self.read_json()
            u = str(body.get("username", "")).strip()
            p = str(body.get("password", ""))
            with _lock:
                data = load_data()
                adm = data.get("admin", {})
            if u == adm.get("username", "") and verify_password(p, adm.get("password_hash", "")):
                token = create_session()
                hdr = {"Set-Cookie": f"session={token}; Path=/; HttpOnly; SameSite=Lax"}
                self.send_json({"ok": True}, extra_headers=hdr)
            else:
                time.sleep(0.5)  # perlahan brute force
                self.send_json({"ok": False, "error": "login_gagal"}, 401)
            return
        if route == "/api/logout":
            tok = get_session_token(self)
            if tok:
                drop_session(tok)
            hdr = {"Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"}
            self.send_json({"ok": True}, extra_headers=hdr)
            return
        if route == "/api/like":
            body = self.read_json()
            pid = str(body.get("produk", "")).strip()
            if not pid:
                self.send_json({"ok": False, "error": "produk_diperlukan"}, 400)
                return
            def _fn(data):
                for p in data.get("products", []):
                    if p.get("id") == pid:
                        p["likes"] = int(p.get("likes", 0) or 0) + 1
                        return p["likes"]
                return None
            n = update_data(_fn)
            if n is None:
                self.send_json({"ok": False, "error": "produk_tidak_jumpa"}, 404)
            else:
                self.send_json({"ok": True, "likes": n})
            return
        if route == "/api/admin/upload":
            if not self.require_admin():
                return
            handle_upload(self)
            return
        if route == "/api/admin/products":
            if not self.require_admin():
                return
            body = self.read_json()
            for k in ("nama", "kategori"):
                if not body.get(k):
                    self.send_json({"ok": False, "error": f"medan_{k}_diperlukan"}, 400)
                    return
            with_data = body
            def _fn(data):
                import random
                import uuid

                def _price(v):
                    try:
                        n = float(v)
                    except (TypeError, ValueError):
                        return 0
                    return round(n, 2) if n >= 0 else 0
                prods = data.setdefault("products", [])
                new_id = "p" + uuid.uuid4().hex[:6]
                item = {
                    "id": new_id,
                    "nama": str(with_data.get("nama", ""))[:120],
                    "gambar": str(with_data.get("gambar", ""))[:500],
                    "penerangan": str(with_data.get("penerangan", ""))[:2000],
                    "kategori": str(with_data.get("kategori", ""))[:80],
                    "demo": str(with_data.get("demo", ""))[:500],
                    "likes": random.randint(10, 99),
                    "harga_sebelum": _price(with_data.get("harga_sebelum")),
                    "harga_selepas": _price(with_data.get("harga_selepas")),
                }
                prods.append(item)
                return item
            item = update_data(_fn)
            self.send_json({"ok": True, "item": item})
            return
        if route == "/api/admin/categories":
            if not self.require_admin():
                return
            body = self.read_json()
            nama = str(body.get("nama", "")).strip()
            if not nama:
                self.send_json({"ok": False, "error": "nama_kategori_diperlukan"}, 400)
                return
            def _fn(data):
                cats = data.setdefault("categories", [])
                if nama not in cats:
                    cats.append(nama)
                return cats
            cats = update_data(_fn)
            self.send_json({"ok": True, "categories": cats})
            return
        if route == "/api/admin/testimonials":
            if not self.require_admin():
                return
            body = self.read_json()
            if not body.get("nama") or not body.get("komen"):
                self.send_json({"ok": False, "error": "nama_dan_komen_diperlukan"}, 400)
                return
            def _fn(data):
                import uuid
                items = data.setdefault("testimonials", [])
                item = {
                    "id": "t" + uuid.uuid4().hex[:6],
                    "nama": str(body.get("nama", ""))[:80],
                    "rating": max(1, min(5, int(body.get("rating", 5)))),
                    "komen": str(body.get("komen", ""))[:1000],
                    "link": str(body.get("link", ""))[:500],
                }
                items.append(item)
                return item
            item = update_data(_fn)
            self.send_json({"ok": True, "item": item})
            return
        if route == "/api/admin/settings":
            if not self.require_admin():
                return
            body = self.read_json()
            allowed = {"logo", "whatsapp", "header", "pengumuman", "bank_nama", "bank_no", "bank_penama", "qr_bank", "qr_tng", "steps"}
            profile_allowed = {"nama", "biodata", "kepakaran", "penerangan", "gambar", "link", "sijil"}
            with _lock:
                old_data = load_data()
            old_profile = dict(old_data.get("profile", {}) or {})
            old_settings = dict(old_data.get("settings", {}) or {})
            def _fn(data):
                st = data.setdefault("settings", {})
                for k in allowed:
                    if k in body:
                        cap = 5000 if k == "steps" else 500
                        v = body[k]
                        st[k] = str(v if v is not None else "")[:cap]
                if "profile" in body and isinstance(body["profile"], dict):
                    pr = data.setdefault("profile", {})
                    for k in profile_allowed:
                        if k in body["profile"]:
                            pr[k] = body["profile"][k]
                if "socials" in body and isinstance(body["socials"], dict):
                    sc = data.setdefault("socials", {})
                    for k, v in body["socials"].items():
                        if k in ("whatsapp", "tiktok", "threads", "facebook", "instagram", "linkedin", "youtube", "telegram", "other"):
                            sc[k] = v
                if "admin" in body and isinstance(body["admin"], dict):
                    adm = data.setdefault("admin", {})
                    if body["admin"].get("username"):
                        adm["username"] = str(body["admin"]["username"])[:50]
                    if body["admin"].get("password"):
                        adm["password_hash"] = hash_password(str(body["admin"]["password"]))
                return True
            update_data(_fn)
            # Padam gambar lama yang diganti (refcount selamat, best-effort)
            try:
                with _lock:
                    fresh = load_data()
                doomed = set()
                if "profile" in body and isinstance(body["profile"], dict):
                    bp = body["profile"]
                    if "gambar" in bp and old_profile.get("gambar") and old_profile["gambar"] != fresh.get("profile", {}).get("gambar"):
                        doomed.add(old_profile["gambar"])
                    if "sijil" in bp and isinstance(bp["sijil"], list):
                        for s in old_profile.get("sijil", []) or []:
                            if s not in (bp["sijil"] or []):
                                doomed.add(s)
                for k in ("logo", "qr_bank", "qr_tng"):
                    if k in body and old_settings.get(k) and old_settings[k] != (fresh.get("settings", {}) or {}).get(k):
                        doomed.add(old_settings[k])
                for d in doomed:
                    remove_if_orphan(d, fresh)
            except Exception:
                pass
            self.send_json({"ok": True})
            return
        if route == "/api/admin/import":
            if not self.require_admin():
                return
            body = self.read_json(max_bytes=10 * 1024 * 1024)
            err, clean = validate_import(body)
            if err:
                self.send_json({"ok": False, "error": err}, 400)
                return
            def _fn_import(data):
                # overwrite semua KECUALI kredensial admin (dikekalkan)
                for k in ("products", "categories", "testimonials", "profile", "socials", "settings", "analytics"):
                    data[k] = clean[k]
                return True
            update_data(_fn_import)
            self.send_json({"ok": True})
            return
        self.send_json({"ok": False, "error": "endpoint_tidak_wujud"}, 404)

    # ----- PUT -----
    def do_PUT(self):
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        # /api/admin/products/<id> , categories/<nama_lama>, testimonials/<id>
        if len(parts) == 4 and parts[0] == "api" and parts[1] == "admin":
            kind, ident = parts[2], unquote(parts[3])
            if not self.require_admin():
                return
            body = self.read_json()
            if kind == "products":
                with _lock:
                    old_gambar = next((p.get("gambar", "") for p in load_data().get("products", []) if p.get("id") == ident), "")

                def _fn(data):
                    for p in data.get("products", []):
                        if p.get("id") == ident:
                            for k in ("nama", "gambar", "penerangan", "kategori", "demo"):
                                if k in body:
                                    p[k] = body[k]
                            for k in ("harga_sebelum", "harga_selepas"):
                                if k in body:
                                    try:
                                        n = float(body[k])
                                        p[k] = round(n, 2) if n >= 0 else 0
                                    except (TypeError, ValueError):
                                        p[k] = 0
                            return p
                    return None
                item = update_data(_fn)
                if item:
                    try:
                        new_gambar = item.get("gambar", "")
                        if old_gambar and new_gambar != old_gambar:
                            with _lock:
                                fresh = load_data()
                            remove_if_orphan(old_gambar, fresh)
                    except Exception:
                        pass
                    self.send_json({"ok": True, "item": item})
                else:
                    self.send_json({"ok": False, "error": "produk_tidak_jumpa"}, 404)
                return
            if kind == "categories":
                nama_baru = str(body.get("nama", "")).strip()
                if not nama_baru:
                    self.send_json({"ok": False, "error": "nama_baru_diperlukan"}, 400)
                    return
                def _fn2(data):
                    cats = data.get("categories", [])
                    if ident in cats:
                        cats[cats.index(ident)] = nama_baru
                        for p in data.get("products", []):
                            if p.get("kategori") == ident:
                                p["kategori"] = nama_baru
                        return True
                    return False
                ok = update_data(_fn2)
                self.send_json({"ok": ok})
                return
            if kind == "testimonials":
                def _fn3(data):
                    for t in data.get("testimonials", []):
                        if t.get("id") == ident:
                            for k in ("nama", "rating", "komen", "link"):
                                if k in body:
                                    t[k] = body[k]
                            return t
                    return None
                item = update_data(_fn3)
                if item:
                    self.send_json({"ok": True, "item": item})
                else:
                    self.send_json({"ok": False, "error": "testimoni_tidak_jumpa"}, 404)
                return
        self.send_json({"ok": False, "error": "endpoint_tidak_wujud"}, 404)

    # ----- DELETE -----
    def do_DELETE(self):
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        if len(parts) == 4 and parts[0] == "api" and parts[1] == "admin":
            kind, ident = parts[2], unquote(parts[3])
            if not self.require_admin():
                return
            if kind == "products":
                with _lock:
                    doomed = next((p.get("gambar", "") for p in load_data().get("products", []) if p.get("id") == ident), "")

                def _fn(data):
                    prods = data.get("products", [])
                    n0 = len(prods)
                    data["products"] = [p for p in prods if p.get("id") != ident]
                    return len(data["products"]) < n0
                ok = update_data(_fn)
                if ok and doomed:
                    try:
                        with _lock:
                            fresh = load_data()
                        remove_if_orphan(doomed, fresh)
                    except Exception:
                        pass
                self.send_json({"ok": ok})
                return
            if kind == "categories":
                def _fn2(data):
                    cats = data.get("categories", [])
                    if ident in cats:
                        cats.remove(ident)
                        return True
                    return False
                self.send_json({"ok": update_data(_fn2)})
                return
            if kind == "testimonials":
                def _fn3(data):
                    items = data.get("testimonials", [])
                    n0 = len(items)
                    data["testimonials"] = [t for t in items if t.get("id") != ident]
                    return len(data["testimonials"]) < n0
                self.send_json({"ok": update_data(_fn3)})
                return
        self.send_json({"ok": False, "error": "endpoint_tidak_wujud"}, 404)


def main():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    if not os.path.isfile(DATA_FILE):
        print("AMARAN: data.json tiada.")
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Server berjalan: http://localhost:{PORT}")
    print("Tekan Ctrl+C untuk berhenti.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServer berhenti.")


if __name__ == "__main__":
    main()
