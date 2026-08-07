const CACHE_NAME = 'hasbali-v8'; // رقم إصدار جديد
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon_512.png', // احتفظ بالملفين لتجنب أي خطأ 404
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// تثبيت + تخزين + تخطي الانتظار (من v3)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // مميزات v3
  );
});

// جلب (استراتيجية Cache First - من v1)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// تفعيل + السيطرة الفورية على الصفحات (من v3)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // مميزات v3
  );
});
