import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Atom, FlaskConical, Plus, Trash2, MessageSquare, Star, Users, Loader2, Hourglass, Rocket, Clock, XCircle, Sparkles, EyeOff, Crown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BetaFeatureRow {
  id: string;
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  is_globally_enabled: boolean;
  is_officially_released?: boolean;
  owner_first_enabled_at?: string | null;
  snooze_until?: string | null;
  released_at?: string | null;
  required_tier?: "basic" | "premium";
}

interface SmartAlert {
  feature: BetaFeatureRow;
  daysElapsed: number;
}

interface SubscriberRow { user_id: string; full_name: string; }

interface FeedbackRow {
  id: string;
  rating: number;
  message: string;
  created_at: string;
  user_id: string;
  feature_id: string;
}

export default function AlphaLabOwnerCard() {
  const [features, setFeatures] = useState<BetaFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Set<string>>>({}); // featureId -> userIds
  const [openManageId, setOpenManageId] = useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = useState<string | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [isSuperOwner, setIsSuperOwner] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("national_id").eq("user_id", u.user.id).maybeSingle();
      setIsSuperOwner(prof?.national_id === "1098080268");
    })();
  }, []);

  const smartAlerts: SmartAlert[] = features
    .filter(f => {
      if (f.is_officially_released || f.is_globally_enabled) return false;
      if (!f.owner_first_enabled_at) return false;
      if (f.snooze_until && new Date(f.snooze_until) > new Date()) return false;
      const days = (Date.now() - new Date(f.owner_first_enabled_at).getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    })
    .map(f => ({
      feature: f,
      daysElapsed: Math.floor((Date.now() - new Date(f.owner_first_enabled_at!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const handleReleaseGlobal = async (id: string) => {
    if (!confirm("إطلاق هذه الميزة رسمياً لجميع المشتركين؟ لا يمكن التراجع تلقائياً.")) return;
    setActingId(id);
    const { error } = await supabase.rpc("release_beta_feature_globally", { _feature_id: id });
    setActingId(null);
    if (error) { toast({ title: "تعذر الإطلاق", description: error.message, variant: "destructive" }); return; }
    toast({ title: "🚀 تم الإطلاق الرسمي", description: "الميزة الآن متاحة لجميع المشتركين" });
    load();
  };

  const handleSnooze = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.rpc("snooze_beta_feature", { _feature_id: id, _days: 3 });
    setActingId(null);
    if (error) { toast({ title: "تعذر التأجيل", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم تمديد التجربة", description: "تم تأجيل التنبيه 3 أيام إضافية" });
    load();
  };

  const handleHideFromSubscribers = async (id: string) => {
    if (!confirm("إيقاف هذه الميزة عن المشتركين مع إبقائها مفعّلة في حسابك للتجربة؟")) return;
    setActingId(id);
    const { error } = await supabase.rpc("hide_beta_from_subscribers", { _feature_id: id });
    setActingId(null);
    if (error) { toast({ title: "تعذر الإخفاء", description: error.message, variant: "destructive" }); return; }
    toast({ title: "🔒 تم الإخفاء عن المشتركين", description: "الميزة لا تزال مفعّلة في حسابك" });
    load();
  };

  const handleCancelFeature = async (id: string) => {
    if (!confirm("إلغاء/تعطيل هذه الميزة تماماً؟")) return;
    setActingId(id);
    const { error } = await supabase.from("beta_features").update({ is_globally_enabled: false }).eq("id", id);
    if (!error) {
      await supabase.from("beta_feature_enrollments").delete().eq("feature_id", id);
    }
    setActingId(null);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم تعطيل الميزة", description: "تمت إزالة الوصول من جميع المشتركين" });
    load();
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: feats }, { data: subs }, { data: enrolls }] = await Promise.all([
        supabase.from("beta_features").select("*").order("created_at", { ascending: true }),
        supabase.from("profiles").select("user_id, full_name").eq("role", "owner"),
        supabase.from("beta_feature_enrollments").select("feature_id, user_id, enabled"),
      ]);
      // Lab-First: hide officially released features (they became "native" part of the system)
      setFeatures(((feats ?? []) as BetaFeatureRow[]).filter(f => !f.is_officially_released));
      const subList = (subs ?? []) as SubscriberRow[];
      setSubscribers(subList);
      setNameMap(Object.fromEntries(subList.map(s => [s.user_id, s.full_name])));
      const map: Record<string, Set<string>> = {};
      (enrolls ?? []).forEach((e: any) => {
        if (!e.enabled) return;
        if (!map[e.feature_id]) map[e.feature_id] = new Set();
        map[e.feature_id].add(e.user_id);
      });
      setEnrollments(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key || !newName.trim()) {
      toast({ title: "أكمل الحقول", description: "المفتاح والاسم مطلوبان", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("beta_features").insert({
      feature_key: key, name: newName.trim(), description: newDesc.trim(), icon: "Atom",
    });
    setCreating(false);
    if (error) { toast({ title: "تعذر الإنشاء", description: error.message, variant: "destructive" }); return; }
    setNewKey(""); setNewName(""); setNewDesc("");
    toast({ title: "تمت الإضافة", description: "تم إضافة ميزة تجريبية جديدة" });
    load();
  };

  const toggleGlobal = async (f: BetaFeatureRow, val: boolean) => {
    const { error } = await supabase
      .from("beta_features").update({ is_globally_enabled: val }).eq("id", f.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, is_globally_enabled: val } : x));
    toast({ title: val ? "تم التفعيل لجميع المشتركين" : "تم الإيقاف العام" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الميزة التجريبية نهائياً؟")) return;
    const { error } = await supabase.from("beta_features").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    setFeatures(prev => prev.filter(f => f.id !== id));
    toast({ title: "تم الحذف" });
  };

  const toggleTier = async (f: BetaFeatureRow) => {
    const next = (f.required_tier === "premium" ? "basic" : "premium") as "basic" | "premium";
    const { error } = await supabase.from("beta_features").update({ required_tier: next } as any).eq("id", f.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, required_tier: next } : x));
    toast({
      title: next === "premium" ? "الميزة الآن حصرية للبريميوم" : "الميزة متاحة للجميع",
      description: next === "premium" ? "لن يتمكن مشتركو الباقة الأساسية من رؤيتها" : "متاحة لجميع المشتركين بكافة الباقات",
    });
  };

  const toggleEnrollment = async (featureId: string, userId: string, enable: boolean) => {
    if (enable) {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("beta_feature_enrollments")
        .upsert({ feature_id: featureId, user_id: userId, enabled: true, enrolled_by: u.user?.id }, { onConflict: "feature_id,user_id" });
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase
        .from("beta_feature_enrollments")
        .delete().eq("feature_id", featureId).eq("user_id", userId);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    setEnrollments(prev => {
      const next = { ...prev };
      const set = new Set(next[featureId] ?? []);
      if (enable) set.add(userId); else set.delete(userId);
      next[featureId] = set;
      return next;
    });
  };

  const openFeedback = async (featureId: string) => {
    setOpenFeedbackId(featureId);
    const { data } = await supabase
      .from("beta_feature_feedback")
      .select("*").eq("feature_id", featureId)
      .order("created_at", { ascending: false });
    setFeedbackList((data ?? []) as FeedbackRow[]);
  };

  return (
    <Card className="border-2 border-violet-500/30 shadow-xl bg-gradient-to-br from-violet-500/5 via-card to-fuchsia-500/5 animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold bg-gradient-to-l from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              مختبر ألفا | Alpha Lab
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              هنا نصنع مستقبل ألفا فيزياء.. جرب الميزات الجديدة وشاركنا في تطويرها 🧪
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Lab-First Policy banner */}
        <div className="rounded-xl border border-violet-500/40 bg-gradient-to-l from-violet-500/10 to-fuchsia-500/10 p-3 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-foreground/90">
            <strong className="text-violet-700 dark:text-violet-300">سياسة Lab-First:</strong> كل ميزة جديدة تُسجَّل هنا تلقائياً وتظهر لك (المالك) فقط. بعد تجربتها واعتمادها، تُطلق للجميع وتختفي من المختبر لتصبح جزءاً أصيلاً من النظام. الإصلاحات العاجلة فقط تُطبق مباشرة بدون تجربة.
          </div>
        </div>

        {/* Add new feature */}
        <div className="rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2"><Plus className="h-4 w-4 text-violet-600" />إضافة ميزة تجريبية</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">المفتاح البرمجي (key)</Label>
              <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="example: smart_radar_v2" dir="ltr" className="text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">اسم الميزة</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: الرادار الذكي v2" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">وصف مختصر</Label>
            <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="ماذا تقدم هذه الميزة..." rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة الميزة
          </Button>
        </div>

        {/* Smart rollout alerts (7+ days) */}
        {isSuperOwner && smartAlerts.length > 0 && (
          <div className="space-y-3">
            {smartAlerts.map(({ feature, daysElapsed }) => (
              <div
                key={feature.id}
                className="relative rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/40 p-4 shadow-[0_0_25px_rgba(251,191,36,0.35)] animate-fade-in overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0 animate-pulse">
                    <Hourglass className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <h5 className="text-sm font-bold text-amber-900 dark:text-amber-100">اقتراح ذكي من النظام</h5>
                      <Badge className="bg-amber-500 text-white border-0 text-[10px]">{daysElapsed} يوم</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-50">
                      لقد أمضيت <strong>{daysElapsed} أيام</strong> في تجربة <strong>«{feature.name}»</strong> بنجاح.
                      هل لاحظت أي مشاكل تقنية؟ إذا كان كل شيء يعمل بدقة، يمكنك إطلاقها لجميع المشتركين الآن.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleReleaseGlobal(feature.id)}
                        disabled={actingId === feature.id}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white gap-1.5 shadow-md"
                      >
                        {actingId === feature.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                        إطلاق للجميع
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSnooze(feature.id)}
                        disabled={actingId === feature.id}
                        className="gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        تمديد التجربة (3 أيام)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelFeature(feature.id)}
                        disabled={actingId === feature.id}
                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        إلغاء الميزة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Features list */}
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : features.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Atom className="h-12 w-12 mx-auto mb-3 text-violet-500/40" />
            لا توجد ميزات تجريبية بعد.
          </div>
        ) : (
          <div className="space-y-3">
            {features.map(f => {
              const count = enrollments[f.id]?.size ?? 0;
              return (
                <div key={f.id} className="rounded-xl border-2 border-border/50 bg-card p-4 space-y-3 hover:border-violet-500/40 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <Atom className="h-5 w-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm">{f.name}</h5>
                          <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600">Beta</Badge>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{f.feature_key}</code>
                        </div>
                        {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="h-8 w-8 text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                      <Switch checked={f.is_globally_enabled} onCheckedChange={(v) => toggleGlobal(f, v)} />
                      <span className="text-xs font-medium">تفعيل لجميع المشتركين</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setOpenManageId(f.id)} className="gap-1.5 text-xs">
                      <Users className="h-3.5 w-3.5" /> تخصيص ({count})
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openFeedback(f.id)} className="gap-1.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" /> الملاحظات
                    </Button>
                    {f.is_globally_enabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHideFromSubscribers(f.id)}
                        disabled={actingId === f.id}
                        className="gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      >
                        {actingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                        إخفاء عن المشتركين
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Manage subscribers dialog */}
      <Dialog open={!!openManageId} onOpenChange={(o) => !o && setOpenManageId(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تخصيص المشتركين للميزة</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {subscribers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مشتركون</p>}
              {subscribers.map(s => {
                const enabled = openManageId ? (enrollments[openManageId]?.has(s.user_id) ?? false) : false;
                return (
                  <div key={s.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{s.full_name}</span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => openManageId && toggleEnrollment(openManageId, s.user_id, v)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenManageId(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={!!openFeedbackId} onOpenChange={(o) => !o && setOpenFeedbackId(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />ملاحظات المشتركين</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {feedbackList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد ملاحظات بعد</p>}
              {feedbackList.map(fb => (
                <div key={fb.id} className="rounded-lg border border-border/60 p-3 space-y-1.5 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{nameMap[fb.user_id] ?? "مشترك"}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < fb.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {fb.message && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fb.message}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(fb.created_at).toLocaleString("ar-SA")}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFeedbackId(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
