/* =========================================================================
   JARVIS — service worker
   -------------------------------------------------------------------------
   Caches the shell so the console opens instantly and works with no
   connection. Your data was never on a network anyway — it's in
   localStorage — so offline Jarvis is a fully working Jarvis, minus speech
   recognition, which is the one piece that needs a connection.
   ========================================================================= */
var CACHE = 'jarvis-v2';

var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/jarvis.css',
  './assets/js/util.js',
  './assets/js/store.js',
  './assets/js/data.js',
  './assets/js/voice.js',
  './assets/js/skills.js',
  './assets/js/core.js',
  './assets/js/app.js',
  './assets/img/reactor.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      /* addAll is all-or-nothing; one 404 would leave us with no cache at
         all, so add them individually and tolerate a miss. */
      .then(function (c) {
        return Promise.all(SHELL.map(function (url) {
          return c.add(url).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fonts etc. go to network

  /* Network first, so an updated build lands as soon as it's reachable;
     cache is the fallback when it isn't. */
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
