import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const OPT_OUT_KEY = "notification_opt_in_dismissed";
const OPT_IN_KEY = "notification_opt_in_enabled";

/**
 * In-app notification opt-in card.
 *
 * NOTE: Browser-level push notifications are not yet configured (no production
 * VAPID keys / no service worker). This card only enables in-app toasts that
 * appear while the user has the app open, via InAppNotificationListener.
 */
export default function NotificationOptIn() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(OPT_OUT_KEY);
    const enabled = localStorage.getItem(OPT_IN_KEY);
    if (dismissed || enabled) return;

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = () => {
    setLoading(true);
    try {
      localStorage.setItem(OPT_IN_KEY, "true");
      localStorage.removeItem(OPT_OUT_KEY);
    } catch (err) {
      console.error("Failed to save notification preference:", err);
    } finally {
      setLoading(false);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(OPT_OUT_KEY, "true");
    } catch (err) {
      console.error("Failed to save dismiss preference:", err);
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 animate-in fade-in duration-300" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        <CardContent className="p-0">
          <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">تنبيهات داخل التطبيق 🔔</h3>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-muted-foreground text-center leading-relaxed">
              فعّل التنبيهات لتظهر لك إشعارات فورية داخل التطبيق عند نشر اختبارات جديدة، ملفات، أو إعلانات مهمة.
            </p>

            <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3">
              <Bell className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-foreground">تظهر التنبيهات أثناء استخدامك للتطبيق</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 rounded-2xl h-12 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90"
              >
                {loading ? "جارٍ التفعيل..." : "تفعيل التنبيهات"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="rounded-2xl h-12 px-4 text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
