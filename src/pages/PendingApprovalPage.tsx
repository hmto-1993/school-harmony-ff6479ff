import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, Clock, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApprovalPage() {
  const { user, loading, approvalStatus, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "حسابك قيد المراجعة | منصة المتميز الرقمية";
  }, []);

  if (loading || approvalStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (approvalStatus === "approved") return <Navigate to="/dashboard" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isRejected = approvalStatus === "rejected";

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-10"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative w-full max-w-xl">
        <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl p-8 md:p-10 text-center">
          <div className="mx-auto mb-6 relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/60 animate-pulse" />
            <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
              {isRejected ? (
                <ShieldCheck className="h-9 w-9 text-destructive" />
              ) : (
                <Clock className="h-9 w-9 text-primary" />
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            منصة المتميز الرقمية — منصة إدارة الفصول
          </div>

          {isRejected ? (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
                تم الاعتذار عن طلبك
              </h1>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                نأسف لإبلاغك بأن طلب تفعيل حسابك لم تتم الموافقة عليه في الوقت الحالي.
                يمكنك التواصل مع إدارة المنصة للاستفسار عن الأسباب وإعادة تقديم الطلب.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
                شكراً لتسجيلك في منصة المتميز الرقمية 🎓
                <span className="block text-primary text-xl md:text-2xl mt-2">
                  حسابك بانتظار إتمام الاشتراك
                </span>
              </h1>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                تم استلام طلبك للانضمام إلى المنصة بنجاح.
                <br />
                <strong className="text-foreground">يرجى التواصل مع الإدارة لإتمام دفع الاشتراك وتفعيل حسابك.</strong>
                <br />
                ستتمكن من الدخول واستخدام جميع الأدوات فور تأكيد الاشتراك من قبل المالك.
              </p>
              <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground/85 text-right">
                💡 جميع الباقات (الأساسية والمتكاملة) تتطلب اشتراكاً مدفوعاً وتفعيلاً يدوياً من إدارة المنصة لضمان جودة الخدمة.
              </div>
            </>
          )}

          <div className="my-8 grid grid-cols-3 gap-3 text-xs md:text-sm">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="font-bold text-foreground mb-1">١</div>
              <div className="text-muted-foreground">تسجيل</div>
            </div>
            <div className="rounded-xl bg-primary/10 border-2 border-primary p-3">
              <div className="font-bold text-primary mb-1">٢</div>
              <div className="text-primary font-semibold">المراجعة</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="font-bold text-foreground mb-1">٣</div>
              <div className="text-muted-foreground">التفعيل</div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              مسجل بـ: <span className="font-semibold text-foreground">{user.email}</span>
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} منصة المتميز الرقمية — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
