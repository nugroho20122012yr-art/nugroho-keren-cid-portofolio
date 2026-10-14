/*
 * proxy.js
 * Penjaga halaman utama:
 *   https://nugroho-keren-cid-portofolio.vercel.app/nugroho-keren/index.html
 *
 * Halaman utama hanya tampil jika:
 *  1. Tidak dimuat di dalam iframe.
 *  2. Dibuka dari domain & alamat tujuan yang benar (https, tanpa localhost).
 *  3. Pengunjung membawa tanda masuk valid dari gerbang anti-clone.js.
 *     Kalau dibuka langsung tanpa lewat gerbang, otomatis dikembalikan ke gerbang.
 *
 * Dimuat paling awal di <head> dan berjalan sinkron, jadi isi halaman
 * tetap tersembunyi sampai semua cek lolos.
 */
(function () {
  "use strict";

  var CONFIG = {
    // Link tujuan web yang dijaga.
    targetUrl: "https://nugroho-keren-cid-portofolio.vercel.app/nugroho-keren/index.html",
    // Gerbang anti-clone (root project), relatif dari halaman utama.
    entry: "../",
    // HARUS sama dengan salt di anti-clone.js
    salt: "ee7330c8fd6c67d23acc61c6",
    tokenKey: "ac_token",
    // Masa berlaku tanda masuk (ms) = 12 jam.
    ttl: 12 * 60 * 60 * 1000
  };

  var hideStyle = document.getElementById("proxy-hide");

  // Hash FNV-1a 32-bit (sama persis dengan anti-clone.js)
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  function deny(reason) {
    if (window.console) console.error("[proxy] diblokir: " + reason);
    try { window.stop(); } catch (e) {}
    document.documentElement.innerHTML =
      '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title>Akses ditolak</title></head>" +
      '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;' +
      'font-family:system-ui,sans-serif;background:#fff;color:#111;text-align:center">Akses ditolak.</body>';
  }

  function backToGate() {
    // Halaman tetap tersembunyi selagi dikembalikan ke gerbang.
    location.replace(new URL(CONFIG.entry, location.href).href);
  }

  function notFramed() {
    try { return window.top === window.self; } catch (e) { return false; }
  }

  function addressOk() {
    var t = new URL(CONFIG.targetUrl);
    var dir = t.pathname.replace(/[^\/]*$/, ""); // "/nugroho-keren/"
    return (
      location.protocol === t.protocol &&
      location.hostname.toLowerCase() === t.hostname.toLowerCase() &&
      (location.pathname === t.pathname || location.pathname === dir)
    );
  }

  function tokenOk() {
    var raw = sessionStorage.getItem(CONFIG.tokenKey) || "";
    var parts = raw.split(".");
    if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
    var ts = Number(parts[0]);
    var now = Date.now();
    if (ts > now + 60000 || now - ts > CONFIG.ttl) return false;
    return parts[1] === fnv(parts[0] + "|" + CONFIG.salt + "|" + location.hostname.toLowerCase());
  }

  function reveal() {
    if (hideStyle && hideStyle.parentNode) hideStyle.parentNode.removeChild(hideStyle);
  }

  if (!notFramed()) return deny("dimuat di dalam iframe");
  if (!addressOk()) return deny("alamat/domain tidak sesuai");

  try {
    if (!tokenOk()) return backToGate();
  } catch (e) {
    return deny("sessionStorage tidak tersedia");
  }

  reveal();
})();
