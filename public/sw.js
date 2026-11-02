/* Service worker de Gym Planner: permite abrir y usar el entreno sin cobertura.
 * - Páginas (navegación): red primero, y si no hay red, la última copia guardada.
 * - /_next/static y fuentes: caché primero (los ficheros llevan hash).
 * - Imágenes de ejercicios: caché primero.
 * Las Server Actions (POST) nunca se cachean; el cliente guarda sus cambios en cola local.
 */
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, STATIC, IMAGES]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: false });
    if (hit) return hit;
    const url = new URL(request.url);
    const fallback = await cache.match(url.pathname);
    if (fallback) return fallback;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Sin conexión</title><body style='font-family:system-ui;padding:2rem'><h1>Sin conexión</h1><p>Esta pantalla no se ha abierto antes con cobertura. Vuelve a intentarlo cuando tengas señal.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Las respuestas opacas (imágenes de otro dominio) tienen status 0 y también se guardan.
  if (res.ok || res.type === "opaque") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (request.destination === "image" || url.hostname === "raw.githubusercontent.com") {
    event.respondWith(cacheFirst(request, IMAGES).catch(() => Response.error()));
  }
});
