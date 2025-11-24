importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// TODO: 실제 Firebase 프로젝트 설정으로 교체하세요.
const FIREBASE_CONFIG = {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_FIREBASE_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID'
};

if (FIREBASE_CONFIG.apiKey !== 'YOUR_FIREBASE_API_KEY') {
    firebase.initializeApp(FIREBASE_CONFIG);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(payload => {
        const notificationTitle = payload.notification?.title || '분출 타이머';
        const notificationOptions = {
            body: payload.notification?.body || '타이머가 완료되었습니다!',
            icon: payload.notification?.icon || '/favicon.ico',
            data: payload.data || {},
            requireInteraction: true
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', event => {
        event.notification.close();
        const targetUrl = event.notification.data?.url || self.location.origin;
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                for (const client of windowClients) {
                    if (client.url.includes(targetUrl) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
        );
    });
} else {
    console.warn('Firebase Config가 설정되지 않아 푸시 알림이 비활성화됩니다.');
}





