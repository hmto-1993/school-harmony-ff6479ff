import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface StudentAbsenceData {
  id: string;
  full_name: string;
  class_name: string;
  absenceCount: number;
  totalDays: number;
  absenceRate: number;
  status: "safe" | "warning" | "danger";
}

async function fetchSafeZoneData() {
  const termStart = format(subDays(new Date(), 120), "yyyy-MM-dd");

  const [{ data: settingsData }, { data: students }, { data: attendance }] = await Promise.all([
    supabase.from("site_settings").select("id, value").in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]),
    supabase.from("students").select("id, full_name, class_id, classes(name)").order("full_name"),
    supabase.from("attendance_records").select("student_id, status").gte("date", termStart),
  ]);

  let absenceThreshold = 20;
  let absModeVal = "percentage";
  let allowedSessionsVal = 0;
  (settingsData || []).forEach((s: any) => {
    if (s.id === "absence_threshold") absenceThreshold = Number(s.value) || 20;
    if (s.id === "absence_allowed_sessions") allowedSessionsVal = Number(s.value) || 0;
    if (s.id === "absence_mode") absModeVal = s.value || "percentage";
  });

  if (!students || students.length === 0) {
    return { threshold: absenceThreshold, safeCount: 0, warningCount: 0, dangerCount: 0, studentsAtRisk: [] as StudentAbsenceData[] };
  }

  const studentAttendance = new Map<string, { total: number; absent: number }>();
  attendance?.forEach((record) => {
    const current = studentAttendance.get(record.student_id) || { total: 0, absent: 0 };
    current.total++;
    if (record.status === "absent") current.absent++;
    studentAttendance.set(record.student_id, current);
  });

  let safe = 0, warning = 0, danger = 0;
  const studentStats: StudentAbsenceData[] = [];

  for (const student of students) {
    const stats = studentAttendance.get(student.id) || { total: 0, absent: 0 };
    const absenceRate = stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0;

    let exceeded = false;
    let isWarningZone = false;
    if (absModeVal === "sessions" && allowedSessionsVal > 0) {
      exceeded = stats.absent > allowedSessionsVal;
      isWarningZone = !exceeded && stats.absent >= Math.round(allowedSessionsVal * 0.7);
    } else {
      exceeded = absenceRate >= absenceThreshold;
      isWarningZone = !exceeded && absenceRate >= absenceThreshold * 0.7;
    }

    let status: "safe" | "warning" | "danger" = "safe";
    if (exceeded) { status = "danger"; danger++; }
    else if (isWarningZone) { status = "warning"; warning++; }
    else { safe++; }

    if (status !== "safe") {
      studentStats.push({
        id: student.id,
        full_name: student.full_name,
        class_name: (student.classes as any)?.name || "",
        absenceCount: stats.absent,
        totalDays: stats.total,
        absenceRate,
        status,
      });
    }
  }

  studentStats.sort((a, b) => {
    if (a.status === "danger" && b.status !== "danger") return -1;
    if (a.status !== "danger" && b.status === "danger") return 1;
    return b.absenceRate - a.absenceRate;
  });

  return {
    threshold: absenceThreshold,
    safeCount: safe,
    warningCount: warning,
    dangerCount: danger,
    studentsAtRisk: studentStats.slice(0, 6),
  };
}

export default function SafeZoneCounter() {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["safe-zone-counter"],
    queryFn: fetchSafeZoneData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (loading || !data) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2"><div className="h-5 bg-muted rounded w-32" /></CardHeader>
        <CardContent><div className="h-24 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const { threshold, safeCount, warningCount, dangerCount, studentsAtRisk } = data;
  const total = safeCount + warningCount + dangerCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className={cn(
        "relative overflow-hidden border",
        "border-primary/20 dark:border-primary/30",
        "bg-gradient-to-br from-card via-card/95 to-primary/5",
        "shadow-lg"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            المنطقة الآمنة - حد الغياب {threshold}%
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className={cn("rounded-xl p-3 text-center", "bg-success/10 border border-success/20")}>
              <ShieldCheck className="h-5 w-5 mx-auto text-success mb-1" />
              <p className="text-lg font-bold text-success">{safeCount}</p>
              <p className="text-[10px] text-muted-foreground">آمن</p>
            </div>
            <div className={cn("rounded-xl p-3 text-center", "bg-warning/10 border border-warning/20")}>
              <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-lg font-bold text-warning">{warningCount}</p>
              <p className="text-[10px] text-muted-foreground">تحذير</p>
            </div>
            <div className={cn("rounded-xl p-3 text-center", "bg-destructive/10 border border-destructive/20")}>
              <ShieldAlert className="h-5 w-5 mx-auto text-destructive mb-1" />
              <p className="text-lg font-bold text-destructive">{dangerCount}</p>
              <p className="text-[10px] text-muted-foreground">خطر</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>نسبة الطلاب الآمنين</span>
              <span>{total > 0 ? Math.round((safeCount / total) * 100) : 0}%</span>
            </div>
            <Progress value={total > 0 ? (safeCount / total) * 100 : 0} className="h-2" />
          </div>

          {studentsAtRisk.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                الطلاب الأكثر عرضة للخطر
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {studentsAtRisk.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                        student.status === "danger"
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-warning/10 border border-warning/20"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {student.status === "danger" ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                        )}
                        <span className="font-medium truncate">{student.full_name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {student.class_name}
                        </Badge>
                      </div>
                      <Badge
                        variant={student.status === "danger" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {student.absenceRate}%
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
