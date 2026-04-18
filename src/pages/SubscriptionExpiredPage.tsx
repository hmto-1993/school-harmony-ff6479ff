import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarX, LogOut, Phone } from "lucide-react";

export default function SubscriptionExpiredPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    document.title = "انتهى الاشتراك | ألفا فيزياء";
  }, []);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <div className="w-full max-w-lg">
        <div className="relative rounded-3xl border-2 border-destructive/30 bg-card shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-destructive via-amber-500 to-destructive" />
          <div className="p-8 md:p-10 text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/30 mb-6">
              <CalendarX className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
              انتهى اشتراكك
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              نشكرك على استخدامك منصة ألفا فيزياء. لقد انتهت صلاحية اشتراكك الحالي،
              ولن تتمكن من الوصول إلى أدوات المنصة حتى يتم تجديد الاشتراك.
            </p>
            <div className="rounded-xl bg-muted/50 border border-border p-4 mb-6 text-right">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                <Phone className="h-4 w-4 text-primary" />
                للتجديد
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يرجى التواصل مع إدارة المنصة لتجديد اشتراكك. ستتمكن من الدخول مباشرة بمجرد تفعيل التجديد.
              </p>
            </div>
            <Button onClick={signOut} variant="outline" className="gap-2 w-full">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
        <p className="text-center mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ألفا فيزياء — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
