// Service Worker for Rirenedoro Timer
// Enables background notifications and offline support

const CACHE_NAME = 'rirenedoro-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './tasks.js',
    './supabase-integration.js',
    './supabase-config.js',
    './timerSound.mp3',
    './restartIcon.png',
    './settingsIcon.png',
    './statIcon.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (like Supabase)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, return offline page
                console.log('[Service Worker] Offline - serving cached content');
            })
    );
});

// Handle messages from main app
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data.type === 'TIMER_COMPLETE') {
        // Show notification when timer completes
        showNotification(event.data.phase, event.data.nextPhase);
    } else if (event.data.type === 'CHECK_TIMER') {
        // Check if timer should have completed in background
        checkBackgroundTimer(event.data.targetEndTime, event.data.phase);
    }
});

// Show notification
async function showNotification(completedPhase, nextPhase) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
        let title, body, icon;
        
        if (completedPhase === 'pomodoro') {
            title = '🍅 Pomodoro Complete!';
            body = nextPhase === 'longBreak' 
                ? 'Great work! Time for a long break (15 min).' 
                : 'Good job! Time for a short break (5 min).';
            icon = './statIcon.png';
        } else if (completedPhase === 'shortBreak') {
            title = '☕ Short Break Complete!';
            body = 'Ready to focus again? Time for another Pomodoro!';
            icon = './settingsIcon.png';
        } else if (completedPhase === 'longBreak') {
            title = '🎉 Long Break Complete!';
            body = 'Refreshed and ready to go! Let\'s start another cycle!';
            icon = './settingsIcon.png';
        }
        
        self.registration.showNotification(title, {
            body: body,
            icon: icon,
            badge: './statIcon.png',
            vibrate: [200, 100, 200],
            tag: 'pomodoro-timer',
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'Open Timer' }
            ]
        });
    }
}

// Check if timer ended while in background
function checkBackgroundTimer(targetEndTime, phase) {
    if (!targetEndTime) return;
    
    const now = Date.now();
    if (now >= targetEndTime) {
        console.log('[Service Worker] Timer completed in background');
        // Determine next phase
        let nextPhase = 'pomodoro';
        if (phase === 'pomodoro') {
            nextPhase = 'shortBreak'; // Simplified, actual logic in main app
        }
        showNotification(phase, nextPhase);
    }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();
    
    // Focus or open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (let client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

