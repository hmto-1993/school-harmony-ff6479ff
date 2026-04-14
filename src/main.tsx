import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister()));
    });

    if ("caches" in window) {
      void window.caches.keys().then((keys) => {
        void Promise.all(keys.map((key) => window.caches.delete(key)));
      });
    }
  } else {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        void registration.update();
      },
      onRegisterError(error) {
        console.error("PWA registration failed", error);
      },
    });
  }
}
