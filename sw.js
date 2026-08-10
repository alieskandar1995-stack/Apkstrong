// ============================================================
// SERVICE WORKER المثالي لتطبيق احسبلي+
// الإصدار: v11.0.0
// ============================================================

const CACHE_NAME = 'hasbali-v20';
const OFFLINE_URL = '/index.html';

// قائمة الملفات المطلوب تخزينها مسبقاً
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon_512.png', // للتوافق مع شاشة الترحيب في index.html
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// ============================================================
// 1. التثبيت
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW v11] تخزين الملفات الأساسية...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW v11] تم التخزين، تخطي الانتظار');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// 2. استراتيجيات الجلب المتقدمة
// ============================================================

// استراتيجية Cache First (للصور، CSS، JS)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // تحديث الخلفية (stale-while-revalidate)
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
    }).catch(() => {});
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('⚠️ غير متصل بالإنترنت', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// استراتيجية Network First (لواجهات API)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response('⚠️ غير متصل', { status: 503 });
  }
}

// استراتيجية خاصة بصفحات HTML (مع fallback للصفحة الرئيسية)
async function networkFirstHtml(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return await caches.match(OFFLINE_URL) || new Response('⚠️ غير متوفرة', { status: 503 });
  }
}

// ============================================================
// 3. معالج الجلب الرئيسي
// ============================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // تجاهل طلبات الإحصائيات
  if (url.hostname.includes('google-analytics') || 
      url.hostname.includes('doubleclick.net')) {
    return;
  }

  // طلبات API (Network First)
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // صفحات HTML (Network First مع fallback)
  if (request.mode === 'navigate' || 
      (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // باقي الموارد (Cache First)
  event.respondWith(cacheFirst(request));
});

// ============================================================
// 4. التفعيل: تنظيف المخابئ القديمة والتحكم الفوري
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name.startsWith('hasbali-'))
            .map((name) => {
              console.log(`[SW v11] حذف الكاش القديم: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW v11] تم التفعيل، السيطرة على جميع الصفحات');
        return self.clients.claim();
      })
  );
});

// ============================================================
// 5. الرسائل (للتحديث والنسخ الاحتياطي)
// ============================================================
self.addEventListener('message', (event) => {
  const data = event.data || {};
  
  if (data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (data.action === 'getVersion') {
    event.ports[0].postMessage({ version: CACHE_NAME, timestamp: Date.now() });
  }
  
  if (data.action === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }

  if (data.action === 'performBackup') {
    // إعلام الصفحة بأنه حان وقت النسخ الاحتياطي
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ action: 'triggerBackup' });
      });
    });
  }
});

// ============================================================
// 6. دفع الإشعارات (اختياري)
// ============================================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '📦 لديك تحديثات جديدة',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'dismiss', title: 'تجاهل' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'احسبلي+', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  }
});

// ============================================================
// 7. المزامنة في الخلفية (Background Sync)
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-backup') {
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ action: 'performBackup' });
        });
      })
    );
  }
});
