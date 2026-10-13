"""Rekod event + ringkasan analytics + tapisan data public."""
from datetime import datetime, timezone

from store import update_data

VALID_TRACK = {"visit", "product", "demo", "whatsapp"}


def record_event(jenis, produk=None):
    def _fn(data):
        real = data.setdefault("analytics", {}).setdefault("real", {})
        real.setdefault("visitors", 0)
        real.setdefault("product_clicks", {})
        real.setdefault("demo_clicks", {})
        real.setdefault("whatsapp_clicks", 0)
        real.setdefault("events", [])
        now = datetime.now(timezone.utc).astimezone()
        ev = {"t": now.isoformat(timespec="seconds"), "jenis": jenis}
        if produk:
            ev["produk"] = produk
        if jenis == "visit":
            real["visitors"] += 1
        elif jenis == "product" and produk:
            d = real["product_clicks"]
            d[produk] = int(d.get(produk, 0)) + 1
        elif jenis == "demo" and produk:
            d = real["demo_clicks"]
            d[produk] = int(d.get(produk, 0)) + 1
        elif jenis == "whatsapp":
            real["whatsapp_clicks"] = int(real.get("whatsapp_clicks", 0)) + 1
        real["events"].append(ev)
        # hadkan events supaya fail tidak membesar tanpa had
        if len(real["events"]) > 5000:
            real["events"] = real["events"][-5000:]
    update_data(_fn)


def build_analytics_summary(data):
    real = data.get("analytics", {}).get("real", {})
    visitors = int(real.get("visitors", 0))
    pclicks = real.get("product_clicks", {}) or {}
    dclicks = real.get("demo_clicks", {}) or {}
    wclicks = int(real.get("whatsapp_clicks", 0))
    events = real.get("events", []) or []
    total_p = sum(int(v) for v in pclicks.values())
    total_d = sum(int(v) for v in dclicks.values())
    # gabung populariti produk (klik produk + klik demo)
    scores = {}
    for k, v in pclicks.items():
        scores[k] = scores.get(k, 0) + int(v)
    for k, v in dclicks.items():
        scores[k] = scores.get(k, 0) + int(v)
    top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:10]
    # agregat harian (30 hari terakhir)
    daily = {}
    for ev in events:
        try:
            day = str(ev.get("t", ""))[:10]
            if not day or len(day) != 10:
                continue
            d = daily.setdefault(day, {"tarikh": day, "pelawat": 0, "klik": 0, "demo": 0, "whatsapp": 0})
            j = ev.get("jenis")
            if j == "visit":
                d["pelawat"] += 1
            elif j == "product":
                d["klik"] += 1
            elif j == "demo":
                d["demo"] += 1
            elif j == "whatsapp":
                d["whatsapp"] += 1
        except Exception:
            continue
    daily_list = [daily[k] for k in sorted(daily.keys())][-30:]
    # agregat bulanan
    monthly = {}
    for ev in events:
        try:
            m = str(ev.get("t", ""))[:7]
            if not m or len(m) != 7:
                continue
            d = monthly.setdefault(m, {"bulan": m, "pelawat": 0, "klik": 0})
            if ev.get("jenis") == "visit":
                d["pelawat"] += 1
            else:
                d["klik"] += 1
        except Exception:
            continue
    monthly_list = [monthly[k] for k in sorted(monthly.keys())][-12:]
    by_id = {p.get("id"): p.get("nama", p.get("id")) for p in data.get("products", [])}
    top_named = [{"produk": pid, "nama": by_id.get(pid, pid), "klik": c} for pid, c in top]
    popular = top_named[0] if top_named else None
    return {
        "visitors": visitors,
        "product_clicks_total": total_p,
        "demo_clicks_total": total_d,
        "whatsapp_clicks": wclicks,
        "popular": popular,
        "top10": top_named,
        "daily": daily_list,
        "monthly": monthly_list,
        "events_count": len(events),
    }


def public_data(data):
    st = data.get("settings", {})
    return {
        "products": data.get("products", []),
        "categories": data.get("categories", []),
        "testimonials": data.get("testimonials", []),
        "profile": data.get("profile", {}),
        "socials": data.get("socials", {}),
        "settings": {
            "logo": st.get("logo", ""),
            "whatsapp": st.get("whatsapp", ""),
            "header": st.get("header", ""),
            "bank_nama": st.get("bank_nama", ""),
            "bank_no": st.get("bank_no", ""),
            "bank_penama": st.get("bank_penama", ""),
            "qr_bank": st.get("qr_bank", ""),
            "qr_tng": st.get("qr_tng", ""),
            "steps": st.get("steps", ""),
        },
    }
