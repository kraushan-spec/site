const CACHE_NAME = "koshelek-v1";
const API_CACHE_NAME = "koshelek-api-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon.svg"];
const KNOWN_CACHES = [CACHE_NAME, API_CACHE_NAME];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations & API calls (data must stay fresh), falling back to
// cache/offline page when the network is unavailable. Static assets: cache-first.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    // Always prefer a live response — financial data must stay accurate while online.
    // Only when the network is truly unreachable do we serve the last-known response,
    // so the app stays usable (read-only) offline instead of erroring out.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
            const copy = res.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        });
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "Кошелёк Онлайн", body: "Новое уведомление", url: "/tasks" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: payload.url || "/tasks" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/tasks";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
