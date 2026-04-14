import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function clearLegacyServiceWorkers() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  }
}

void clearLegacyServiceWorkers().catch(() => undefined);

createRoot(document.getElementById("root")!).render(<App />);
