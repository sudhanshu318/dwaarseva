// Dwaarseva service worker.
// Strategy: network first for our own pages and files (so updates show up immediately),
// falling back to the cache when offline. Firebase, Formspree and other sites are never cached.
const CACHE = "dwaarseva-v1";
const SHELL = [
  "/", "/index.html", "/booking.html", "/login.html", "/providers.html", "/provider-login.html",
  "/styles.css", "/common.js", "/config.js", "/logo.svg", "/offline.html",
  "/icons/icon-192.png", "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Pages with private data are never stored.
  if (/^\/(admin|provider)\.html$/.test(url.pathname)) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/offline.html") : Response.error()))
      )
  );
});
