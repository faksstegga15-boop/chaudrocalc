// ChaudroCalc service worker
// Pages : réseau d'abord (toujours la dernière version en ligne), cache si hors ligne.
// Autres fichiers (icônes, polices) : cache d'abord.
const CACHE = 'chaudrocalc-v12';
const SHELL = ['./', 'index.html', 'app.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2',
  'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-500-normal.woff2',
  'fonts/ibm-plex-sans-latin-600-normal.woff2', 'fonts/ibm-plex-mono-latin-500-normal.woff2'];

// Copie propre d'une réponse : si l'hébergeur a redirigé (ex. app.html → /app), le navigateur refuse
// de servir une réponse « redirigée » pour une page ; on la recopie donc sans ce marqueur.
const clean = res => res.redirected ? res.blob().then(b => new Response(b, {status: res.status, headers: res.headers})) : res;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => fetch(u, {cache: 'reload'}).then(clean).then(r => { if (r.ok) return c.put(u, r); }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    // Chaque page est gardée sous sa propre adresse (sans le ?accueil ni le #onglet)
    const url = new URL(req.url); url.search = ''; url.hash = '';
    const key = url.pathname.endsWith('/') ? url.href + 'index.html' : url.href;
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); clean(copy).then(r => caches.open(CACHE).then(c => c.put(key, r))); }
        return res;
      }).catch(() => caches.match(key).then(hit => hit || caches.match('app.html')))
    );
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
    return res;
  })));
});
