// Damit die App auch im Keller oder auf dem Land ohne Netz startet.
// Die Seite selbst holt er zuerst frisch (so kommen Neuerungen an), die
// Bausteine mit festem Namen kommen aus dem Speicher – die ändern sich nie,
// eine neue Version bekommt neue Namen.
const ABLAGE = 'blitzblank24-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ABLAGE).then((c) => c.addAll(['./', './manifest.webmanifest', './apple-touch-icon.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== ABLAGE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== location.origin) return;

  if (anfrage.mode === 'navigate') {
    e.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(ABLAGE).then((c) => c.put('./', kopie));
          return antwort;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  e.respondWith(
    caches.match(anfrage).then((gespeichert) => gespeichert || fetch(anfrage).then((antwort) => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(ABLAGE).then((c) => c.put(anfrage, kopie));
      }
      return antwort;
    })),
  );
});
