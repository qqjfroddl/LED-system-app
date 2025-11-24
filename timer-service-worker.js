const CACHE_NAME = 'burst-timer-cache-v1';
const CORE_ASSETS = [
    '타이머_인생관리.html',
    'manifest.webmanifest',
    'favicon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME && caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                return response;
            }).catch(() => cached);
        })
    );
});

self.addEventListener('notificationclick', event => {
    console.log('알림 클릭됨:', event.notification);
    
    const action = event.action;
    
    // '닫기' 액션인 경우 알림만 닫기
    if (action === 'close') {
        event.notification.close();
        return;
    }
    
    // 기본 동작: 알림 닫고 페이지로 이동
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/타이머_인생관리.html';
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then(clientsArr => {
            // 이미 열려있는 타이머 페이지가 있으면 포커스
            for (const client of clientsArr) {
                if (client.url.includes('타이머_인생관리.html')) {
                    return client.focus().then(() => {
                        console.log('✅ 기존 창에 포커스');
                    });
                }
            }
            // 없으면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen).then(windowClient => {
                    if (windowClient) {
                        console.log('✅ 새 창 열림');
                    } else {
                        console.warn('⚠️ 새 창 열기 실패');
                    }
                }).catch(err => {
                    console.error('❌ 새 창 열기 오류:', err);
                });
            }
        })
    );
});

// Service Worker에서 직접 알림을 보낼 수 있도록 (백그라운드에서도 작동)
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon } = event.data;
        self.registration.showNotification(title, {
            body: body,
            icon: icon || 'timer-icon.svg',
            badge: 'timer-icon.svg',
            tag: 'timer-complete',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: {
                url: event.data.url || '/타이머_인생관리.html'
            }
        });
    }
});

