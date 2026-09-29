"use client";

import { useEffect } from "react";

/** Registra o service worker (somente em produção, para não atrapalhar o desenvolvimento). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Falha ao registrar service worker:", err);
    });
  }, []);

  return null;
}
