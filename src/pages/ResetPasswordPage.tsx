import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import defaultSchoolLogo from "@/assets/school-logo.jpg";
import loginBg from "@/assets/login-bg.jpg";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolSubtitle, setSchoolSubtitle] = useState("");
  const [schoolLogo, setSchoolLogo] = useState(defaultSchoolLogo);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("site_settings").select("id, value").then(({ data }) => {
      data?.forEach((row) => {
        if (row.id === "school_name") setSchoolName(row.value);
        if (row.id === "school_subtitle") setSchoolSubtitle(row.value);
        if (row.id === "school_logo_url" && row.value) setSchoolLogo(row.value);
      });
    });
  }, []);

  // Detect recovery session: Supabase auto-handles the hash and fires PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check existing session in case event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (!/[A-Za-z]/.test(pwd)) return "يجب أن تحتوي على حرف واحد على الأقل";
    if (!/[0-9]/.test(pwd)) return "يجب أن تحتوي على رقم واحد على الأقل";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "يجب أن تحتوي على رمز خاص واحد على الأقل";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) {
      toast({ title: "كلمة المرور ضعيفة", description: err, variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({
        title: "تعذّر تحديث كلمة المرور",
        description: "قد يكون الرابط منتهي الصلاحية. اطلب رابطاً جديداً.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "تم تحديث كلمة المرور",
      description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    });
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-6" dir="rtl">
      <div
        className="absolute inset-0 bg-cover bg-center brightness-[0.4]"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 dark:from-black/50 dark:via-black/30 dark:to-black/40" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="bg-card/95 border-border/30 shadow-2xl backdrop-blur-xl dark:bg-card/90 dark:border-border/20 dark:shadow-black/40">
          <CardHeader className="flex flex-col items-center gap-4 pb-2">
            <div className="rounded-2xl bg-card/80 dark:bg-muted/60 p-2 shadow-card ring-1 ring-border/20 dark:ring-border/10">
              <img src={schoolLogo} alt="شعار المدرسة" className="h-20 w-auto rounded-xl" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">{schoolName || "إعادة تعيين كلمة المرور"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{schoolSubtitle}</p>
            </div>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">جارٍ التحقق من رابط إعادة التعيين...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 dark:bg-primary/20 p-3 text-sm text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>اختر كلمة مرور قوية وجديدة لحسابك</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    dir="ltr"
                    className="h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                    required
                  />
                </div>

                <ul className="space-y-1 text-xs text-muted-foreground pr-1">
                  <li>• 8 أحرف على الأقل</li>
                  <li>• تحتوي على حروف وأرقام ورموز خاصة</li>
                </ul>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? "جارٍ الحفظ..." : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      حفظ كلمة المرور الجديدة
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  العودة لتسجيل الدخول
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
