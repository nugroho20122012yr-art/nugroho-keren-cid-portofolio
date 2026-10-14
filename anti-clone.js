/*
 * anti-clone.js
 * Verifikasi untuk index.html. Website utama hanya dibuka jika semua cek lolos.
 *
 * Cek yang dilakukan:
 *  1. Halaman tidak dimuat di dalam iframe (anti-embed).
 *  2. Domain termasuk daftar allowedHosts (anti-clone ke domain lain).
 *  3. Isi index.html masih asli: teks penanda utuh, hanya ada 1 script
 *     (anti-clone.js) dan tidak ada elemen/script tambahan yang disisipkan.
 *
 * Jika lolos -> diarahkan ke folder website utama. Jika gagal -> diblokir.
 */
(function () {
  "use strict";

  var CONFIG = {
    // Satu-satunya domain yang diizinkan. Localhost & file lokal DIBLOKIR.
    // Kalau nanti pakai domain sendiri, tambahkan di sini.
    allowedHosts: ["nugroho-keren-cid-portofolio.vercel.app"],
    // Folder website utama.
    target: "nugroho-keren/index.html",
    // Kunci tanda masuk. HARUS sama dengan salt di nugroho-keren/proxy/proxy.js
    salt: "ee7330c8fd6c67d23acc61c6",
    tokenKey: "ac_token",
    // Teks penanda yang harus ada persis di index.html.
    marker: "halaman ini dilindungi oleh anti-clone.js",
    // Jeda sebelum pindah (ms), supaya teks sempat terbaca.
    delay: 600
  };

  function hostAllowed() {
    var host = location.hostname.toLowerCase();
    // Daftar kosong, file:// (host kosong), dan localhost otomatis ditolak.
    if (!host || CONFIG.allowedHosts.length === 0) return false;
    return CONFIG.allowedHosts.some(function (h) {
      h = h.toLowerCase();
      return host === h || host.endsWith("." + h);
    });
  }

  function notFramed() {
    try { return window.top === window.self; } catch (e) { return false; }
  }

  function indexIntact() {
    var shield = document.getElementById("anti-clone-shield");
    if (!shield) return false;
    var text = (shield.textContent || "").replace(/\s+/g, " ").trim();
    if (text !== CONFIG.marker) return false;

    // Hanya boleh ada satu script, yaitu anti-clone.js itu sendiri.
    var scripts = document.scripts;
    if (scripts.length !== 1) return false;
    var src = scripts[0].getAttribute("src") || "";
    if (!/(^|\/)anti-clone\.js(\?.*)?$/.test(src)) return false;

    // Body hanya berisi elemen shield + script.
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i] !== shield && kids[i] !== scripts[0]) return false;
    }
    return true;
  }

  // Hash FNV-1a 32-bit (sama persis dengan proxy.js)
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  // Tanda masuk: dibaca proxy.js untuk memastikan pengunjung lewat gerbang ini.
  function issueToken() {
    try {
      var ts = String(Date.now());
      var sig = fnv(ts + "|" + CONFIG.salt + "|" + location.hostname.toLowerCase());
      sessionStorage.setItem(CONFIG.tokenKey, ts + "." + sig);
      return sessionStorage.getItem(CONFIG.tokenKey) === ts + "." + sig;
    } catch (e) {
      return false;
    }
  }

  function block(reason) {
    if (window.console) console.error("[anti-clone] diblokir: " + reason);
    document.body.innerHTML = "";
    var msg = document.createElement("main");
    msg.textContent = "Akses ditolak.";
    document.body.appendChild(msg);
    try { if (window.top !== window.self) window.top.location.replace(location.href); } catch (e) {}
  }

  function run() {
    if (!notFramed()) return block("dimuat di dalam iframe");
    if (!hostAllowed()) return block("domain tidak diizinkan");
    if (!indexIntact()) return block("isi index.html tidak asli");
    if (!issueToken()) return block("sessionStorage tidak tersedia");
    setTimeout(function () {
      location.replace(new URL(CONFIG.target, location.href).href);
    }, CONFIG.delay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
