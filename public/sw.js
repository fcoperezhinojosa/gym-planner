/* Service worker de Gym Planner: permite abrir y usar el entreno sin cobertura
 * y arrancar la PWA al instante sin quedarse atascada en el splash del sistema.
 * - /boot (start_url de la PWA): precacheada + stale-while-revalidate (FCP en milisegundos).
 * - Resto de páginas (navegación): red primero, y si no hay red, la última copia guardada.
 * - /_next/static y fuentes: caché primero (los ficheros llevan hash).
 * - Imágenes de ejercicios: caché primero (los iconos propios no se congelan en caché).
 * Las Server Actions (POST) nunca se cachean; el cliente guarda sus cambios en cola local.
 */
const VERSION = "v4";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;

/** Descarga /boot y precachea sus CSS/JS estáticos para que pinte e hidrate sin esperar a la red. */
async function warmBootShell() {
  try {
    const res = await fetch("/boot", { cache: "no-cache" });
    if (!res.ok || res.redirected) return;
    const html = await res.clone().text();
    const shellCache = await caches.open(SHELL);
    await shellCache.put("/boot", res);

    const staticCache = await caches.open(STATIC);
    const assetUrls = new Set([
      ...[...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]),
    ]);
    await Promise.all(
      [...assetUrls].map(async (assetUrl) => {
        try {
          if (await staticCache.match(assetUrl)) return;
          const assetRes = await fetch(assetUrl);
          if (assetRes.ok) await staticCache.put(assetUrl, assetRes);
        } catch {}
      }),
    );
  } catch {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(warmBootShell().finally(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, PAGES, STATIC, IMAGES]);
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
    if (url.origin === self.location.origin && url.pathname === "/boot") {
      event.waitUntil(warmBootShell());
      event.respondWith(
        caches
          .open(SHELL)
          .then((cache) => cache.match("/boot"))
          .then((hit) => hit || fetch(request))
          .catch(() => networkFirstPage(request)),
      );
      return;
    }
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (url.origin === self.location.origin && /^\/(icon|apple-icon)/.test(url.pathname)) {
    return;
  }
  if (request.destination === "image" || url.hostname === "raw.githubusercontent.com") {
    event.respondWith(cacheFirst(request, IMAGES).catch(() => Response.error()));
  }
});
