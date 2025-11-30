/**
 * PLA Service Worker - Offline Support
 */
const CACHE_NAME = 'pla-v1.0';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately
const PRECACHE_FILES = [
    '/',
    '/index.html',
    '/docs/',
    '/docs/index.html',
    '/docs/designer/',
    '/docs/designer/index.html',
    '/docs/designer/styles.css',
    '/docs/designer/params.json',
    '/docs/designer/palette.json',
    '/docs/designer/view.json',
    '/docs/designer/specs/poles.json',
    '/docs/designer/specs/conductors.json',
    '/docs/designer/specs/nesc.json',
    '/docs/designer/scripts/main.js',
    '/docs/designer/scripts/state.js',
    '/docs/designer/scripts/scene.js',
    '/docs/designer/scripts/poles.js',
    '/docs/designer/scripts/spans.js',
    '/docs/designer/scripts/analysis.js',
    '/docs/designer/scripts/ui.js',
    '/docs/designer/scripts/guys.js',
    '/docs/designer/scripts/history.js',
    '/docs/designer/scripts/shortcuts.js',
    '/docs/assets/css/base.css',
    '/offline.html'
];

// External resources to cache on first use
const EXTERNAL_CACHE = [
    'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install - precache files
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Precaching files');
                return cache.addAll(PRECACHE_FILES);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) {
                    // Return cached, but update in background
                    event.waitUntil(updateCache(request));
                    return cached;
                }

                return fetch(request)
                    .then(response => {
                        // Cache successful responses
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation
                        if (request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Update cache in background
async function updateCache(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (e) {
        // Network unavailable, keep using cache
    }
}

// Handle messages from app
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
