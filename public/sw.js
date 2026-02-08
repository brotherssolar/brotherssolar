// Service Worker for Brothers Solar - Performance Optimization
const CACHE_NAME = 'brothers-solar-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/api.js',
    '/pdf-invoice.js',
    '/customer-dashboard.js',
    '/customer.html',
    '/admin.html',
    '/admin-script.js',
    '/admin/admin-access.html',
    '/admin/login.html',
    '/admin/otp-verification.html',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: Caching files');
                // Cache files individually to handle failures gracefully
                return Promise.all(
                    urlsToCache.map(url => {
                        // Skip favicon and other non-essential files
                        if (url.includes('favicon.ico') || url.includes('.jpg') || url.includes('.png') || url.includes('.gif')) {
                            console.log('SW: Skipping non-essential file:', url);
                            return Promise.resolve();
                        }
                        
                        return fetch(url, { mode: 'no-cors' })
                            .then(response => {
                                if (response.ok || response.type === 'opaque') {
                                    return cache.put(url, response);
                                }
                                console.log('SW: Cached', url);
                            })
                            .catch(err => {
                                console.log('SW: Error caching', url, err.message);
                            });
                    })
                );
            })
            .then(function() {
                console.log('Service Worker: Files cached (some may have failed)');
                return self.skipWaiting();
            })
            .catch(function(err) {
                console.log('Service Worker: Cache error', err);
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
    const request = event.request;
    
    // Skip non-GET requests and external resources
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip favicon and other non-essential files
    if (request.url.includes('favicon.ico') || 
        request.url.includes('.jpg') || 
        request.url.includes('.png') || 
        request.url.includes('.gif') ||
        request.url.includes('.svg')) {
        console.log('SW: Skipping non-essential request:', request.url);
        return;
    }
    
    // Skip cross-origin requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }
    
    console.log('Service Worker: Fetching ', request.url);
    
    event.respondWith(
        caches.match(request)
            .then(function(response) {
                // Return cached version or fetch from network
                if (response) {
                    console.log('Service Worker: Serving from cache');
                    return response;
                }
                
                return fetch(request)
                    .then(function(response) {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone response for caching
                        var responseToCache = response.clone();
                        
                        // Cache only successful responses
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(request, responseToCache);
                                console.log('SW: Cached new resource:', request.url);
                            });
                        
                        return response;
                    });
            })
            .catch(function() {
                // Offline fallback
                console.log('Service Worker: Offline - serving offline page');
                return new Response('Offline - Please check your internet connection', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Background sync for offline orders
self.addEventListener('sync', function(event) {
    if (event.tag === 'background-sync-orders') {
        event.waitUntil(syncOrders());
    }
});

// Sync orders when online
function syncOrders() {
    return self.registration.sync.register('background-sync-orders')
        .then(function() {
            console.log('Background sync registered');
        })
        .catch(function(err) {
            console.log('Background sync registration failed:', err);
        });
}

// Push notifications
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'New notification from Brothers Solar',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Brothers Solar', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
    console.log('Notification click received.');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('https://localhost/brothers%20solar/customer.html')
        );
    }
});
