const CACHE_NAME = 'vibe-cache-v1';
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'icon.png',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Nunito+Sans:wght@400;700&display=swap',
    'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89ZNpQ.woff2',
    'https://fonts.gstatic.com/s/nunitosans/v15/pe0qMImSLYBIv1o4X1M8cce9I9s.woff2'
];

// Installation des Service Workers und Caching der App-Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Aktivierung des Service Workers und Bereinigung alter Caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Abfangen von Fetch-Anfragen und Ausliefern aus dem Cache (Cache-First-Strategie)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Nicht im Cache, also vom Netzwerk holen
                return fetch(event.request);
            }
        )
    );
});