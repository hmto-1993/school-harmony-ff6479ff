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
import defaultSchoolLogo from "@/assets/school-logo.jpg";
import loginBg from "@/assets/login-bg.jpg";
import { GraduationCap, Shield, ArrowLeft, Users, UserPlus, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LoginPage() {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [studentNationalId, setStudentNationalId] = useState("");
  const [parentNationalId, setParentNationalId] = useState("");
  // Subscription form
  const [subFullName, setSubFullName] = useState("");
  const [subNationalId, setSubNationalId] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolSubtitle, setSchoolSubtitle] = useState("");
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

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = subNationalId.replace(/\D/g, "");
    if (!subFullName.trim() || cleanId.length !== 10 || !subEmail.trim() || subPassword.length < 6) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تعبئة كافة الحقول. كلمة المرور 6 أحرف على الأقل.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: subEmail.trim(),
      password: subPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: subFullName.trim(),
          national_id: cleanId,
          signup_type: "subscriber",
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({
        title: "تعذّر إنشاء الحساب",
        description: error.message.includes("already") ? "هذا البريد مسجّل مسبقاً" : error.message,
        variant: "destructive",
      });
      return;
    }

    if (data?.user && !data.session) {
      toast({
        title: "تم إنشاء الحساب ✓",
        description: "تم إرسال رابط التفعيل إلى بريدك الإلكتروني. فعّل الحساب ثم سجّل دخولك.",
      });
    } else {
      toast({
        title: "أهلاً بك ✓",
        description: "تم إنشاء بيئة عملك المستقلة بنجاح.",
      });
    }
    setSubFullName(""); setSubNationalId(""); setSubEmail(""); setSubPassword("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-cover bg-center brightness-[0.4]"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 dark:from-black/50 dark:via-black/30 dark:to-black/40" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="bg-card/95 border-border/30 shadow-2xl dark:bg-card/90 dark:border-border/20 dark:shadow-black/40">
          <CardHeader className="flex flex-col items-center gap-4 pb-2">
            <div className="rounded-2xl bg-card/80 dark:bg-muted/60 p-2 shadow-card ring-1 ring-border/20 dark:ring-border/10">
              <img src={schoolLogo} alt="شعار المدرسة" className="h-20 w-auto rounded-xl" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">{schoolName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{schoolSubtitle}</p>
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

            <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">عميل جديد؟</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm font-bold text-primary hover:text-primary/80 underline underline-offset-4 decoration-2 transition-colors"
                  >
                    اشتراك
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-right">
                      <UserPlus className="h-5 w-5 text-primary" />
                      إنشاء اشتراك جديد
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubscribeSubmit} className="space-y-3">
                    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-3 text-center">
                      <p className="text-xs font-bold text-foreground">بيئة عمل مستقلة 100%</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        طلابك وفصولك وبياناتك خاصة بك وحدك.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sub-name" className="text-xs">الاسم الكامل</Label>
                      <Input
                        id="sub-name"
                        value={subFullName}
                        onChange={(e) => setSubFullName(e.target.value)}
                        placeholder="أ. محمد بن عبدالله"
                        className="h-10 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sub-id" className="text-xs">رقم الهوية الوطنية</Label>
                      <Input
                        id="sub-id"
                        inputMode="numeric"
                        value={subNationalId}
                        onChange={(e) => setSubNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="1XXXXXXXXX"
                        dir="ltr"
                        className="text-right h-10 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sub-email" className="text-xs">البريد الإلكتروني</Label>
                      <Input
                        id="sub-email"
                        type="email"
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        placeholder="example@mail.com"
                        dir="ltr"
                        className="text-right h-10 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sub-pass" className="text-xs">كلمة المرور (6 أحرف فأكثر)</Label>
                      <Input
                        id="sub-pass"
                        type="password"
                        value={subPassword}
                        onChange={(e) => setSubPassword(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="h-10 rounded-xl"
                        minLength={6}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold"
                      disabled={loading}
                    >
                      {loading ? "جارٍ إنشاء الحساب..." : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          إنشاء حساب اشتراك
                        </span>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
