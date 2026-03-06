import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Smartphone, Monitor, ArrowLeft, Share, Plus, MoreVertical, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import installIos from "@/assets/install-ios.png";
import installAndroid from "@/assets/install-android.png";
import installDesktop from "@/assets/install-desktop.png";
import schoolLogo from "@/assets/school-logo.jpg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Try to capture the install prompt
  useState(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  });

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const defaultTab = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={schoolLogo} alt="شعار المدرسة" className="h-14 w-14 rounded-xl object-contain shadow-md" />
            <div>
              <h1 className="text-lg font-bold text-foreground">تثبيت التطبيق</h1>
              <p className="text-xs text-muted-foreground">Alpha Physics</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        {/* Hero */}
        {isStandalone ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5">
            <CardContent className="flex flex-col items-center text-center py-8 px-6">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-lg mb-4">
                <Download className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">التطبيق مثبّت بالفعل! ✅</h2>
              <p className="text-muted-foreground">أنت تستخدم التطبيق حالياً في وضع التطبيق المثبّت.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-card to-primary/5">
            <CardContent className="flex flex-col items-center text-center py-8 px-6">
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-4 shadow-lg shadow-primary/25 mb-4">
                <Download className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">ثبّت التطبيق على جهازك</h2>
              <p className="text-muted-foreground mb-4">
                احصل على تجربة أسرع وإشعارات فورية بتثبيت التطبيق مباشرة على شاشتك الرئيسية
              </p>
              {deferredPrompt && (
                <Button onClick={handleInstall} size="lg" className="gap-2 rounded-xl shadow-md">
                  <Download className="h-5 w-5" />
                  تثبيت التطبيق الآن
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "⚡", label: "سرعة فائقة" },
            { icon: "🔔", label: "إشعارات فورية" },
            { icon: "📱", label: "يعمل بدون إنترنت" },
          ].map((f) => (
            <Card key={f.label} className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center text-center p-4">
                <span className="text-2xl mb-1">{f.icon}</span>
                <span className="text-xs font-medium text-foreground">{f.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Instructions */}
        {!isStandalone && (
          <Tabs defaultValue={defaultTab} dir="rtl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ios" className="gap-1.5 text-xs">
                <Smartphone className="h-3.5 w-3.5" />
                iPhone / iPad
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-1.5 text-xs">
                <Smartphone className="h-3.5 w-3.5" />
                Android
              </TabsTrigger>
              <TabsTrigger value="desktop" className="gap-1.5 text-xs">
                <Monitor className="h-3.5 w-3.5" />
                الكمبيوتر
              </TabsTrigger>
            </TabsList>

            {/* iOS */}
            <TabsContent value="ios" className="space-y-4 mt-4">
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex justify-center">
                    <img src={installIos} alt="تثبيت على iOS" className="max-h-48 object-contain rounded-xl" />
                  </div>
                  <div className="space-y-4">
                    <Step number={1} title="افتح التطبيق في Safari">
                      <p className="text-sm text-muted-foreground">
                        تأكد من فتح الرابط في متصفح <Badge variant="secondary" className="text-xs mx-1">Safari</Badge> وليس متصفح آخر
                      </p>
                    </Step>
                    <Step number={2} title="اضغط على زر المشاركة">
                      <p className="text-sm text-muted-foreground">
                        اضغط على أيقونة المشاركة <Share className="inline h-4 w-4 mx-1 text-primary" /> في شريط الأدوات السفلي
                      </p>
                    </Step>
                    <Step number={3} title='اختر "إضافة إلى الشاشة الرئيسية"'>
                      <p className="text-sm text-muted-foreground">
                        مرر للأسفل واضغط على <Badge variant="outline" className="text-xs mx-1 gap-1"><Plus className="h-3 w-3" /> إضافة إلى الشاشة الرئيسية</Badge>
                      </p>
                    </Step>
                    <Step number={4} title='اضغط "إضافة"'>
                      <p className="text-sm text-muted-foreground">
                        أكّد بالضغط على "إضافة" في الزاوية العلوية. سيظهر التطبيق على شاشتك الرئيسية!
                      </p>
                    </Step>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Android */}
            <TabsContent value="android" className="space-y-4 mt-4">
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex justify-center">
                    <img src={installAndroid} alt="تثبيت على Android" className="max-h-48 object-contain rounded-xl" />
                  </div>
                  <div className="space-y-4">
                    <Step number={1} title="افتح التطبيق في Chrome">
                      <p className="text-sm text-muted-foreground">
                        افتح الرابط في متصفح <Badge variant="secondary" className="text-xs mx-1">Chrome</Badge>
                      </p>
                    </Step>
                    <Step number={2} title="ابحث عن شريط التثبيت">
                      <p className="text-sm text-muted-foreground">
                        إذا ظهر شريط "تثبيت التطبيق" في الأسفل، اضغط عليه مباشرة. أو اضغط على قائمة <MoreVertical className="inline h-4 w-4 mx-1 text-primary" /> في الأعلى
                      </p>
                    </Step>
                    <Step number={3} title='اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"'>
                      <p className="text-sm text-muted-foreground">
                        ابحث عن خيار <Badge variant="outline" className="text-xs mx-1 gap-1"><Download className="h-3 w-3" /> تثبيت التطبيق</Badge> في القائمة
                      </p>
                    </Step>
                    <Step number={4} title='اضغط "تثبيت"'>
                      <p className="text-sm text-muted-foreground">
                        أكّد التثبيت. سيظهر التطبيق في شاشتك الرئيسية ودرج التطبيقات!
                      </p>
                    </Step>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desktop */}
            <TabsContent value="desktop" className="space-y-4 mt-4">
              <Card className="shadow-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex justify-center">
                    <img src={installDesktop} alt="تثبيت على الكمبيوتر" className="max-h-48 object-contain rounded-xl" />
                  </div>
                  <div className="space-y-4">
                    <Step number={1} title="افتح التطبيق في Chrome أو Edge">
                      <p className="text-sm text-muted-foreground">
                        استخدم متصفح <Badge variant="secondary" className="text-xs mx-1">Chrome</Badge> أو <Badge variant="secondary" className="text-xs mx-1">Edge</Badge>
                      </p>
                    </Step>
                    <Step number={2} title="ابحث عن أيقونة التثبيت">
                      <p className="text-sm text-muted-foreground">
                        ستجد أيقونة <Download className="inline h-4 w-4 mx-1 text-primary" /> في شريط العنوان (بجانب رابط الموقع)
                      </p>
                    </Step>
                    <Step number={3} title='اضغط "تثبيت"'>
                      <p className="text-sm text-muted-foreground">
                        أكّد التثبيت في النافذة المنبثقة. سيفتح التطبيق في نافذة مستقلة!
                      </p>
                    </Step>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          التطبيق مجاني ولا يحتاج متجر تطبيقات. يعمل مباشرة من المتصفح.
        </p>
      </main>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
        {children}
      </div>
    </div>
  );
}
