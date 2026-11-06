const CACHE = "sai-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html")));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match("/offline.html")) || Response.error()));
});
self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { /* Show the default reminder. */ }
  const date = typeof message.date === "string" ? message.date : "";
  const announcement = message.kind === "announcement";
  const url = announcement && typeof message.url === "string" && (message.url === "/community/inbox" || /^\/community\/(?:news|notices)\/[1-9]\d*$/.test(message.url))
    ? message.url : announcement ? "/community/news" : "/community/word";
  event.waitUntil(self.registration.showNotification(
    typeof message.title === "string" ? message.title : "오늘의 말씀을 묵상해요",
    {
      body: typeof message.body === "string" ? message.body : "오늘의 말씀을 확인해 보세요.",
      icon: "/icons/icon-192.png",
      badge: "/icons/notification-badge-96.png?v=3",
      tag: announcement ? `announcement-${message.id || Date.now()}` : `daily-word-${date}`,
      data: { url },
    },
  ));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  const path = typeof url === "string" && (url === "/community/inbox" || /^\/community\/(?:news|notices)(?:\/[1-9]\d*)?$/.test(url))
    ? url : url === "/community/word" ? url : "/community/word";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
