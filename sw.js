/* My Learning World service worker — minimal, update-friendly.
   Strategy: NETWORK FIRST for everything. Nothing is served stale while
   online, so new Vercel deploys reach the tablet on the next load.
   The cache is only a fallback for offline launches. Saved progress lives
   in localStorage, which this worker never touches — updates can't wipe it. */
const MLW_CACHE = 'mlw-shell-v1';

self.addEventListener('install', (event) => {
  // Activate immediately so updates apply without trapping an old build.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== MLW_CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GET requests; never interfere with YouTube, fonts, etc.
  if (req.method !== 'GET') return;
  let sameOrigin = true;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) { return; }
  if (!sameOrigin) return;
  event.respondWith(
    fetch(req).then((res) => {
      // Refresh the offline fallback copy in the background (GET 200 only).
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(MLW_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
