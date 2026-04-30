import { useState, useEffect } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/push-notifications";
import { useAuth } from "@/contexts/AuthContext";

export default function NotificationOptIn() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { student } = useAuth();

  useEffect(() => {
    if (!isNotificationSupported()) return;
    if (getNotificationPermission() !== "default") return;
    const dismissed = localStorage.getItem("notification_opt_in_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        try {
          await subscribeToPush(student?.id, student?.class_id || undefined);
        } catch (err) {
          console.error("subscribeToPush failed:", err);
        }
        localStorage.setItem("notification_opt_in_dismissed", "true");
      } else {
        // المستخدم رفض أو أغلق نافذة الإذن — لا نزعجه مرة أخرى
        localStorage.setItem("notification_opt_in_dismissed", "true");
      }
    } catch (err) {
      console.error("requestNotificationPermission failed:", err);
    } finally {
      setLoading(false);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notification_opt_in_dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 animate-in fade-in duration-300" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        <CardContent className="p-0">
          {/* Header gradient */}
          <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">لا تفوّت أي جديد! 🔔</h3>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-muted-foreground text-center leading-relaxed">
              فعّل الإشعارات لتصلك تنبيهات فورية عند نشر اختبارات جديدة أو ملفات أو إعلانات مهمة لفصلك.
            </p>

            <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3">
              <Smartphone className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-foreground">تعمل الإشعارات حتى عند إغلاق التطبيق</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 rounded-2xl h-12 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90"
              >
                {loading ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
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
