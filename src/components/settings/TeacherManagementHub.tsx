import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Crown, Loader2, CalendarClock, Pencil, Trash2, Inbox, Infinity as InfinityIcon,
  ShieldCheck, ShieldX, KeyRound, Users, UserCheck, Archive, Settings2, Mail, Phone, Eye, EyeOff, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUPER_OWNER_ID = "1098080268";

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  national_id: string | null;
  phone: string | null;
  approval_status: "pending" | "approved" | "rejected";
  subscription_plan: string;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string;
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
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { text: "منتهٍ", tone: "expired" };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
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

export default function TeacherManagementHub() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "archived">("pending");

  // Activation key state
  // Activation key — value is bcrypt-hashed in DB and never exposed to the client
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [keyConfigOpen, setKeyConfigOpen] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  // Approval dialog state
  const [approveTarget, setApproveTarget] = useState<Profile | null>(null);
  const [enteredKey, setEnteredKey] = useState("");
  const [approving, setApproving] = useState(false);

  // Edit subscription dialog
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editPlan, setEditPlan] = useState<string>("basic");
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [profilesRes, keyRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, full_name, national_id, phone, approval_status, subscription_plan, subscription_start, subscription_end, created_at")
        .order("created_at", { ascending: false }),
      supabase.rpc("has_owner_activation_key"),
    ]);
    if (profilesRes.error) {
      toast({ title: "تعذر تحميل البيانات", description: profilesRes.error.message, variant: "destructive" });
    } else {
      const filtered = ((profilesRes.data as any) || []).filter((p: Profile) => p.national_id !== SUPER_OWNER_ID);
      setProfiles(filtered);
    }
    if (!keyRes.error) setHasKey(Boolean(keyRes.data));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const { pending, approved, archived } = useMemo(() => ({
    pending: profiles.filter((p) => p.approval_status === "pending"),
    approved: profiles.filter((p) => p.approval_status === "approved"),
    archived: profiles.filter((p) => p.approval_status === "rejected"),
  }), [profiles]);

  // ── Activation key management (hashed in DB) ──────────────────
  const saveActivationKey = async () => {
    const trimmed = newKey.trim();
    if (trimmed.length < 4) {
      toast({ title: "الرمز قصير جداً", description: "يجب ألا يقل الرمز عن 4 خانات", variant: "destructive" });
      return;
    }
    if (trimmed !== confirmKey.trim()) {
      toast({ title: "الرمزان غير متطابقين", description: "يرجى إعادة إدخال الرمز للتأكيد", variant: "destructive" });
      return;
    }
    setSavingKey(true);
    const { error } = await supabase.rpc("set_owner_activation_key", { _new_key: trimmed });
    setSavingKey(false);
    if (error) {
      toast({ title: "تعذر حفظ الرمز", description: error.message, variant: "destructive" });
      return;
    }
    setHasKey(true);
    setNewKey("");
    setConfirmKey("");
    setShowNewKey(false);
    setKeyConfigOpen(false);
    toast({ title: "تم حفظ رمز التفعيل بشكل مشفّر", description: "تم تخزين الرمز عبر تشفير bcrypt ولا يمكن استرجاعه" });
  };

  // ── Approve with security key ─────────────────────────────────
  const confirmApprove = async () => {
    if (!approveTarget) return;
    if (!hasKey) {
      toast({
        title: "لم يتم تعيين رمز التفعيل",
        description: "يرجى تعيين رمز التفعيل من زر الإعدادات أعلى البطاقة أولاً",
        variant: "destructive",
      });
      return;
    }
    setApproving(true);
    const { data: ok, error: verifyErr } = await supabase.rpc("verify_owner_activation_key", { _candidate: enteredKey.trim() });
    if (verifyErr) {
      setApproving(false);
      toast({ title: "تعذر التحقق من الرمز", description: verifyErr.message, variant: "destructive" });
      return;
    }
    if (!ok) {
      setApproving(false);
      toast({ title: "رمز التفعيل غير صحيح", description: "تأكد من إدخال الرمز السري الصحيح", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("set_user_approval", {
      _target_user: approveTarget.user_id,
      _status: "approved",
    });
    setApproving(false);
    if (error) {
      toast({ title: "تعذر تفعيل الحساب", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم تفعيل الحساب", description: `أصبح بإمكان ${approveTarget.full_name} الدخول الآن` });
    setApproveTarget(null);
    setEnteredKey("");
    loadAll();
  };

  // ── Reject / re-activate ──────────────────────────────────────
  const setStatus = async (userId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("set_user_approval", { _target_user: userId, _status: status });
    if (error) {
      toast({ title: "تعذر تنفيذ الإجراء", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "تمت إعادة التفعيل" : "تم رفض الطلب" });
    loadAll();
  };

  // ── Subscription edit ─────────────────────────────────────────
  const openEdit = (s: Profile) => {
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
    toast({ title: "تم تحديث الاشتراك" });
    setEditing(null);
    loadAll();
  };

  const extendDays = (days: number) => {
    const base = editEnd ? new Date(editEnd) : new Date();
    base.setDate(base.getDate() + days);
    setEditEnd(base.toISOString().split("T")[0]);
  };

  const revoke = async (userId: string) => {
    const { error } = await supabase.rpc("revoke_subscriber", { _target_user: userId });
    if (error) {
      toast({ title: "تعذر إلغاء الوصول", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم إلغاء وصول المشترك" });
    loadAll();
  };

  // ── Render ────────────────────────────────────────────────────
  const TabBadge = ({ count, variant }: { count: number; variant: "default" | "secondary" | "outline" }) => (
    <Badge variant={variant} className="mr-1 h-5 min-w-5 px-1.5 text-[11px] font-bold tabular-nums">
      {count}
    </Badge>
  );

  return (
    <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-background via-background to-amber-500/[0.03] shadow-lg">
      <CardHeader className="pb-3 border-b border-amber-500/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              مركز إدارة المعلمين
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5">
              لوحة موحدة لإدارة طلبات التفعيل، الاشتراكات النشطة، والحسابات المؤرشفة.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewKey(""); setConfirmKey(""); setShowNewKey(false); setKeyConfigOpen(true); }}
            className="gap-1.5 border-amber-500/40 hover:bg-amber-500/10"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
            {hasKey ? "تغيير رمز التفعيل" : "تعيين رمز التفعيل"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} dir="rtl">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="pending" className="gap-1.5 flex-wrap">
                <Users className="h-4 w-4" />
                <span>الطلبات الجديدة</span>
                <TabBadge count={pending.length} variant={pending.length > 0 ? "default" : "outline"} />
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5 flex-wrap">
                <UserCheck className="h-4 w-4" />
                <span>المشتركون النشطون</span>
                <TabBadge count={approved.length} variant="secondary" />
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-1.5 flex-wrap">
                <Archive className="h-4 w-4" />
                <span>المرفوضة / المؤرشفة</span>
                <TabBadge count={archived.length} variant="outline" />
              </TabsTrigger>
            </TabsList>

            {/* ─── PENDING ─── */}
            <TabsContent value="pending" className="mt-4">
              {!hasKey && (
                <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm flex items-start gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-900 dark:text-amber-200">
                    لم يتم تعيين رمز التفعيل بعد. يرجى تعيينه من الزر أعلى البطاقة قبل الموافقة على أي طلب.
                  </span>
                </div>
              )}
              {pending.length === 0 ? (
                <EmptyState icon={Inbox} text="لا توجد طلبات قيد المراجعة" />
              ) : (
                <div className="space-y-2.5">
                  {pending.map((p) => (
                    <ProfileRow
                      key={p.id}
                      profile={p}
                      actions={
                        <>
                          <Button size="sm" onClick={() => setApproveTarget(p)} className="gap-1.5">
                            <ShieldCheck className="h-4 w-4" />
                            تفعيل
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => setStatus(p.user_id, "rejected")}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <ShieldX className="h-4 w-4" />
                            رفض
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── APPROVED ─── */}
            <TabsContent value="approved" className="mt-4">
              {approved.length === 0 ? (
                <EmptyState icon={Inbox} text="لا يوجد مشتركون معتمدون حالياً" />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-xl border-2 border-border overflow-hidden" dir="rtl">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead className="text-right font-bold">المعلم</TableHead>
                          <TableHead className="text-right font-bold">الباقة</TableHead>
                          <TableHead className="text-right font-bold">البدء</TableHead>
                          <TableHead className="text-right font-bold">الانتهاء</TableHead>
                          <TableHead className="text-right font-bold">المتبقي</TableHead>
                          <TableHead className="text-right font-bold">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approved.map((s) => {
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
                                <Badge variant="outline" className={cn("border", plan.cls)}>{plan.label}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(s.subscription_start)}</TableCell>
                              <TableCell className="text-sm">{formatDate(s.subscription_end)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("border gap-1", TONE_CLS[cd.tone])}>
                                  {cd.tone === "infinite" ? <InfinityIcon className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                                  {cd.text}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <SubscriberActions
                                  profile={s}
                                  onEdit={() => openEdit(s)}
                                  onRevoke={() => revoke(s.user_id)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2.5">
                    {approved.map((s) => {
                      const cd = getCountdown(s.subscription_end);
                      const plan = PLAN_LABELS[s.subscription_plan] || PLAN_LABELS.basic;
                      return (
                        <div key={s.id} className="p-3 rounded-xl border-2 border-border bg-muted/20 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold">{s.full_name}</div>
                              {s.national_id && <div className="text-[11px] text-muted-foreground">{s.national_id}</div>}
                            </div>
                            <Badge variant="outline" className={cn("border", plan.cls)}>{plan.label}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline" className={cn("border gap-1", TONE_CLS[cd.tone])}>
                              {cd.tone === "infinite" ? <InfinityIcon className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                              {cd.text}
                            </Badge>
                            <span className="text-muted-foreground">ينتهي: {formatDate(s.subscription_end)}</span>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <SubscriberActions
                              profile={s}
                              onEdit={() => openEdit(s)}
                              onRevoke={() => revoke(s.user_id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─── ARCHIVED ─── */}
            <TabsContent value="archived" className="mt-4">
              {archived.length === 0 ? (
                <EmptyState icon={Archive} text="لا توجد حسابات مؤرشفة" />
              ) : (
                <div className="space-y-2.5">
                  {archived.map((p) => (
                    <ProfileRow
                      key={p.id}
                      profile={p}
                      tag={<Badge variant="destructive" className="text-[10px]">مرفوض</Badge>}
                      actions={
                        <Button size="sm" variant="outline" onClick={() => setApproveTarget(p)} className="gap-1.5">
                          <ShieldCheck className="h-4 w-4" />
                          إعادة تفعيل
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* ═══ Activation Key Configuration Dialog ═══ */}
      <Dialog open={keyConfigOpen} onOpenChange={setKeyConfigOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              {activationKey ? "تعديل رمز التفعيل الخاص" : "تعيين رمز التفعيل الخاص"}
            </DialogTitle>
            <DialogDescription>
              هذا الرمز السري يحميك من التفعيل بالخطأ. سيُطلب منك إدخاله في كل مرة توافق فيها على حساب جديد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {activationKey && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">الرمز الحالي</Label>
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setShowStoredKey((v) => !v)}>
                    {showStoredKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showStoredKey ? "إخفاء" : "إظهار"}
                  </Button>
                </div>
                <div className="font-mono mt-1 text-base tracking-wider">
                  {showStoredKey ? activationKey : "•".repeat(activationKey.length)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>رمز التفعيل الجديد</Label>
              <Input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="مثلاً: ALPHA-2026"
                className="font-mono tracking-wider"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">يفضل ألا يقل عن 6 خانات ويحتوي أرقاماً وحروفاً.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyConfigOpen(false)} disabled={savingKey}>إلغاء</Button>
            <Button onClick={saveActivationKey} disabled={savingKey} className="gap-2">
              {savingKey && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ الرمز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Approve Confirmation with Security Key ═══ */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) { setApproveTarget(null); setEnteredKey(""); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              تأكيد تفعيل الحساب
            </DialogTitle>
            <DialogDescription>
              أنت على وشك تفعيل حساب <strong className="text-foreground">{approveTarget?.full_name}</strong>.
              يرجى إدخال رمز التفعيل السري لتأكيد هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                رمز التفعيل الخاص
              </Label>
              <Input
                type="password"
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value)}
                placeholder="أدخل الرمز السري"
                className="font-mono tracking-wider text-center"
                autoComplete="off"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") confirmApprove(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveTarget(null); setEnteredKey(""); }} disabled={approving}>
              إلغاء
            </Button>
            <Button onClick={confirmApprove} disabled={approving || !enteredKey} className="gap-2">
              {approving && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد التفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Subscription Dialog ═══ */}
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
    </Card>
  );
}

// ─── Helper components ─────────────────────────────────────────
function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ProfileRow({
  profile, actions, tag,
}: { profile: Profile; actions: React.ReactNode; tag?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 p-3.5 rounded-xl border-2 border-border bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-bold text-foreground">{profile.full_name || "بدون اسم"}</span>
          {tag}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {profile.national_id && (
            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{profile.national_id}</span>
          )}
          {profile.phone && (
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>
          )}
          <span>سُجِّل: {formatDate(profile.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">{actions}</div>
    </div>
  );
}

function SubscriberActions({
  profile, onEdit, onRevoke,
}: { profile: Profile; onEdit: () => void; onRevoke: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" className="gap-1 h-8" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
        تعديل
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
              سيتم إنهاء اشتراك المعلم <strong>{profile.full_name}</strong> فوراً وحجب وصوله للمنصة.
              يمكنك إعادة تفعيله لاحقاً من تبويب الحسابات المؤرشفة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
