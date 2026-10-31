// Service worker: permite usar la app sin conexión.
// IMPORTANTE: al cambiar archivos de la app, subir CACHE (visor-vN) para que aparezca el aviso de actualización.
// Estrategia: red primero (siempre la versión más nueva), caché si no hay conexión.
const CACHE = 'visor-v11'
const CORE = [
  './', './index.html', './styles.css', './app.js', './store.js',
  './viewer-pdf.js', './viewer-book.js', './themes.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './lib/pdfjs/build/pdf.min.mjs', './lib/pdfjs/build/pdf.worker.min.mjs',
  './lib/pdfjs/web/pdf_viewer.mjs', './lib/pdfjs/web/pdf_viewer.css',
  './lib/foliate/view.js', './lib/foliate/epubcfi.js', './lib/foliate/progress.js',
  './lib/foliate/overlayer.js', './lib/foliate/text-walker.js', './lib/foliate/paginator.js',
  './lib/foliate/fixed-layout.js', './lib/foliate/epub.js', './lib/foliate/mobi.js',
  './lib/foliate/fb2.js', './lib/foliate/comic-book.js', './lib/foliate/search.js',
  './lib/foliate/vendor/zip.js', './lib/foliate/vendor/fflate.js',
]

self.addEventListener('install', e => {
  // cache: 'reload' saltea la caché HTTP de GitHub (10 minutos) para guardar los archivos nuevos
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  e.respondWith((async () => {
    try {
      // no-cache: siempre pregunta al servidor si hay versión nueva (si no cambió, responde 304 y es rápido)
      const res = await fetch(req, { cache: 'no-cache' })
      if (res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(req, copy))
      }
      return res
    } catch {
      const hit = await caches.match(req, { ignoreSearch: true })
      if (hit) return hit
      if (req.mode === 'navigate') return caches.match('./index.html')
      throw new Error('offline')
    }
  })())
})
