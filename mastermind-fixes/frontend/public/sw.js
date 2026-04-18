self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Mastermind";
  const options = {
    body: data.body || "Your session is ready.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "mastermind",
    renotify: true,
    requireInteraction: false,
    data: { url: "/today" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/today"));
});
