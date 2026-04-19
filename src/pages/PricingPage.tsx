import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Shield, Check, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlatformFeatures, type PlatformFeature } from "@/hooks/usePlatformFeatures";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { cn } from "@/lib/utils";

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Icon className={className} />;
}

function FeatureItem({ f, premium }: { f: PlatformFeature; premium?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <div className={cn(
        "shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5",
        premium ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-sky-500/20 text-sky-600 dark:text-sky-400",
      )}>
        <Check className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <FeatureIcon name={f.icon} className="h-3.5 w-3.5 opacity-70" />
          {f.name}
        </div>
        {f.description && <div className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</div>}
      </div>
    </li>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { features, loading } = usePlatformFeatures();
  const { tier, isPremium } = useSubscriptionTier();

  const basic = useMemo(() => features.filter((f) => f.required_tier === "basic"), [features]);
  const premium = useMemo(() => features.filter((f) => f.required_tier === "premium"), [features]);

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4" dir="rtl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" /> رجوع
      </Button>

      <div className="text-center mb-8">
        <Badge variant="outline" className="mb-3 gap-1">
          <Sparkles className="h-3 w-3" /> باقات منصة ألفا
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">اختر الباقة المناسبة لك</h1>
        <p className="text-muted-foreground text-sm">باقتك الحالية: <strong>{isPremium ? "بريميوم 👑" : "أساسية"}</strong></p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">جارٍ تحميل الباقات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BASIC */}
          <div className={cn(
            "relative rounded-3xl p-[2px] bg-gradient-to-br from-slate-300 via-slate-400 to-slate-200 dark:from-slate-500 dark:via-slate-300 dark:to-slate-500 shadow-[0_0_30px_-8px_rgba(148,163,184,0.5)]",
            !isPremium && "ring-2 ring-sky-500/40 ring-offset-2 ring-offset-background",
          )}>
            <Card className="rounded-3xl border-0 h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-400 flex items-center justify-center shadow">
                    <Shield className="h-6 w-6 text-slate-700 dark:text-slate-100" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">الباقة الأساسية</div>
                    <div className="text-xs text-muted-foreground">جميع الأدوات الجوهرية للتدريس</div>
                  </div>
                  {!isPremium && <Badge className="mr-auto bg-sky-500 hover:bg-sky-500">باقتك الحالية</Badge>}
                </div>
                <div className="my-4 pb-4 border-b border-border/60">
                  <div className="text-3xl font-extrabold">اشتراك مدفوع</div>
                  <div className="text-xs text-muted-foreground mt-1">يفعّل يدوياً بعد إتمام الدفع</div>
                </div>
                <ul className="space-y-0.5">
                  {basic.map((f) => <FeatureItem key={f.id} f={f} />)}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* PREMIUM */}
          <div className={cn(
            "relative rounded-3xl p-[2px] bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-300 shadow-[0_0_40px_-5px_rgba(245,158,11,0.6)]",
            isPremium && "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background",
          )}>
            <Card className="rounded-3xl border-0 h-full bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
              <CardContent className="p-6">
                <div className="absolute -top-3 right-6">
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-700 shadow-md">⭐ الأكثر تميزاً</Badge>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">الباقة المتكاملة</div>
                    <div className="text-xs text-muted-foreground">كل الميزات + الأدوات المتقدمة</div>
                  </div>
                  {isPremium && <Badge className="mr-auto bg-amber-500 hover:bg-amber-500 text-white">باقتك الحالية 👑</Badge>}
                </div>
                <div className="my-4 pb-4 border-b border-amber-500/20">
                  <div className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">بريميوم</div>
                  <div className="text-xs text-muted-foreground mt-1">تواصل مع الإدارة للترقية</div>
                </div>
                <ul className="space-y-0.5">
                  {[...basic, ...premium].map((f) => (
                    <FeatureItem key={f.id} f={f} premium={f.required_tier === "premium"} />
                  ))}
                </ul>
                {!isPremium && (
                  <Button className="w-full mt-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2">
                    <Crown className="h-4 w-4" /> طلب الترقية إلى بريميوم
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
