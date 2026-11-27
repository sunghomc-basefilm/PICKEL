/* PZ-Tune — 차량 DSP EQ 측정기 · /PICKEL/pz-tune/ 스코프 서비스워커
   화면(HTML/네비게이션)은 네트워크 우선, 정적 자산은 캐시 우선(없으면 네트워크 → 캐시). */
const SCOPE = '/PICKEL/pz-tune/';
const CACHE = 'pztune-v1';
const INDEX = SCOPE + 'index.html';
const ASSETS = [
  SCOPE,
  INDEX,
  SCOPE + 'manifest.webmanifest',
  SCOPE + 'icons/icon-192.png',
  SCOPE + 'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  // 화면 이동: 네트워크 우선, 실패하면 저장된 index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(INDEX, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(INDEX).then((hit) => hit || caches.match(SCOPE)))
    );
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
