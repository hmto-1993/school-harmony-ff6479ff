import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import loginBg from "@/assets/login-bg.jpg";
import { Building2, User, ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type OrgType = "school" | "individual";
type Step = "choose" | "details";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [loading, setLoading] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const choose = (type: OrgType) => {
    setOrgType(type);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgType) return;

    if (password.length < 8) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-organization", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          national_id: nationalId.trim() || undefined,
          phone: phone.trim() || undefined,
          organization_type: orgType,
          organization_name: orgName.trim(),
        },
      });

      if (error || data?.error) {
        toast({
          title: "تعذر إنشاء الحساب",
          description: data?.error || "حدث خطأ، حاول مرة أخرى",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Auto sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        toast({
          title: "تم إنشاء الحساب",
          description: "يرجى تسجيل الدخول بحسابك الجديد",
        });
        navigate("/login", { replace: true });
      } else {
        toast({
          title: "مرحباً بك! 🎉",
          description: orgType === "school" ? "تم إنشاء مدرستك بنجاح" : "تم إنشاء حسابك بنجاح",
        });
        navigate("/dashboard", { replace: true });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8" dir="rtl">
      <div
        className="absolute inset-0 bg-cover bg-center brightness-[0.4]"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 dark:from-black/50 dark:via-black/30 dark:to-black/40" />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        <Card className="bg-card/95 border-border/30 shadow-2xl dark:bg-card/90">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 rounded-2xl bg-primary/10 p-3 w-fit">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {step === "choose" ? "إنشاء حساب جديد" : orgType === "school" ? "تسجيل مدرسة" : "تسجيل معلم فردي"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === "choose" ? "اختر نوع الحساب المناسب لك" : "أكمل بيانات الحساب لإكمال التسجيل"}
            </p>
          </CardHeader>

          <CardContent>
            {step === "choose" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => choose("school")}
                  className={cn(
                    "group rounded-2xl border-2 border-border/40 p-6 text-right transition-all",
                    "hover:border-primary hover:shadow-lg hover:-translate-y-0.5 hover:bg-primary/5",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">تسجيل كمدرسة</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    نظام متعدد المستخدمين لإدارة المعلمين والطلاب وأولياء الأمور تحت مؤسسة واحدة.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => choose("individual")}
                  className={cn(
                    "group rounded-2xl border-2 border-border/40 p-6 text-right transition-all",
                    "hover:border-primary hover:shadow-lg hover:-translate-y-0.5 hover:bg-primary/5",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-xl bg-accent/20 p-3 group-hover:bg-accent/30 transition-colors">
                    <User className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">معلم فردي</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    حساب شخصي للمعلم لإدارة فصوله وطلابه بشكل مستقل دون الحاجة لإدارة مدرسية.
                  </p>
                </button>

                <div className="md:col-span-2 text-center pt-2">
                  <Link to="/login" className="text-sm text-primary hover:underline">
                    لديك حساب بالفعل؟ تسجيل الدخول
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">
                    {orgType === "school" ? "اسم المدرسة" : "اسم الحساب (اسمك أو لقبك المهني)"}
                  </Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                    placeholder={orgType === "school" ? "مثال: مدرسة الأمل الابتدائية" : "مثال: أ. أحمد العتيبي"}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">الاسم الكامل</Label>
                    <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="national-id">رقم الهوية (اختياري)</Label>
                    <Input
                      id="national-id"
                      inputMode="numeric"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                      dir="ltr"
                      className="text-right h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="text-right h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال (اختياري)</Label>
                    <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-right h-11 rounded-xl" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} dir="ltr" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} dir="ltr" className="h-11 rounded-xl" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep("choose")} className="flex-1 h-11 rounded-xl gap-2">
                    <ArrowRight className="h-4 w-4" />
                    رجوع
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-[2] h-11 rounded-xl gradient-primary text-primary-foreground font-semibold gap-2">
                    {loading ? "جارٍ إنشاء الحساب..." : (
                      <>
                        إنشاء الحساب
                        <ArrowLeft className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
