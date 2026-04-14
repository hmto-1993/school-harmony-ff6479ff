import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LEGACY_SW_RELOAD_KEY = "__legacy_sw_cleanup_reloaded__";

async function clearLegacyServiceWorkers() {
  let changed = false;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (registrations.length > 0) {
      const unregisterResults = await Promise.all(
        registrations.map((registration) => registration.unregister().catch(() => false)),
      );

      changed = unregisterResults.some(Boolean) || changed;
    }
  }

  if ("caches" in window) {
    const keys = await window.caches.keys();

    if (keys.length > 0) {
      const deleteResults = await Promise.all(
        keys.map((key) => window.caches.delete(key).catch(() => false)),
      );

      changed = deleteResults.some(Boolean) || changed;
    }
  }

  if (
    changed &&
    typeof window !== "undefined" &&
    !window.sessionStorage.getItem(LEGACY_SW_RELOAD_KEY)
  ) {
    window.sessionStorage.setItem(LEGACY_SW_RELOAD_KEY, "true");
    window.location.reload();
  }
}

void clearLegacyServiceWorkers().catch(() => undefined);

createRoot(document.getElementById("root")!).render(<App />);
