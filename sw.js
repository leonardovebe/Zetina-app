// Incrementar este número en CADA deploy para forzar la actualización.
const CACHE_NAME = "zetina-v27";

const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// ── Install: precachear assets base (sin auto-activar — el usuario decide) ──────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// ── Activate: borrar cachés viejos y tomar control de las pestañas abiertas ────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Mensaje desde la app para aplicar la nueva versión inmediatamente ──────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Helpers de clasificación ───────────────────────────────────────────────────
function esImagenOFuente(request) {
  if (request.destination === "image" || request.destination === "font") return true;
  return /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot)$/i.test(new URL(request.url).pathname)
      || /fonts\.gstatic\.com/.test(request.url);
}

// ── Fetch: Network First para código, Cache First para imágenes y fuentes ───────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Cache First — imágenes y fuentes (rara vez cambian, prioriza velocidad)
  if (esImagenOFuente(request)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Network First — JS, HTML, CSS y navegación (siempre la versión más reciente)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
