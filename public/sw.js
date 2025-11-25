// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(self.clients.claim()); // Take control of all pages
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push notification received");

  let data = {
    title: "FollowUpTimer Reminder",
    body: "You have a new reminder",
    icon: "/logo1.png",
    badge: "/logo1.png",
    tag: "reminder",
    data: {
      url: "/dashboard",
    },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        icon: parsed.icon || data.icon,
        badge: parsed.badge || data.badge,
        tag: parsed.tag || data.tag,
        data: parsed.data || data.data,
        requireInteraction: parsed.requireInteraction || false,
        silent: parsed.silent || false,
      };
    } catch (e) {
      // If parsing fails, use default data
      console.error("[Service Worker] Failed to parse push data:", e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      requireInteraction: data.requireInteraction,
      silent: data.silent,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "Open",
        },
        {
          action: "close",
          title: "Close",
        },
      ],
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked");

  event.notification.close();

  const action = event.action;

  if (action === "close") {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data?.url || "/") {
            return client.focus();
          }
        }

        // If not, open a new window
        if (clients.openWindow) {
          const url = event.notification.data?.url || "/dashboard";
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[Service Worker] Notification closed");
});
