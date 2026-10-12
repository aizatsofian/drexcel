/* UI: toast, loader, confirm */
function toast(msg, type) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (type === "ok" ? " ok" : type === "err" ? " err" : "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function showLoader(v) {
  document.getElementById("loader").classList.toggle("hidden", !v);
}
let _confirmResolve = null;
function confirmDialog(text) {
  document.getElementById("confirmText").textContent = text;
  document.getElementById("confirmModal").classList.remove("hidden");
  return new Promise((res) => { _confirmResolve = res; });
}
document.getElementById("confirmYes").addEventListener("click", () => {
  document.getElementById("confirmModal").classList.add("hidden");
  if (_confirmResolve) _confirmResolve(true);
});
document.getElementById("confirmNo").addEventListener("click", () => {
  document.getElementById("confirmModal").classList.add("hidden");
  if (_confirmResolve) _confirmResolve(false);
});
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
