const CACHE_NAME = 'hasbali-v55';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // إضافة أي ملفات محلية أخرى تحتاج إلى تخزينها مؤقتاً
  // مثل ملفات CSS أو JS إضافية إذا كانت موجودة
];

// إستراتيجية التخزين المؤقت للخطوط (Google Fonts)
const FONT_CACHE_NAME = 'hasbali-fonts-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // حذف الكاش القديم (باستثناء كاش الخطوط)
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(name => 
            name !== CACHE_NAME && name !== FONT_CACHE_NAME
          ).map(name => caches.delete(name))
        );
      }),
      // السيطرة الفورية على الصفحات المفتوحة
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // ====== معالجة الخطوط (Google Fonts) ======
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // إذا كان في الكاش، أعده مع تحديث الخلفية
          const fetchPromise = fetch(request).then(networkResponse => {
            // تخزين النسخة الجديدة في الكاش
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // في حالة فشل الشبكة، نعود للنسخة المخزنة إن وجدت
            return cachedResponse;
          });
          // إستراتيجية Stale-While-Revalidate
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // ====== معالجة الطلبات الأخرى (إستراتيجية Cache First) ======
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // تحديث الكاش في الخلفية (إعادة التخزين) للحفاظ على الحداثة
          fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // إذا لم يكن في الكاش، نقوم بالجلب من الشبكة وتخزينه
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // في حالة فشل الشبكة وعدم وجود كاش، يمكن إرجاع صفحة بديلة (اختياري)
          // return caches.match('/offline.html');
        });
      })
  );
});
