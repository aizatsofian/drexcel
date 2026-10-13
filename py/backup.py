"""Validasi payload import (dari Excel via frontend) sebelum overwrite data.json.

Kredensial admin TIDAK disertakan dalam export dan TIDAK disentuh import.
"""
import secrets

from analytics import VALID_TRACK

SOCMED_KEYS = ("whatsapp", "tiktok", "threads", "facebook", "instagram", "linkedin", "youtube", "telegram", "other")
SETTING_KEYS = ("logo", "whatsapp", "header", "pengumuman", "bank_nama", "bank_no", "bank_penama", "qr_bank", "qr_tng", "steps")
PROFILE_KEYS = ("nama", "biodata", "kepakaran", "penerangan", "gambar", "link", "sijil")


def _str(v, cap):
    return str(v if v is not None else "")[:cap]


def _int(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _price(v):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0
    if n < 0 or n != n:
        return 0
    return round(n, 2)


def validate_import(body):
    """Return (error, clean). error None jika sah; clean data sedia ganti (tanpa admin)."""
    if not isinstance(body, dict):
        return ("format_tidak_sah", None)
    for k in ("products", "categories", "testimonials", "profile", "socials", "settings", "analytics"):
        if k not in body:
            return (f"sheet_{k}_tiada", None)

    products = body["products"]
    if not isinstance(products, list):
        return ("produk_tidak_sah", None)
    clean_products = []
    for p in products:
        if not isinstance(p, dict) or not str(p.get("nama", "")).strip():
            return ("produk_tidak_sah", None)
        clean_products.append({
            "id": _str(p.get("id") or ("p" + secrets.token_hex(3)), 32),
            "nama": _str(p.get("nama"), 120),
            "gambar": _str(p.get("gambar"), 500),
            "penerangan": _str(p.get("penerangan"), 2000),
            "kategori": _str(p.get("kategori"), 80),
            "demo": _str(p.get("demo"), 500),
            "likes": max(0, _int(p.get("likes"))),
            "harga_sebelum": _price(p.get("harga_sebelum")),
            "harga_selepas": _price(p.get("harga_selepas")),
        })

    categories = body["categories"]
    if not isinstance(categories, list):
        return ("kategori_tidak_sah", None)
    clean_cats = []
    for c in categories:
        c = str(c or "").strip()
        if c and c not in clean_cats:
            clean_cats.append(c[:80])

    testis = body["testimonials"]
    if not isinstance(testis, list):
        return ("testimoni_tidak_sah", None)
    clean_testis = []
    for t in testis:
        if not isinstance(t, dict) or not str(t.get("nama", "")).strip() or not str(t.get("komen", "")).strip():
            return ("testimoni_tidak_sah", None)
        clean_testis.append({
            "id": _str(t.get("id") or ("t" + secrets.token_hex(3)), 32),
            "nama": _str(t.get("nama"), 80),
            "rating": max(1, min(5, _int(t.get("rating"), 5))),
            "komen": _str(t.get("komen"), 1000),
            "link": _str(t.get("link"), 500),
        })

    pr = body["profile"]
    if not isinstance(pr, dict):
        return ("profil_tidak_sah", None)
    kep = pr.get("kepakaran", [])
    if isinstance(kep, str):
        kep = [x.strip() for x in kep.split(";") if x.strip()]
    sij = pr.get("sijil", [])
    if isinstance(sij, str):
        sij = [x.strip() for x in sij.split(";") if x.strip()]
    clean_profile = {
        "nama": _str(pr.get("nama"), 120),
        "biodata": _str(pr.get("biodata"), 500),
        "kepakaran": [str(x)[:80] for x in (kep or []) if str(x).strip()][:20],
        "penerangan": _str(pr.get("penerangan"), 2000),
        "gambar": _str(pr.get("gambar"), 500),
        "link": _str(pr.get("link"), 500),
        "sijil": [str(x)[:500] for x in (sij or []) if str(x).strip()][:20],
    }

    sc = body["socials"]
    if not isinstance(sc, dict):
        return ("socmed_tidak_sah", None)
    clean_socials = {k: _str(sc.get(k), 500) for k in SOCMED_KEYS}

    st = body["settings"]
    if not isinstance(st, dict):
        return ("tetapan_tidak_sah", None)
    clean_settings = {k: _str(st.get(k), 500) for k in SETTING_KEYS}

    an = body["analytics"]
    if not isinstance(an, dict):
        return ("analytics_tidak_sah", None)
    real = an.get("real", {}) if isinstance(an.get("real"), dict) else {}
    demo = an.get("demo", {}) if isinstance(an.get("demo"), dict) else {}

    def _clickmap(v):
        out = {}
        if isinstance(v, dict):
            for k, n in v.items():
                n = _int(n)
                if k and n > 0:
                    out[str(k)[:32]] = n
        return out

    events = real.get("events", [])
    clean_events = []
    if isinstance(events, list):
        for ev in events[-5000:]:
            if not isinstance(ev, dict) or ev.get("jenis") not in VALID_TRACK:
                continue
            item = {"t": _str(ev.get("t"), 32), "jenis": ev["jenis"]}
            if ev.get("produk"):
                item["produk"] = _str(ev.get("produk"), 32)
            clean_events.append(item)
    clean_real = {
        "visitors": max(0, _int(real.get("visitors"))),
        "product_clicks": _clickmap(real.get("product_clicks")),
        "demo_clicks": _clickmap(real.get("demo_clicks")),
        "whatsapp_clicks": max(0, _int(real.get("whatsapp_clicks"))),
        "events": clean_events,
    }

    daily = demo.get("daily", [])
    clean_daily = []
    if isinstance(daily, list):
        for d in daily[-365:]:
            if not isinstance(d, dict) or not d.get("tarikh"):
                continue
            clean_daily.append({
                "tarikh": _str(d.get("tarikh"), 16),
                "pelawat": max(0, _int(d.get("pelawat"))),
                "klik": max(0, _int(d.get("klik"))),
            })
    top = demo.get("top", [])
    clean_top = []
    if isinstance(top, list):
        for t in top[:50]:
            if not isinstance(t, dict) or not t.get("produk"):
                continue
            clean_top.append({"produk": _str(t.get("produk"), 32), "klik": max(0, _int(t.get("klik")))})
    clean_demo = {
        "label": _str(demo.get("label", "demo"), 16),
        "nota": _str(demo.get("nota"), 500),
        "visitors": max(0, _int(demo.get("visitors"))),
        "product_clicks_total": max(0, _int(demo.get("product_clicks_total"))),
        "demo_clicks_total": max(0, _int(demo.get("demo_clicks_total"))),
        "whatsapp_clicks": max(0, _int(demo.get("whatsapp_clicks"))),
        "daily": clean_daily,
        "top": clean_top,
    }

    clean = {
        "products": clean_products,
        "categories": clean_cats,
        "testimonials": clean_testis,
        "profile": clean_profile,
        "socials": clean_socials,
        "settings": clean_settings,
        "analytics": {"real": clean_real, "demo": clean_demo},
    }
    return (None, clean)
