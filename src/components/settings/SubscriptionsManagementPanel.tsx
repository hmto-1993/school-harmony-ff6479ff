import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Crown, Loader2, CalendarClock, Pencil, Trash2, Inbox, Infinity as InfinityIcon, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "basic" | "premium";

type Subscriber = {
  id: string;
  user_id: string;
  full_name: string;
  national_id: string | null;
  phone: string | null;
  subscription_plan: string;
  subscription_start: string | null;
  subscription_end: string | null;
  tier?: Tier;
};

const PLAN_LABELS: Record<string, { label: string; cls: string }> = {
  basic: { label: "أساسية", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  premium: { label: "متقدمة", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  trial: { label: "تجريبية", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function getCountdown(endDate: string | null): { text: string; tone: "ok" | "warn" | "danger" | "expired" | "infinite" } {
  if (!endDate) return { text: "بدون انتهاء", tone: "infinite" };
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return { text: "منتهٍ", tone: "expired" };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return { text: "ينتهي اليوم", tone: "danger" };
  if (days < 3) return { text: `متبقي ${days} ${days === 1 ? "يوم" : "أيام"}`, tone: "danger" };
  if (days < 7) return { text: `متبقي ${days} أيام`, tone: "warn" };
  return { text: `متبقي ${days} يوماً`, tone: "ok" };
}

const TONE_CLS: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  danger: "bg-destructive/15 text-destructive border-destructive/40 animate-pulse",
  expired: "bg-destructive/25 text-destructive border-destructive/50",
  infinite: "bg-muted text-muted-foreground border-border",
};

export default function SubscriptionsManagementPanel() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [busy, setBusy] = useState(false);

  const [editPlan, setEditPlan] = useState<string>("basic");
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");

  const [pwTarget, setPwTarget] = useState<Subscriber | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, national_id, phone, subscription_plan, subscription_start, subscription_end")
      .eq("approval_status", "approved")
      .order("subscription_end", { ascending: true, nullsFirst: false });
    if (error) {
      toast({ title: "تعذر تحميل المشتركين", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const filtered = ((data as any) || []).filter((s: Subscriber) => s.national_id !== "1098080268");
    // Hydrate tiers in parallel
    const withTiers = await Promise.all(
      filtered.map(async (s: Subscriber) => {
        const { data: t } = await supabase.rpc("get_user_tier", { _user_id: s.user_id });
        return { ...s, tier: ((t as Tier) || "basic") } as Subscriber;
      }),
    );
    setItems(withTiers);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (s: Subscriber) => {
    setEditing(s);
    setEditPlan(s.subscription_plan || "basic");
    setEditStart(s.subscription_start ? s.subscription_start.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditEnd(s.subscription_end ? s.subscription_end.split("T")[0] : "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_user_subscription", {
      _target_user: editing.user_id,
      _plan: editPlan,
      _start: editStart ? new Date(editStart).toISOString() : null,
      _end: editEnd ? new Date(editEnd + "T23:59:59").toISOString() : null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "تعذر حفظ الاشتراك", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم تحديث الاشتراك", description: "أصبحت بيانات الاشتراك سارية فوراً" });
    setEditing(null);
    load();
  };

  const extendDays = (days: number) => {
    const base = editEnd ? new Date(editEnd) : new Date();
    base.setDate(base.getDate() + days);
    setEditEnd(base.toISOString().split("T")[0]);
  };

  const toggleTier = async (s: Subscriber) => {
    const newTier: Tier = s.tier === "premium" ? "basic" : "premium";
    // Optimistic update
    setItems((prev) => prev.map((it) => (it.user_id === s.user_id ? { ...it, tier: newTier } : it)));
    const { error } = await supabase.rpc("set_user_tier", { _target_user: s.user_id, _tier: newTier });
    if (error) {
      // Revert on failure
      setItems((prev) => prev.map((it) => (it.user_id === s.user_id ? { ...it, tier: s.tier } : it)));
      toast({ title: "تعذر تغيير الباقة", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: newTier === "premium" ? "تمت الترقية إلى بريميوم 👑" : "تم التحويل إلى الأساسية",
      description: `${s.full_name} أصبح الآن في باقة ${newTier === "premium" ? "بريميوم" : "أساسية"}`,
    });
  };

  const revoke = async (userId: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("revoke_subscriber", { _target_user: userId });
    setBusy(false);
    if (error) {
      toast({ title: "تعذر إلغاء الوصول", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم إلغاء وصول المشترك", description: "لن يتمكن من الدخول للمنصة بعد الآن" });
    load();
  };

  const isStrongPassword = (pw: string) =>
    /[A-Za-z\u0600-\u06FF]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9\u0600-\u06FF\s]/.test(pw);

  const changePassword = async () => {
    if (!pwTarget) return;
    if (!isStrongPassword(newPassword)) {
      toast({
        title: "كلمة مرور ضعيفة",
        description: "يجب أن تحتوي على حروف وأرقام ورموز معاً (مثال: Teacher@2026)",
        variant: "destructive",
      });
      return;
    }
    setPwBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "change_password", user_id: pwTarget.user_id, password: newPassword },
    });
    setPwBusy(false);
    if (error || (data as any)?.error) {
      toast({
        title: "تعذر تغيير كلمة المرور",
        description: (data as any)?.error || error?.message || "حدث خطأ",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "تم تغيير كلمة المرور ✅",
      description: `كلمة مرور ${pwTarget.full_name} الجديدة سارية الآن`,
    });
    setPwTarget(null);
    setNewPassword("");
    setShowPw(false);
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-5 w-5 text-amber-500" />
          إدارة اشتراكات المعلمين المعتمدين
          <Badge variant="outline" className="mr-1">{items.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          إدارة باقات الاشتراك، تواريخ الانتهاء، وإلغاء الوصول للمشتركين النشطين.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا يوجد مشتركون معتمدون حالياً</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden" dir="rtl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right font-bold">اسم المعلم</TableHead>
                  <TableHead className="text-right font-bold">نوع الباقة</TableHead>
                  <TableHead className="text-right font-bold">الخطة</TableHead>
                  <TableHead className="text-right font-bold">انتهاء الاشتراك</TableHead>
                  <TableHead className="text-right font-bold">المدة المتبقية</TableHead>
                  <TableHead className="text-right font-bold">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const cd = getCountdown(s.subscription_end);
                  const plan = PLAN_LABELS[s.subscription_plan] || PLAN_LABELS.basic;
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold">
                        <div>{s.full_name || "بدون اسم"}</div>
                        {s.national_id && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{s.national_id}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleTier(s)}
                          className={cn(
                            "gap-1 h-7 text-xs border",
                            s.tier === "premium"
                              ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-amber-500 hover:opacity-90"
                              : "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 dark:from-slate-700 dark:to-slate-600 dark:text-slate-200 border-slate-400/50",
                          )}
                          title="اضغط للتبديل بين الباقتين"
                        >
                          {s.tier === "premium" ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {s.tier === "premium" ? "بريميوم" : "أساسية"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", plan.cls)}>{plan.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(s.subscription_end)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border gap-1", TONE_CLS[cd.tone])}>
                          {cd.tone === "infinite" ? <InfinityIcon className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                          {cd.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-8 text-amber-700 dark:text-amber-300 border-amber-500/40"
                            onClick={() => { setPwTarget(s); setNewPassword(""); setShowPw(false); }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            كلمة المرور
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 h-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد إلغاء وصول المشترك</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم إنهاء اشتراك المعلم <strong>{s.full_name}</strong> فوراً وحجب وصوله للمنصة.
                                  يمكنك إعادة تفعيله لاحقاً من قائمة الطلبات المرفوضة.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revoke(s.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  تأكيد الإلغاء
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              تعديل اشتراك: {editing?.full_name}
            </DialogTitle>
            <DialogDescription>
              حدّد نوع الباقة، تاريخ البدء، وتاريخ الانتهاء. اترك تاريخ الانتهاء فارغاً للاشتراك المفتوح.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>نوع الباقة</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">أساسية</SelectItem>
                  <SelectItem value="premium">متقدمة</SelectItem>
                  <SelectItem value="trial">تجريبية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ بدء الاشتراك</Label>
              <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ انتهاء الاشتراك</Label>
              <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendDays(7)}>+ أسبوع</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendDays(30)}>+ شهر</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendDays(90)}>+ 3 أشهر</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendDays(365)}>+ سنة</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditEnd("")}>بدون انتهاء</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) { setPwTarget(null); setNewPassword(""); setShowPw(false); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              تغيير كلمة المرور: {pwTarget?.full_name}
            </DialogTitle>
            <DialogDescription>
              ستحل كلمة المرور الجديدة محل القديمة فوراً. يجب أن تحتوي على مزيج من الحروف والأرقام والرموز.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="مثال: Teacher@2026"
                className="pl-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              يجب أن تجمع بين حروف (A-Z أو ا-ي) وأرقام (0-9) ورموز (مثل @ # $ ! %).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwTarget(null); setNewPassword(""); setShowPw(false); }} disabled={pwBusy}>
              إلغاء
            </Button>
            <Button onClick={changePassword} disabled={pwBusy || !newPassword} className="gap-2">
              {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
