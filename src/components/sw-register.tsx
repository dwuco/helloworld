"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds only (dev caching causes stale pages). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker registration failed", e));
  }, []);
  return null;
}
