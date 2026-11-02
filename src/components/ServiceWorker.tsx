"use client";

import { useEffect, useState } from "react";

/** Registra el service worker y avisa cuando no hay conexión. */
export function ServiceWorker() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] bg-fg px-3 py-1 text-center text-xs font-medium text-bg">
      Sin conexión · tus series se guardan en el móvil y se envían al volver la señal
    </div>
  );
}
