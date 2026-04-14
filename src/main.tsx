import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      void registration.update();

      const updateInterval = window.setInterval(() => {
        void registration.update();
      }, 60_000);

      window.addEventListener(
        "beforeunload",
        () => {
          window.clearInterval(updateInterval);
        },
        { once: true }
      );
    },
    onRegisterError(error) {
      console.error("PWA registration failed", error);
    },
  });
}
