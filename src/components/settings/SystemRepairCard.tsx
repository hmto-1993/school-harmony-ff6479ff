import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, UserSearch, LifeBuoy } from "lucide-react";

type AuditResult = {
  run_id: string;
  before: Record<string, number>;
  after: Record<string, number>;
  fixed: Record<string, number>;
  invalid: Record<string, number>;
  ran_at: string;
};

type StudentRecoveryResult = {
  snapshot_id: string;
  organization_id: string;
  before: { null_org: number; invalid_org: number };
  fixed: { null_org: number; invalid_org: number };
  students_in_org_after: number;
  ran_at: string;
};

const LABELS: Record<string, string> = {
  students_null_org: "طلاب بدون مؤسسة",
  classes_null_org: "فصول بدون مؤسسة",
  grades_null_org: "درجات بدون مؤسسة",
  attendance_null_org: "حضور بدون مؤسسة",
  behavior_null_org: "سلوك بدون مؤسسة",
  notifications_null_org: "إشعارات بدون مؤسسة",
  classes: "فصول تم إصلاحها",
  students_from_class: "طلاب موروث من الفصل",
  students_default: "طلاب أُسندت للمؤسسة الافتراضية",
  grades: "درجات مرتبطة",
  attendance: "حضور مرتبط",
  behavior: "سلوك مرتبط",
  notifications: "إشعارات مرتبطة",
  grades_orphan: "درجات يتيمة (موضوعة بالحجر)",
  attendance_orphan: "حضور يتيم (موضوع بالحجر)",
  behavior_orphan: "سلوك يتيم (موضوع بالحجر)",
  notifications_orphan: "إشعارات يتيمة",
  students_invalid_org: "طلاب بمؤسسة غير موجودة",
};

const sumValues = (obj: Record<string, number> = {}) =>
  Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);

const Section = ({ title, data }: { title: string; data: Record<string, number> }) => {
  const entries = Object.entries(data || {}).filter(([, v]) => Number(v) > 0);
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <div className="text-xs font-bold text-primary">{title}</div>
      <ul className="text-xs space-y-1">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between">
            <span className="text-muted-foreground">{LABELS[k] || k}</span>
            <span className="font-bold">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

type FullRecoveryResult = {
  run_id: string;
  organization_id: string;
  before: Record<string, number>;
  after: Record<string, number>;
  fixed: Record<string, number>;
  totals: Record<string, number>;
  ran_at: string;
};

export default function SystemRepairCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<StudentRecoveryResult | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<FullRecoveryResult | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("run_full_system_audit" as any);
      if (error) throw error;
      setResult(data as AuditResult);
      toast({
        title: "اكتملت الصيانة",
        description: `تم إصلاح ${sumValues((data as AuditResult).fixed)} سجل، وحجر ${sumValues((data as AuditResult).invalid)} سجل تالف.`,
      });
    } catch (e: any) {
      toast({ title: "تعذّر تشغيل الصيانة", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const restoreStudents = async () => {
    setRestoring(true);
    try {
      const { data, error } = await supabase.rpc("restore_missing_students" as any);
      if (error) throw error;
      const r = data as StudentRecoveryResult;
      setRestoreResult(r);
      const totalFixed = (r.fixed?.null_org || 0) + (r.fixed?.invalid_org || 0);
      toast({
        title: totalFixed > 0 ? "تم استرجاع الطلاب" : "لا يوجد طلاب مفقودون",
        description: totalFixed > 0
          ? `تم ربط ${totalFixed} طالب بمؤسستك. الإجمالي الآن: ${r.students_in_org_after}`
          : `لا توجد سجلات بحاجة لإصلاح. عدد طلاب مؤسستك: ${r.students_in_org_after}`,
      });
    } catch (e: any) {
      toast({ title: "تعذّر استرجاع الطلاب", description: e.message, variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const recoverAll = async () => {
    setRecovering(true);
    try {
      const { data, error } = await supabase.rpc("recover_all_user_data" as any);
      if (error) throw error;
      const r = data as FullRecoveryResult;
      setRecoveryResult(r);
      const totalFixed = sumValues(r.fixed);
      toast({
        title: totalFixed > 0 ? "تم استرجاع البيانات بنجاح" : "البيانات سليمة",
        description: totalFixed > 0
          ? `تم إصلاح ${totalFixed} سجل وربطه بمؤسستك.`
          : `لا توجد سجلات بحاجة لإصلاح.`,
      });
    } catch (e: any) {
      toast({ title: "تعذّر استرجاع البيانات", description: e.message, variant: "destructive" });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <Card className="border-2 border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          صيانة النظام الشاملة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          تفحص جميع البيانات (الطلاب، الفصول، الدرجات، الحضور، السلوك، الإشعارات)، تنشئ نسخاً احتياطية،
          وتُصلح الروابط المفقودة بـ <span className="font-bold">organization_id</span>، وتعزل السجلات التالفة دون حذفها.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {running ? "جاري التشغيل..." : "تشغيل صيانة النظام"}
          </Button>
          <Button onClick={restoreStudents} disabled={restoring} variant="outline" className="gap-2">
            {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSearch className="h-4 w-4" />}
            {restoring ? "جاري الاسترجاع..." : "استرجاع الطلاب المفقودين"}
          </Button>
        </div>

        {restoreResult && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="text-xs font-bold text-primary">نتيجة استرجاع الطلاب</div>
            <ul className="text-xs space-y-1">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">طلاب بدون مؤسسة (قبل)</span>
                <span className="font-bold">{restoreResult.before.null_org}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">طلاب بمؤسسة غير صالحة (قبل)</span>
                <span className="font-bold">{restoreResult.before.invalid_org}</span>
              </li>
              <li className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>تم استرجاعهم</span>
                <span className="font-bold">
                  {(restoreResult.fixed.null_org || 0) + (restoreResult.fixed.invalid_org || 0)}
                </span>
              </li>
              <li className="flex items-center justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">إجمالي طلاب مؤسستك الآن</span>
                <span className="font-bold">{restoreResult.students_in_org_after}</span>
              </li>
            </ul>
          </div>
        )}

        {result && (
          <div className="grid gap-3 md:grid-cols-2 pt-2">
            <Section title="قبل الإصلاح" data={result.before} />
            <Section title="بعد الإصلاح" data={result.after} />
            <Section title={`تم الإصلاح (${sumValues(result.fixed)})`} data={result.fixed} />
            <Section title={`سجلات تالفة (${sumValues(result.invalid)})`} data={result.invalid} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
