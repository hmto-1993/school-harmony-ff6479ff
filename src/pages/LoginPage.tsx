import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import defaultSchoolLogo from "@/assets/school-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { GraduationCap, Shield, ArrowLeft, Users, Sun, Moon } from "lucide-react";
import SignupWizardDialog from "@/components/auth/SignupWizardDialog";
import BrandName from "@/components/BrandName";
import { useTheme } from "@/hooks/use-theme";

export default function LoginPage() {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [studentNationalId, setStudentNationalId] = useState("");
  const [parentNationalId, setParentNationalId] = useState("");
  const [signupOpen, setSignupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("منصة المتميز التعليمية");
  const [schoolSubtitle, setSchoolSubtitle] = useState("نظام إدارة المدارس والفصول الدراسية");
  const [schoolLogo, setSchoolLogo] = useState(defaultSchoolLogo);
  const { signIn, signInStudent, user, isStudent } = useAuth();
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

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
    if (isStudent) navigate("/student", { replace: true });
  }, [user, isStudent, navigate]);

  const handleForgotPassword = async () => {
    if (!nationalId.trim()) {
      toast({
        title: "أدخل رقم الهوية أولاً",
        description: "يرجى كتابة رقم الهوية الوطنية ثم الضغط على نسيت كلمة المرور",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const uniformToast = () => {
      toast({
        title: "تم استلام الطلب",
        description: "إذا كان رقم الهوية مسجلاً لدينا، فسيتم إرسال رابط إعادة تعيين كلمة المرور إلى البريد المسجل خلال دقائق. يرجى مراجعة صندوق الوارد والرسائل المهملة.",
      });
    };
    try {
      const { data } = await supabase.functions.invoke("lookup-staff-email", {
        body: { national_id: nationalId.trim() },
      });
      // Only attempt to send if we got a real email — never reveal which case occurred
      if (data?.email && !data.email.includes("***") && data.email.includes("@")) {
        await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }
    } catch {
      // Swallow errors — uniform response either way
    }
    uniformToast();
    setLoading(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalId.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const { data, error: lookupError } = await supabase.functions.invoke("lookup-staff-email", {
        body: { national_id: nationalId },
      });

      if (lookupError || data?.error) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: data?.error || "رقم الهوية غير مسجل",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn(data.email, password);
      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "رقم الهوية أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = studentNationalId.replace(/\D/g, "");
    if (!sanitized || sanitized.length !== 10) {
      toast({ title: "خطأ", description: "رقم الهوية يجب أن يتكون من 10 أرقام", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signInStudent(sanitized, "student");
    setLoading(false);

    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error,
        variant: "destructive",
      });
    } else {
      navigate("/student");
    }
  };

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = parentNationalId.replace(/\D/g, "");
    if (!sanitized || sanitized.length !== 10) {
      toast({ title: "خطأ", description: "رقم الهوية يجب أن يتكون من 10 أرقام", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signInStudent(sanitized, "parent");
    setLoading(false);

    if (error) {
      toast({
        title: "عذراً",
        description: "رقم الهوية غير مسجل. يرجى التواصل مع معلم المادة.",
        variant: "destructive",
      });
    } else {
      navigate("/student");
    }
  };



  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-6 bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center brightness-90 dark:brightness-[0.4]"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/50 to-background/70 dark:from-black/50 dark:via-black/30 dark:to-black/40" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="bg-card/95 border-border/30 shadow-2xl dark:bg-card/90 dark:border-border/20 dark:shadow-black/40">
          <CardHeader className="flex flex-col items-center gap-4 pb-2">
            <div className="relative rounded-2xl bg-gradient-to-br from-card/95 via-card/85 to-muted/60 dark:from-muted/70 dark:via-muted/50 dark:to-muted/30 p-2.5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] ring-1 ring-[hsl(42,40%,55%)]/30 dark:ring-[hsl(42,40%,55%)]/20">
              <img
                src={schoolLogo}
                alt="شعار منصة المتميز التعليمية"
                onError={() => setSchoolLogo(defaultSchoolLogo)}
                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-contain bg-white/70 dark:bg-white p-2 ring-1 ring-white/30 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-300 ease-out hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
            <div className="text-center">
              <BrandName name={schoolName} className="text-2xl md:text-[26px] leading-tight" />
              <p className="mt-1.5 text-xs tracking-wide text-muted-foreground/80">{schoolSubtitle}</p>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="staff" dir="rtl">
              <TabsList className="grid w-full grid-cols-3 mb-5 h-11 rounded-xl bg-muted/80 dark:bg-muted/40">
                <TabsTrigger value="staff" className="gap-1 rounded-lg data-[state=active]:shadow-sm text-xs px-1">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">معلم</span>
                </TabsTrigger>
                <TabsTrigger value="student" className="gap-1 rounded-lg data-[state=active]:shadow-sm text-xs px-1">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">طالب</span>
                </TabsTrigger>
                <TabsTrigger value="parent" className="gap-1 rounded-lg data-[state=active]:shadow-sm text-xs px-1">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">ولي أمر</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-id">رقم الهوية الوطنية</Label>
                    <Input
                      id="staff-id"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234567890"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      dir="ltr"
                      className="text-right h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-password">كلمة المرور</Label>
                    <Input
                      id="staff-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      dir="ltr"
                      className="h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity text-primary-foreground font-semibold" disabled={loading}>
                    {loading ? "جارٍ الدخول..." : (
                      <span className="flex items-center gap-2">
                        تسجيل الدخول
                        <ArrowLeft className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors disabled:opacity-50"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="student">
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">رقم الهوية الوطنية</Label>
                    <Input
                      id="student-id"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234567890"
                      value={studentNationalId}
                      onChange={(e) => setStudentNationalId(e.target.value)}
                      dir="ltr"
                      className="text-right h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity text-primary-foreground font-semibold" disabled={loading}>
                    {loading ? "جارٍ الدخول..." : (
                      <span className="flex items-center gap-2">
                        دخول الطالب
                        <ArrowLeft className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="parent">
                <form onSubmit={handleParentSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    أدخل رقم هوية ابنك لمتابعة أدائه الأكاديمي
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="parent-id">رقم هوية الطالب</Label>
                    <Input
                      id="parent-id"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1234567890"
                      value={parentNationalId}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setParentNationalId(v);
                      }}
                      dir="ltr"
                      className="text-right h-11 rounded-xl dark:bg-muted/30 dark:border-border/30"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity text-primary-foreground font-semibold" disabled={loading}>
                    {loading ? "جارٍ الدخول..." : (
                      <span className="flex items-center gap-2">
                        متابعة ابني
                        <ArrowLeft className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div dir="rtl" className="mt-5 pt-4 border-t border-border/40 flex items-center justify-center gap-2">
              <span className="text-sm text-foreground">مستخدم جديد؟</span>
              <button
                type="button"
                onClick={() => setSignupOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 underline underline-offset-4 decoration-2 transition-colors"
              >
                اشتراك
              </button>
            </div>
            <SignupWizardDialog open={signupOpen} onOpenChange={setSignupOpen} />

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
