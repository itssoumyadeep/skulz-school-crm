"use client";

import { useEffect } from "react";
import { registerBackgroundSync } from "./lib/offline-sync";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        await registerBackgroundSync();
        window.addEventListener("online", () => {
          void registerBackgroundSync();
        });
      })
      .catch(() => {
        // Registration failure is non-blocking for UI rendering.
      });
  }, []);

  return null;
}
