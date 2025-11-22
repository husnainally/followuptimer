"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on page load
 * This ensures the service worker is available before push subscription attempts
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .then((registration) => {
          console.log("[SW] Service Worker registered:", registration.scope);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[SW] New service worker available");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[SW] Service Worker registration failed:", error);
        });

      // Listen for service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[SW] Service Worker updated, reloading...");
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}

