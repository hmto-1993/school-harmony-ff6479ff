import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // On iOS, show manual instructions after delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop – listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[90] flex justify-center animate-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4">
            {/* Icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary-foreground" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">ثبّت التطبيق على جهازك</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isIOS
                  ? "اضغط على زر المشاركة ⬆ ثم \"إضافة إلى الشاشة الرئيسية\""
                  : "تجربة أسرع مع إشعارات فورية!"}
              </p>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-1.5">
              {!isIOS && deferredPrompt && (
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="rounded-xl h-9 px-4 text-xs font-bold gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  تثبيت
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
