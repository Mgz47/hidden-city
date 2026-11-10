/* Hidden City service worker: offline play and fast start */
const VERSION = "hc-20261110115917";
const SHELL = ["./", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-64.png"];
const LIBS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("hc-") && k !== VERSION && k !== "hc-runtime").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // the game page: newest version when online, saved copy when offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./", copy)); return res; })
      .catch(() => caches.match("./", { ignoreSearch: true }).then(r => r || caches.match(req))));
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !LIBS.includes(url.hostname)) return; // live data (Firebase) is never cached
  // map tiles, icons and libraries: saved copy first, fetched once when missing
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(sameOrigin && !SHELL.includes("./" + url.pathname.split("/").pop()) ? "hc-runtime" : VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
