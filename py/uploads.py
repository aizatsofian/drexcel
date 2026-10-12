"""Upload multipart -> uploads/ (sokong filename berpetik dan tanpa petik)."""
import os
import secrets
import time

from config import ALLOWED_UPLOAD_EXT, MAX_UPLOAD_BYTES, UPLOAD_DIR
from store import _lock


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
