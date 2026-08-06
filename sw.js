const CACHE_NAME = 'hasbali-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon_512.png',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', event => {
  console.log('⚙️ Installing Service Worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // فرض تفعيل الإصدار الجديد فوراً
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  console.log('⚙️ Activating Service Worker v2...');
  event.waitUntil(
    Promise.all([
      // حذف المخابئ القديمة
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      }),
      // السيطرة على جميع الصفحات المفتوحة فوراً
      clients.claim()
    ])
  );
});
