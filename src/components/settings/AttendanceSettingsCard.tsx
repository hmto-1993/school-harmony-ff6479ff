import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck, Lock, LockOpen, Users, Save, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SettingsData } from "./settings-types";

export function AttendanceSettingsCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "attendance_settings" || !s.isAdmin) return null;

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            إعدادات التحضير
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              {s.attendanceOverrideLock ? <LockOpen className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-success" />}
              قفل التحضير التلقائي
            </h3>
            <p className="text-xs text-muted-foreground mt-1">عند تفعيل القفل، لا يمكن تعديل التحضير بعد تسجيله — إلا بإلغاء القفل.</p>
          </div>
          <Switch
            checked={!s.attendanceOverrideLock}
            onCheckedChange={async (checked) => {
              const newVal = !checked;
              s.setAttendanceOverrideLock(newVal);
              await supabase.from("site_settings").upsert({ id: "attendance_override_lock", value: String(newVal) });
              toast({ title: checked ? "القفل مفعّل" : "القفل معطّل", description: checked ? "التحضير المسجل لن يمكن تعديله" : "يمكن تعديل التحضير في أي وقت" });
            }}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" />عدد الحصص الأسبوعية لكل فصل</h3>
          <p className="text-xs text-muted-foreground">حدد عدد الحصص المطلوبة أسبوعياً لكل فصل. عند الوصول للحد، سيتم قفل التحضير تلقائياً.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {s.classes.map((c) => {
              const schedule = s.classSchedules[c.id];
              const periodsPerWeek = schedule?.periodsPerWeek ?? 5;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
                  <span className="font-medium text-sm truncate flex-1">{c.name}</span>
                  <div className="flex items-center gap-2 mr-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => s.saveClassSchedule(c.id, Math.max(1, periodsPerWeek - 1))}>−</Button>
                    <span className="w-8 text-center font-bold text-primary">{periodsPerWeek}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => s.saveClassSchedule(c.id, Math.min(20, periodsPerWeek + 1))}>+</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardContent className="space-y-5 border-t border-border/30 pt-5">
        <h3 className="font-semibold flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          حد إنذار الغياب
        </h3>
        <div className="space-y-2">
          <Label>طريقة تحديد الحد</Label>
          <div className="flex gap-2">
            <Button variant={s.absenceMode === "percentage" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => s.setAbsenceMode("percentage")}>بالنسبة المئوية (%)</Button>
            <Button variant={s.absenceMode === "sessions" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => s.setAbsenceMode("sessions")}>بعدد الحصص</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>إجمالي حصص الفصل الدراسي</Label>
          <div className="flex items-center gap-3">
            <Input type="number" min={10} max={500} value={s.totalTermSessions || ""} onChange={(e) => { const val = Math.min(500, Math.max(0, Number(e.target.value) || 0)); s.setTotalTermSessions(val); if (s.absenceMode === "percentage" && val > 0) s.setAbsenceAllowedSessions(Math.round((s.absenceThreshold / 100) * val)); if (s.absenceMode === "sessions" && val > 0 && s.absenceAllowedSessions > 0) s.setAbsenceThreshold(Math.round((s.absenceAllowedSessions / val) * 100)); }} className="w-28 text-center font-bold text-lg" dir="ltr" placeholder="مثال: 90" />
            <span className="text-sm text-muted-foreground">حصة</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>نسبة الغياب المسموح (%)</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={5} max={50} value={s.absenceThreshold} onChange={(e) => { const val = Math.min(50, Math.max(5, Number(e.target.value) || 20)); s.setAbsenceThreshold(val); if (s.totalTermSessions > 0) s.setAbsenceAllowedSessions(Math.round((val / 100) * s.totalTermSessions)); }} className={cn("w-24 text-center font-bold text-lg", s.absenceMode === "percentage" && "ring-2 ring-primary")} dir="ltr" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[10, 15, 20, 25, 30].map((v) => (<Button key={v} variant={s.absenceThreshold === v ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => { s.setAbsenceThreshold(v); if (s.totalTermSessions > 0) s.setAbsenceAllowedSessions(Math.round((v / 100) * s.totalTermSessions)); }}>{v}%</Button>))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>عدد الحصص المسموح بها</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={1} max={200} value={s.absenceAllowedSessions || ""} onChange={(e) => { const val = Math.min(200, Math.max(0, Number(e.target.value) || 0)); s.setAbsenceAllowedSessions(val); if (s.totalTermSessions > 0 && val > 0) s.setAbsenceThreshold(Math.round((val / s.totalTermSessions) * 100)); }} className={cn("w-24 text-center font-bold text-lg", s.absenceMode === "sessions" && "ring-2 ring-primary")} dir="ltr" placeholder="مثال: 5" />
              <span className="text-sm text-muted-foreground">حصة</span>
            </div>
            {s.totalTermSessions > 0 && s.absenceAllowedSessions > 0 && (<p className="text-xs text-info font-medium">= {Math.round((s.absenceAllowedSessions / s.totalTermSessions) * 100)}% من إجمالي {s.totalTermSessions} حصة</p>)}
          </div>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-bold text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />إجراء تلقائي عند التجاوز</p>
          <p className="text-xs text-muted-foreground">عند تجاوز الطالب عدد الحصص المسموح بها ({s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`})، يتم تحويل حالته تلقائياً إلى <strong className="text-destructive">"محروم من دخول الاختبار"</strong>.</p>
        </div>
        <Button onClick={async () => { s.setSavingThreshold(true); await Promise.all([supabase.from("site_settings").upsert({ id: "absence_threshold", value: String(s.absenceThreshold) }), supabase.from("site_settings").upsert({ id: "absence_allowed_sessions", value: String(s.absenceAllowedSessions) }), supabase.from("site_settings").upsert({ id: "absence_mode", value: s.absenceMode }), supabase.from("site_settings").upsert({ id: "total_term_sessions", value: String(s.totalTermSessions) })]); s.setSavingThreshold(false); toast({ title: "تم الحفظ", description: `تم تعيين حد الإنذار: ${s.absenceMode === "sessions" && s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`}` }); }} disabled={s.savingThreshold} className="gap-1.5"><Save className="h-4 w-4" />{s.savingThreshold ? "جارٍ الحفظ..." : "حفظ حد الإنذار"}</Button>
      </CardContent>
    </Card>
  );
}
