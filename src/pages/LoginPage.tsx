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
import schoolLogo from "@/assets/school-logo.jpg";
import loginBg from "@/assets/login-bg.jpg";
import { GraduationCap, Shield, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [studentNationalId, setStudentNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("ثانوية الفيصلية");
  const [schoolSubtitle, setSchoolSubtitle] = useState("نظام إدارة المدرسة");
  const { signIn, signInStudent, user, isStudent } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("site_settings").select("id, value").then(({ data }) => {
      data?.forEach((row) => {
        if (row.id === "school_name") setSchoolName(row.value);
        if (row.id === "school_subtitle") setSchoolSubtitle(row.value);
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
    if (!studentNationalId.trim()) return;

    setLoading(true);
    const { error } = await signInStudent(studentNationalId);
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

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})`, filter: "blur(6px) brightness(0.55)" }}
      />
      {/* Overlay gradient — darker in dark mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 dark:from-black/50 dark:via-black/30 dark:to-black/40" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Card className="glass border-border/30 shadow-2xl dark:bg-card/85 dark:border-border/20 dark:shadow-black/40">
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
              <TabsList className="grid w-full grid-cols-2 mb-5 h-11 rounded-xl bg-muted/80 dark:bg-muted/40">
                <TabsTrigger value="staff" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                  <Shield className="h-4 w-4" />
                  معلم / مدير
                </TabsTrigger>
                <TabsTrigger value="student" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                  <GraduationCap className="h-4 w-4" />
                  طالب
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
