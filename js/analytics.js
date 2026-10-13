/* Carta Analisis Tetapan: garis pelawat harian 30 hari (data sebenar sahaja) */
document.getElementById("miniRefresh").addEventListener("click", () => loadMiniChart(true));

async function loadMiniChart(force = false) {
  if (typeof LOGGED !== "undefined" && !LOGGED) return;
  const box = document.getElementById("miniChart");
  if (!box) return;
  box.innerHTML = "<p class=\"hint\">Memuatkan...</p>";
  try {
    const r = await API.analytics(force);
    if (!r || !r.ok) { box.innerHTML = "<p class=\"hint\">Gagal muat carta.</p>"; return; }
    const daily = (r.real && r.real.daily) || [];
    if (!daily.length) {
      box.innerHTML = "<p class=\"hint\">Belum ada data lawatan direkod.</p>";
      return;
    }
    const pts = daily.map((d) => ({ label: String(d.tarikh).slice(5), v: Number(d.pelawat || 0) }));
    box.innerHTML = lineSVG(pts);
  } catch {
    box.innerHTML = "<p class=\"hint\">Gagal muat carta.</p>";
  }
}

function lineSVG(pts) {
  const W = 320, H = 130, P = 24;
  const mx = Math.max(...pts.map((p) => p.v), 1);
  const X = (i) => pts.length === 1 ? W / 2 : P + (i * (W - P * 2)) / (pts.length - 1);
  const Y = (v) => H - P - (v / mx) * (H - P * 2);
  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.5" fill="var(--theme)"><title>${esc(p.label)}: ${p.v}</title></circle>`).join("");
  // label hujung + tengah sahaja supaya tidak sempit
  const idx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const labels = idx.map((i) => `<text x="${X(i).toFixed(1)}" y="${H - 8}" font-size="9" fill="#6b7280" text-anchor="middle">${esc(pts[i].label)}</text>`).join("");
  const peak = `<text x="${W - P}" y="${P - 6}" font-size="9" fill="#6b7280" text-anchor="end">max ${mx}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px">`
    + `<polyline points="${line}" fill="none" stroke="var(--theme)" stroke-width="2"/>`
    + dots + labels + peak + `</svg>`;
}
