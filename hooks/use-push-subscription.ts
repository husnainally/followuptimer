"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: "default",
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      const permission = Notification.permission;
      let isSubscribed = false;

      try {
        // Wait for service worker to be ready (it should be registered by ServiceWorkerRegister component)
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (error) {
        console.error("Error checking subscription:", error);
        // If service worker isn't ready, try to register it
        try {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        } catch (regError) {
          console.error("Error registering service worker:", regError);
        }
      }

      setState({
        isSupported: true,
        isSubscribed,
        isLoading: false,
        permission,
      });
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register service worker (if not already registered)
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
      }
      await navigator.serviceWorker.ready;

      // Get VAPID public key from API
      let vapidPublicKey: string;
      try {
        const response = await fetch(
          "/api/push-subscriptions/vapid-public-key"
        );
        if (!response.ok) {
          throw new Error("Failed to get VAPID public key");
        }
        const data = await response.json();
        if (!data.publicKey) {
          throw new Error("VAPID public key not configured");
        }
        vapidPublicKey = data.publicKey;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to get push notification keys"
        );
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
              auth: arrayBufferToBase64(subscription.getKey("auth")!),
            },
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to enable push notifications"
      );
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push service
        await subscription.unsubscribe();

        // Remove from server
        const response = await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove subscription");
        }
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to disable push notifications"
      );
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
