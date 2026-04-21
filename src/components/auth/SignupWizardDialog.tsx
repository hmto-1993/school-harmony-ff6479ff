import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, ArrowLeft, ArrowRight, Shield, Crown, CheckCircle2, Sparkles, Activity, Eye } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tier = "basic" | "premium";

const BASIC_FEATURES = [
  "إدارة الطلاب والفصول",
  "النماذج والخطابات الإدارية",
  "الرادار التقليدي لرصد الدرجات",
  "رصد الحضور والسلوك",
  "تقارير PDF أساسية",
];

const PREMIUM_FEATURES = [
  { icon: Sparkles, text: "الرادار الذكي بالمؤثرات والصوتيات" },
  { icon: Sparkles, text: "مساعد الذكاء الاصطناعي للصياغة" },
  { icon: Activity, text: "التقارير المتقدمة والتحليلات" },
  { icon: Eye, text: "سجل الزيارات ومركز المراقبة" },
  { icon: CheckCircle2, text: "كل ميزات الباقة الأساسية + المزيد" },
];

export default function SignupWizardDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 selection
  const [tier, setTier] = useState<Tier>("basic");

  const reset = () => {
    setStep(1);
    setFullName(""); setPhone(""); setSchool(""); setSpecialty("");
    setNationalId(""); setEmail(""); setPassword(""); setTier("basic");
  };

  const isStrongPassword = (pw: string) => {
    const hasLetter = /[A-Za-z\u0600-\u06FF]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9\u0600-\u06FF\s]/.test(pw);
    return hasLetter && hasNumber && hasSymbol;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = nationalId.replace(/\D/g, "");
    if (!fullName.trim() || !phone.trim() || !school.trim() || !specialty.trim() ||
        cleanId.length !== 10 || !email.trim() || !password) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تعبئة كافة الحقول. رقم الهوية يجب أن يكون 10 أرقام.",
        variant: "destructive",
      });
      return;
    }
    if (!isStrongPassword(password)) {
      toast({
        title: "كلمة المرور ضعيفة",
        description: "يجب أن تحتوي كلمة المرور على مزيج من الحروف والأرقام والرموز (مثال: Ahmed@2026!).",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    setLoading(true);
    const cleanId = nationalId.replace(/\D/g, "");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName.trim(),
          national_id: cleanId,
          phone: phone.trim(),
          school: school.trim(),
          specialty: specialty.trim(),
          requested_tier: tier,
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

    const tierName = tier === "premium" ? "باقة ألفا المتكاملة (Premium)" : "باقة ألفا الأساسية";
    toast({
      title: "شكراً لتسجيلك في ألفا فيزياء 🎓",
      description: `تم استلام طلبك للانضمام إلى ${tierName}. يرجى التواصل مع الإدارة لإتمام الاشتراك وتفعيل حسابك.`,
      duration: 11000,
    });
    if (data?.user && !data.session) {
      toast({
        title: "تأكيد البريد الإلكتروني",
        description: "تم إرسال رابط التفعيل إلى بريدك. فعّله ثم انتظر موافقة الإدارة.",
        duration: 9000,
      });
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === 1 ? "إنشاء اشتراك جديد" : "اختر خطة العمل المناسبة لك في ألفا فيزياء"}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الخطوة {step} من 2</span>
            <span>{step === 1 ? "البيانات الأساسية" : "اختيار الباقة"}</span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1.5" />
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sw-name" className="text-xs">الاسم الكريم *</Label>
                <Input id="sw-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="أ. محمد بن عبدالله" className="h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-phone" className="text-xs">رقم الجوال *</Label>
                <Input id="sw-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="05XXXXXXXX" inputMode="numeric" dir="ltr" className="text-right h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-id" className="text-xs">رقم الهوية *</Label>
                <Input id="sw-id" value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="1XXXXXXXXX" inputMode="numeric" dir="ltr" className="text-right h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-school" className="text-xs">المدرسة *</Label>
                <Input id="sw-school" value={school} onChange={(e) => setSchool(e.target.value)}
                  placeholder="اسم المدرسة" className="h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-spec" className="text-xs">التخصص *</Label>
                <Input id="sw-spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="فيزياء، كيمياء..." className="h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-email" className="text-xs">البريد الإلكتروني *</Label>
                <Input id="sw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com" dir="ltr" className="text-right h-10 rounded-xl" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sw-pass" className="text-xs">كلمة المرور (6+) *</Label>
                <Input id="sw-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" dir="ltr" className="h-10 rounded-xl" minLength={6} required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-semibold">
              <span className="flex items-center gap-2">
                التالي: اختيار الباقة
                <ArrowLeft className="h-4 w-4" />
              </span>
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Basic */}
              <button
                type="button"
                onClick={() => setTier("basic")}
                className={`relative text-right rounded-2xl p-4 border-2 transition-all ${
                  tier === "basic"
                    ? "border-slate-400 bg-slate-50 dark:bg-slate-900/40 shadow-[0_0_20px_-5px_hsl(var(--muted-foreground)/0.5)]"
                    : "border-border bg-card hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-slate-500" />
                  <span className="font-bold text-foreground">الأساسية</span>
                  {tier === "basic" && <CheckCircle2 className="h-4 w-4 text-primary mr-auto" />}
                </div>
                <p className="text-[11px] text-muted-foreground mb-1">الأدوات الجوهرية للتدريس</p>
                <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-2">💳 اشتراك مدفوع — يفعّل بعد الدفع</p>
                <ul className="space-y-1 text-[11px] text-foreground/80">
                  {BASIC_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>

              {/* Premium */}
              <button
                type="button"
                onClick={() => setTier("premium")}
                className={`relative text-right rounded-2xl p-4 border-2 transition-all ${
                  tier === "premium"
                    ? "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 shadow-[0_0_25px_-5px_rgb(251_191_36/0.6)]"
                    : "border-border bg-card hover:border-amber-300"
                }`}
              >
                <div className="absolute -top-2 left-3 text-[9px] font-bold bg-gradient-to-l from-amber-500 to-yellow-500 text-white px-2 py-0.5 rounded-full">
                  الأكثر طلباً
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <span className="font-bold text-foreground">المتكاملة</span>
                  {tier === "premium" && <CheckCircle2 className="h-4 w-4 text-amber-500 mr-auto" />}
                </div>
                <p className="text-[11px] text-muted-foreground mb-1">التجربة الاحترافية الكاملة</p>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-2">👑 اشتراك مميّز — يفعّل بعد الدفع</p>
                <ul className="space-y-1 text-[11px] text-foreground/80">
                  {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-1">
                      <Icon className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </button>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-[11px] text-foreground/85 text-center leading-relaxed">
              ⚠️ <strong>كلا الباقتين تتطلبان اشتراكاً مدفوعاً</strong> وتفعيلاً يدوياً من إدارة المنصة.
              <br />
              بعد إتمام التسجيل، تواصل مع الإدارة لإتمام الدفع وتفعيل حسابك.
            </div>

            <div className="flex gap-2">
              <Button
                type="button" variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 h-11 rounded-xl"
              >
                <ArrowRight className="h-4 w-4 ml-1" />
                رجوع
              </Button>
              <Button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="flex-[2] h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-semibold"
              >
                {loading ? "جارٍ الإنشاء..." : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    إنهاء التسجيل
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
