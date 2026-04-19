import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePlatformFeatures, type PlatformFeature } from "@/hooks/usePlatformFeatures";
import { Crown, Shield, ArrowLeftRight, Plus, Loader2, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Icon className={className} />;
}

function FeatureRow({ feature, onMove, busy }: {
  feature: PlatformFeature;
  onMove: (f: PlatformFeature) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 p-2.5 hover:bg-muted/40 transition-colors">
      <div className={cn(
        "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
        feature.required_tier === "premium"
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      )}>
        <FeatureIcon name={feature.icon} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{feature.name}</div>
        {feature.description && (
          <div className="text-[11px] text-muted-foreground truncate">{feature.description}</div>
        )}
      </div>
      <Button
        size="sm" variant="ghost"
        disabled={busy}
        onClick={() => onMove(feature)}
        className="h-7 w-7 p-0 shrink-0"
        title={feature.required_tier === "premium" ? "نقل إلى الأساسية" : "نقل إلى بريميوم"}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function PackageManagementPanel() {
  const { features, loading } = usePlatformFeatures();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const basic = useMemo(() => features.filter((f) => f.required_tier === "basic"), [features]);
  const premium = useMemo(() => features.filter((f) => f.required_tier === "premium"), [features]);

  const moveFeature = async (f: PlatformFeature) => {
    const newTier = f.required_tier === "premium" ? "basic" : "premium";
    setBusyId(f.id);
    const { error } = await supabase.rpc("set_platform_feature_tier", {
      _feature_id: f.id, _tier: newTier,
    });
    setBusyId(null);
    if (error) {
      toast({ title: "تعذر تغيير تصنيف الميزة", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: newTier === "premium" ? "تم نقل الميزة إلى بريميوم 👑" : "تم نقل الميزة إلى الأساسية ✨",
      description: `${f.name} متاحة الآن ${newTier === "premium" ? "لمشتركي بريميوم فقط" : "لجميع المعلمين"}`,
    });
  };

  if (loading) {
    return (
      <Card><CardContent className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20" dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            إدارة الباقات والاشتراكات
          </CardTitle>
          <AddFeatureDialog open={addOpen} onOpenChange={setAddOpen} nextSortOrder={features.length + 1} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          صنّف ميزات المنصة بين الباقتين. أي تغيير ينعكس فوراً على صلاحيات جميع المستخدمين.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BASIC CARD - Silver Neon */}
          <div className="relative rounded-2xl p-[2px] bg-gradient-to-br from-slate-300 via-slate-400 to-slate-200 dark:from-slate-500 dark:via-slate-300 dark:to-slate-500 shadow-[0_0_25px_-5px_rgba(148,163,184,0.5)]">
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-400 flex items-center justify-center shadow">
                    <Shield className="h-5 w-5 text-slate-700 dark:text-slate-100" />
                  </div>
                  <div>
                    <div className="font-bold text-base">الباقة الأساسية</div>
                    <div className="text-[11px] text-muted-foreground">متاحة لجميع المعلمين</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-slate-500/10 border-slate-400/40">{basic.length}</Badge>
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {basic.length === 0
                  ? <div className="text-center text-xs text-muted-foreground py-6">لا توجد ميزات في هذه الباقة</div>
                  : basic.map((f) => <FeatureRow key={f.id} feature={f} onMove={moveFeature} busy={busyId === f.id} />)
                }
              </div>
            </div>
          </div>

          {/* PREMIUM CARD - Gold Neon */}
          <div className="relative rounded-2xl p-[2px] bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-300 shadow-[0_0_30px_-5px_rgba(245,158,11,0.6)]">
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-base bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">الباقة المتكاملة</div>
                    <div className="text-[11px] text-muted-foreground">حصرية لمشتركي بريميوم</div>
                  </div>
                </div>
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-amber-600">{premium.length}</Badge>
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {premium.length === 0
                  ? <div className="text-center text-xs text-muted-foreground py-6">لا توجد ميزات في هذه الباقة</div>
                  : premium.map((f) => <FeatureRow key={f.id} feature={f} onMove={moveFeature} busy={busyId === f.id} />)
                }
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong>الميزات في "الأساسية"</strong> تظهر لجميع المعلمين. أما <strong>ميزات "بريميوم"</strong> تظهر للمشتركين العاديين مع أيقونة قفل ونافذة ترقية.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddFeatureDialog({ open, onOpenChange, nextSortOrder }: {
  open: boolean; onOpenChange: (v: boolean) => void; nextSortOrder: number;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    feature_key: "", name: "", description: "", icon: "Sparkles",
    category: "general", required_tier: "basic" as "basic" | "premium",
  });

  const reset = () => setForm({ feature_key: "", name: "", description: "", icon: "Sparkles", category: "general", required_tier: "basic" });

  const submit = async () => {
    if (!form.feature_key.trim() || !form.name.trim()) {
      toast({ title: "بيانات ناقصة", description: "المفتاح والاسم مطلوبان", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("platform_features").insert({
      feature_key: form.feature_key.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim() || "Sparkles",
      category: form.category.trim() || "general",
      required_tier: form.required_tier,
      sort_order: nextSortOrder,
    });
    setBusy(false);
    if (error) {
      toast({ title: "تعذر إضافة الميزة", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تمت إضافة الميزة بنجاح ✨" });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة ميزة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة ميزة جديدة للباقة</DialogTitle>
          <DialogDescription>سجّل ميزة طوّرتها حديثاً وحدّد الباقة المناسبة لها.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">المفتاح (إنجليزي)</Label>
              <Input value={form.feature_key} onChange={(e) => setForm({ ...form, feature_key: e.target.value })} placeholder="ai_grading" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الأيقونة (Lucide)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Sparkles" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">اسم الميزة</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="تصحيح الاختبارات بالذكاء الاصطناعي" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الباقة</Label>
              <Select value={form.required_tier} onValueChange={(v) => setForm({ ...form, required_tier: v as "basic" | "premium" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">أساسية</SelectItem>
                  <SelectItem value="premium">بريميوم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التصنيف</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>إلغاء</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ الميزة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
