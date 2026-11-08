// Damit die App auch im Keller oder auf dem Land ohne Netz startet.
// Die Seite selbst holt er zuerst frisch (so kommen Neuerungen an), die
// Bausteine mit festem Namen kommen aus dem Speicher – die ändern sich nie,
// eine neue Version bekommt neue Namen.
//
// Den Namen hochzählen, wenn sich DIESE Datei ändert: Nur dann merkt das
// Handy, dass es einen neuen Offline-Helfer gibt.
const ABLAGE = 'blitzblank24-v4';

// Gleich beim Einrichten die Startseite UND alle Bausteine ablegen, die sie
// braucht. Sonst fehlen sie nach einem Update im Speicher (der alte wird
// weggeräumt), und wer die App danach als Erstes ohne Netz öffnet, sieht
// eine leere Seite.
async function allesAblegen() {
  const c = await caches.open(ABLAGE);
  const antwort = await fetch('./', { cache: 'no-store' });
  if (!antwort.ok) throw new Error('Startseite nicht erreichbar');
  const html = await antwort.clone().text();
  const bausteine = [...new Set([...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]))];
  await c.put('./', antwort);
  await c.addAll(['./manifest.webmanifest', './apple-touch-icon.png', ...bausteine]);
}

self.addEventListener('install', (e) => {
  e.waitUntil(allesAblegen());
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
    // „no-store“: GitHub erlaubt dem Browser, die Startseite 10 Minuten
    // aufzuheben – auf dem iPhone hielt er sie noch länger fest, und neue
    // Funktionen kamen nicht an. So geht die Frage immer bis zum Server.
    e.respondWith(
      fetch(anfrage.url, { cache: 'no-store', credentials: 'same-origin' })
        .then((antwort) => {
          if (antwort.ok) {
            const kopie = antwort.clone();
            caches.open(ABLAGE).then((c) => c.put('./', kopie));
          }
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
