"""Upload multipart -> uploads/ (sokong filename berpetik dan tanpa petik)."""
import os
import secrets
import time

from config import ALLOWED_UPLOAD_EXT, BASE_DIR, MAX_UPLOAD_BYTES, UPLOAD_DIR
from store import _lock, load_data


def is_local_upload(path):
    """Betul jika path会 gambar local dalam uploads/ (bukan URL luar/GitHub)."""
    if not isinstance(path, str):
        return False
    p = path.strip().replace("\\", "/")
    if not p.startswith("uploads/"):
        return False
    rest = p[len("uploads/"):]
    if not rest or ".." in rest or rest.startswith("/"):
        return False
    return True


def collect_refs(data):
    """Semua path gambar yang masih dirujuk data (untuk refcount selamat)."""
    refs = set()
    for p in data.get("products", []) or []:
        if isinstance(p, dict) and p.get("gambar"):
            refs.add(p["gambar"])
    pr = data.get("profile", {}) or {}
    if pr.get("gambar"):
        refs.add(pr["gambar"])
    for s in pr.get("sijil", []) or []:
        if s:
            refs.add(s)
    st = data.get("settings", {}) or {}
    for k in ("logo", "qr_bank", "qr_tng"):
        if st.get(k):
            refs.add(st[k])
    return refs


def remove_if_orphan(old_path, data_after=None):
    """Padam fail local jika tiada rekod guna lagi. Gagal senyap (best-effort)."""
    if not is_local_upload(old_path):
        return False
    try:
        data = data_after if data_after is not None else load_data()
        if old_path in collect_refs(data):
            return False
        full = os.path.normpath(os.path.join(BASE_DIR, old_path.replace("/", os.sep)))
        if not full.startswith(os.path.join(BASE_DIR, "uploads")) or not os.path.isfile(full):
            return False
        with _lock:
            if old_path in collect_refs(load_data()):
                return False
            os.remove(full)
        return True
    except Exception:
        return False


def handle_upload(handler):
    ctype = handler.headers.get("Content-Type", "")
    if "multipart/form-data" not in ctype:
        handler.send_json({"ok": False, "error": "multipart_diperlukan"}, 400)
        return
    try:
        bval = ctype.split("boundary=")[1].split(";")[0].strip().strip('"').strip()
        boundary = bval.encode()
    except Exception:
        handler.send_json({"ok": False, "error": "boundary_tidak_sah"}, 400)
        return
    ln = int(handler.headers.get("Content-Length", "0") or 0)
    if ln <= 0 or ln > MAX_UPLOAD_BYTES + 10240:
        handler.send_json({"ok": False, "error": "fail_terlalu_besar"}, 400)
        return
    raw = handler.rfile.read(ln)
    # parse ringkas: cari filename dan data fail pertama
    try:
        parts = raw.split(b"--" + boundary)
        saved = None
        for part in parts:
            if b"filename=" not in part:
                continue
            head_end = part.find(b"\r\n\r\n")
            if head_end < 0:
                continue
            head = part[:head_end].decode("utf-8", "ignore")
            content = part[head_end + 4:]
            if content.endswith(b"\r\n"):
                content = content[:-2]
            # nama fail (sokong filename="x" dan filename=x tanpa petik)
            try:
                after = head.split("filename=")[1].strip()
                if after.startswith('"'):
                    fname = after[1:].split('"')[0]
                else:
                    fname = after.split(";")[0].strip().split("\r")[0].split("\n")[0].strip()
                    fname = fname.strip('"')
            except Exception:
                continue
            fname = os.path.basename(fname).replace(" ", "_")
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_UPLOAD_EXT:
                handler.send_json({"ok": False, "error": "format_tidak_dibenarkan"}, 400)
                return
            if len(content) > MAX_UPLOAD_BYTES:
                handler.send_json({"ok": False, "error": "fail_terlalu_besar"}, 400)
                return
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            safe = f"{int(time.time())}_{secrets.token_hex(4)}{ext}"
            dest = os.path.join(UPLOAD_DIR, safe)
            with _lock:
                with open(dest, "wb") as f:
                    f.write(content)
            saved = "uploads/" + safe
            break
        if not saved:
            handler.send_json({"ok": False, "error": "fail_tidak_jumpa"}, 400)
            return
        handler.send_json({"ok": True, "path": saved})
    except Exception as e:
        handler.send_json({"ok": False, "error": str(e)}, 500)
