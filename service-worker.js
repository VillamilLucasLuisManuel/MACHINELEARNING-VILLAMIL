/* =====================================================
   CBTIS 260 · Service Worker
   Precaché + cache-first + fallback offline + versionado
   ===================================================== */
const VERSION = 'v6-luis';
const CACHE = 'cbtis260-' + VERSION;      // sube VERSION cada vez que cambies archivos

// Archivos propios (rutas relativas al scope)
const ARCHIVOS = [
  './', 'index.html', 'modelo.html', 'informacion.html', 'manifest.json',
  'css/styles.css', 'js/script.js', 'js/modelo.js',
  'modelo/model.json', 'modelo/weights.bin', 'modelo/metadata.json',
  'imagenes/logo-cbtis260.png',
  'imagenes/iconos/icon-192.png', 'imagenes/iconos/icon-512.png', 'imagenes/iconos/icon-maskable-512.png',
  'imagenes/iconos/apple-touch-icon.png', 'imagenes/iconos/facebook.png',
  'imagenes/iconos/instagram.png'
];
// Librerías de CDN (se guardan para que la app funcione sin conexión)
const LIBRERIAS = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js'
];

// Instalación: guarda cada archivo por separado (si uno falla no se cancela todo)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all([...ARCHIVOS, ...LIBRERIAS].map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => console.warn('No precacheado:', a)))))
      .then(() => self.skipWaiting())
  );
});

// Activación: elimina cachés de versiones anteriores
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('cbtis260-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Peticiones
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Páginas HTML: red primero para ver siempre la versión nueva; sin conexión, caché
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('index.html')))
    );
    return;
  }

  // CSS y JS propios: red primero para que los cambios de diseño se vean al instante
  const url = new URL(req.url);
  if (url.origin === location.origin && /\.(css|js)$/.test(url.pathname) && !url.pathname.endsWith('service-worker.js')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Recursos estáticos: cache-first; si no está, red (y se guarda)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit ||
      fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return res;
      }).catch(() => Response.error())
    )
  );
});
