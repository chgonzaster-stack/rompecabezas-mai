"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Si no tienes un sw.js aún, esto no rompe nada:
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
