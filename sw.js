/* Service worker: what makes the app installable, and what answers when the
   network cannot.

   The rule is network first, always. Online, every request goes to the real
   server and the copy kept here is just refreshed in passing — so this can
   never serve yesterday's app.js, the same promise serve.py makes with its
   no-store header. Only when the fetch itself fails does the cache answer,
   and then a request for any address serves the shell, which is how /house
   still opens as a page with no connection at all — the same trick 404.html
   plays for GitHub Pages, played offline.

   Everything is addressed relative to this file, which sits next to
   index.html, so scope and cache keys land correctly whether the app lives at
   "/" locally or "/colour-webapp/" on GitHub Pages — the same at-any-depth
   rule APP_ROOT follows in app.js. */

const CACHE = "plaint-v1";

// The whole app; there is no lazy part of it. Cached one by one rather than
// with addAll, which rejects wholesale over a single missing file — and
// mixbox.js is allowed to be missing (see THIRD-PARTY-NOTICES.md). Whatever
// fails here is picked up by the fetch handler on the first online visit.
const SHELL = [
  "index.html",
  "style.css",
  "app.js",
  "mixbox.js",
  "spectral.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-mask-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(SHELL.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          if (request.mode === "navigate") {
            // A page address answers with the shell, so any successful
            // navigation is a chance to keep the offline copy current.
            cache.put("index.html", fresh.clone());
          } else {
            cache.put(request, fresh.clone());
          }
        }
        return fresh;
      } catch (err) {
        // No network. Pages aren't files, so any navigation gets the shell;
        // app.js then reads the page name off the address as it always does.
        const cache = await caches.open(CACHE);
        const hit =
          request.mode === "navigate"
            ? await cache.match("index.html")
            : await cache.match(request);
        if (hit) return hit;
        throw err;
      }
    })()
  );
});
