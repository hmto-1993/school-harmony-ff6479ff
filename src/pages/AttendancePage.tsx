import { useEffect, useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { useToast } from "@/hooks/use-toast";
import { Save, CheckCircle2, Filter, ClipboardCheck, Users, Search, CalendarIcon, ArrowRightLeft, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import EmptyState from "@/components/EmptyState";
import AcademicWeekBadge from "@/components/dashboard/AcademicWeekBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";

type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "sick_leave";

interface StudentAttendance {
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  notes: string;
  existing_id?: string;
}

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "حاضر", color: "bg-success/10 text-success border-success/30" },
  { value: "absent", label: "غائب", color: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "late", label: "متأخر", color: "bg-warning/10 text-warning border-warning/30" },
  { value: "early_leave", label: "منصرف مبكرًا", color: "bg-muted text-muted-foreground border-border" },
  { value: "sick_leave", label: "إجازة مرضية", color: "bg-info/10 text-info border-info/30" },
];

// Map: classId -> { sessions: number; limit: number }
type WeeklyProgress = Record<string, { sessions: number; limit: number }>;

interface AbsenceAlert {
  student_id: string;
  totalAbsent: number;
  allowedSessions: number;
  threshold: number;
  exceeded: boolean;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { calendarData, getWeekForDate } = useAcademicWeek();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [savedDayNote, setSavedDayNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState<Date>(new Date());
  const [movingDate, setMovingDate] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>({});
  const [overrideLock, setOverrideLock] = useState(false);
  const [absenceAlerts, setAbsenceAlerts] = useState<Record<string, AbsenceAlert>>({});
  const date = format(selectedDate, "yyyy-MM-dd");

  // Compute if currently selected class is locked (limit reached and no override)
  const selectedProgress = selectedClass ? weeklyProgress[selectedClass] : null;
  const isClassLocked = useMemo(() => {
    if (!selectedProgress) return false;
    if (overrideLock) return false; // Admin has disabled the lock
    // Only lock if attendance hasn't been saved yet for today (to allow editing existing)
    const alreadySavedToday = records.some(r => r.existing_id);
    if (alreadySavedToday) return false; // Allow editing if already saved for today
    return selectedProgress.sessions >= selectedProgress.limit;
  }, [selectedProgress, overrideLock, records]);

  // Derive the academic week bounds for the selected date
  const weekBounds = useMemo(() => {
    if (calendarData) {
      const weekNum = getWeekForDate(selectedDate);
      if (weekNum !== null) {
        const calStart = new Date(calendarData.start_date);
        const wStart = new Date(calStart);
        wStart.setDate(calStart.getDate() + (weekNum - 1) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        return { start: format(wStart, "yyyy-MM-dd"), end: format(wEnd, "yyyy-MM-dd") };
      }
    }
    // Fallback: Sat-based week (Saudi school week)
    const sat = new Date(selectedDate);
    sat.setDate(sat.getDate() - ((sat.getDay() + 1) % 7));
    const fri = new Date(sat);
    fri.setDate(sat.getDate() + 6);
    return { start: format(sat, "yyyy-MM-dd"), end: format(fri, "yyyy-MM-dd") };
  }, [selectedDate, calendarData, getWeekForDate]);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => {
      setClasses(data || []);
    });
    // Fetch override lock setting
    supabase.from("site_settings").select("value").eq("id", "attendance_override_lock").maybeSingle().then(({ data }) => {
      setOverrideLock(data?.value === "true");
    });
  }, []);

  // Load weekly progress whenever classes list or week bounds change
  useEffect(() => {
    if (classes.length === 0) return;
    loadWeeklyProgress();
  }, [classes, weekBounds]);

  useEffect(() => {
    if (!selectedClass) return;
    loadStudents();
    loadDayNote();
    loadAbsenceAlerts();
  }, [selectedClass, date]);

  const loadWeeklyProgress = async () => {
    // 1. Fetch class_schedules for periods_per_week limits
    const { data: schedules } = await supabase
      .from("class_schedules")
      .select("class_id, periods_per_week");

    const limitsMap: Record<string, number> = {};
    (schedules || []).forEach(s => { limitsMap[s.class_id] = s.periods_per_week; });

    // 2. Fetch distinct attendance dates per class within the academic week
    const { data: records } = await supabase
      .from("attendance_records")
      .select("class_id, date")
      .gte("date", weekBounds.start)
      .lte("date", weekBounds.end);

    // Count distinct dates per class
    const sessionMap: Record<string, Set<string>> = {};
    (records || []).forEach(r => {
      if (!sessionMap[r.class_id]) sessionMap[r.class_id] = new Set();
      sessionMap[r.class_id].add(r.date);
    });

    const progress: WeeklyProgress = {};
    classes.forEach(c => {
      progress[c.id] = {
        sessions: sessionMap[c.id]?.size ?? 0,
        limit: limitsMap[c.id] ?? 5,
      };
    });
    setWeeklyProgress(progress);
  };

  const loadDayNote = async () => {
    if (!selectedClass) return;
    const { data } = await supabase
      .from("attendance_schedule_exceptions")
      .select("reason")
      .eq("class_id", selectedClass)
      .eq("original_date", date)
      .eq("type", "note")
      .maybeSingle();
    const note = data?.reason || "";
    setSavedDayNote(note);
    setDayNote(note);
  };

  const saveDayNote = async () => {
    if (!user || !selectedClass) return;
    setSavingNote(true);
    
    // Check if note already exists
    const { data: existing } = await supabase
      .from("attendance_schedule_exceptions")
      .select("id")
      .eq("class_id", selectedClass)
      .eq("original_date", date)
      .eq("type", "note")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("attendance_schedule_exceptions")
        .update({ reason: dayNote })
        .eq("id", existing.id);
    } else {
      await supabase.from("attendance_schedule_exceptions").insert({
        class_id: selectedClass,
        original_date: date,
        type: "note",
        reason: dayNote,
        created_by: user.id,
      });
    }

    setSavedDayNote(dayNote);
    setSavingNote(false);
    toast({ title: "تم الحفظ", description: "تم حفظ ملاحظة اليوم" });
  };

  const loadAbsenceAlerts = async () => {
    if (!selectedClass) return;
    // Fetch settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"]);
    
    let threshold = 20;
    let allowedSessions = 0;
    let mode = "percentage";
    let totalSessions = 0;
    (settings || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
      if (s.id === "total_term_sessions") totalSessions = Number(s.value) || 0;
    });

    // Fetch all attendance for students in this class
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", selectedClass);
    
    if (!students || students.length === 0) return;
    
    const studentIds = students.map(s => s.id);
    const { data: allAtt } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .in("student_id", studentIds);

    const alerts: Record<string, AbsenceAlert> = {};
    const studentAbsences: Record<string, { absent: number; total: number }> = {};
    
    (allAtt || []).forEach((r: any) => {
      if (!studentAbsences[r.student_id]) studentAbsences[r.student_id] = { absent: 0, total: 0 };
      studentAbsences[r.student_id].total++;
      if (r.status === "absent") studentAbsences[r.student_id].absent++;
    });

    studentIds.forEach(sid => {
      const data = studentAbsences[sid];
      if (!data) return;
      
      let exceeded = false;
      if (mode === "sessions" && allowedSessions > 0) {
        exceeded = data.absent > allowedSessions;
      } else if (data.total > 0) {
        exceeded = (data.absent / data.total) * 100 >= threshold;
      }
      
      if (data.absent > 0) {
        alerts[sid] = {
          student_id: sid,
          totalAbsent: data.absent,
          allowedSessions,
          threshold,
          exceeded,
        };
      }
    });
    
    setAbsenceAlerts(alerts);
  };


  const loadStudents = async () => {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("class_id", selectedClass)
      .order("full_name");

    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, notes")
      .eq("class_id", selectedClass)
      .eq("date", date);

    const attendanceMap = new Map(attendance?.map((a) => [a.student_id, a]));

    setRecords(
      (students || []).map((s) => {
        const existing = attendanceMap.get(s.id);
        return {
          student_id: s.id,
          full_name: s.full_name,
          status: (existing?.status as AttendanceStatus) || "present",
          notes: existing?.notes || "",
          existing_id: existing?.id,
        };
      })
    );
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const updateNotes = (studentId: string, notes: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, notes } : r))
    );
  };

  const handleMoveSession = async () => {
    if (!user || !selectedClass || records.length === 0) return;
    const newDate = format(moveTargetDate, "yyyy-MM-dd");
    if (newDate === date) return;
    setMovingDate(true);
    const { error } = await supabase
      .from("attendance_records")
      .update({ date: newDate })
      .eq("class_id", selectedClass)
      .eq("date", date);
    if (error) {
      toast({ title: "خطأ", description: "فشل نقل الحصة", variant: "destructive" });
    } else {
      toast({ title: "تم النقل", description: `تم نقل حصة التحضير إلى ${newDate}` });
      setSelectedDate(moveTargetDate);
    }
    setMovingDate(false);
    setMoveConfirmOpen(false);
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" as AttendanceStatus })));
  };

  const handleSave = async () => {
    if (!user || !selectedClass) return;
    setSaving(true);

    const toUpdate = records.filter((r) => r.existing_id);
    const toInsert = records.filter((r) => !r.existing_id);

    for (const record of toUpdate) {
      await supabase
        .from("attendance_records")
        .update({ status: record.status, notes: record.notes })
        .eq("id", record.existing_id!);
    }

    if (toInsert.length > 0) {
      await supabase.from("attendance_records").insert(
        toInsert.map((r) => ({
          student_id: r.student_id,
          class_id: selectedClass,
          date,
          status: r.status,
          notes: r.notes,
          recorded_by: user.id,
        }))
      );
    }

    toast({ title: "تم الحفظ", description: "تم حفظ سجلات الحضور بنجاح" });
    setSaving(false);
    loadStudents();
    loadWeeklyProgress();
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) result = result.filter((r) => r.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return result;
  }, [records, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          التحضير
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-muted-foreground">التاريخ:</span>
          <HijriDatePicker
            date={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
          />
          <AcademicWeekBadge date={selectedDate} />
          {selectedClass && records.some(r => r.existing_id) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => { setMoveTargetDate(selectedDate); setMoveDialogOpen(true); }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              نقل الحصة
            </Button>
          )}
          {savedDayNote && (
            <span className="text-xs px-2 py-1 rounded-md bg-info/10 text-info border border-info/30">
              📝 {savedDayNote}
            </span>
          )}
        </div>
      </div>

      {/* Move Session - Date Picker Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>نقل حصة التحضير</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">اختر التاريخ الجديد لنقل سجلات الحضور إليه:</p>
          <HijriDatePicker
            date={moveTargetDate}
            onDateChange={setMoveTargetDate}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => { setMoveDialogOpen(false); setMoveConfirmOpen(true); }}
              disabled={format(moveTargetDate, "yyyy-MM-dd") === date}
            >
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              التالي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Session - Confirmation Dialog */}
      <Dialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-warning" />
              تأكيد نقل الحصة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">من:</span>
                <span className="font-semibold">{date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إلى:</span>
                <span className="font-semibold text-primary">{format(moveTargetDate, "yyyy-MM-dd")}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-warning/20 pt-2">
                <span className="text-muted-foreground">عدد الطلاب المتأثرين:</span>
                <span className="font-bold text-warning">{records.filter(r => r.existing_id).length} طالب</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">سيتم نقل جميع سجلات الحضور المحفوظة لهذا اليوم إلى التاريخ الجديد.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveConfirmOpen(false); setMoveDialogOpen(true); }}>
              رجوع
            </Button>
            <Button
              variant="destructive"
              onClick={handleMoveSession}
              disabled={movingDate}
            >
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              {movingDate ? "جارٍ النقل..." : "تأكيد النقل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Selection Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          اختر الفصل
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {classes.map((c, index) => {
            const isSelected = selectedClass === c.id;
            const colorPalette = [
              { gradient: "from-primary/15 to-primary/5", border: "border-primary/40", text: "text-primary", iconBg: "bg-primary/20" },
              { gradient: "from-accent/15 to-accent/5", border: "border-accent/40", text: "text-accent", iconBg: "bg-accent/20" },
              { gradient: "from-success/15 to-success/5", border: "border-success/40", text: "text-success", iconBg: "bg-success/20" },
              { gradient: "from-warning/15 to-warning/5", border: "border-warning/40", text: "text-warning", iconBg: "bg-warning/20" },
              { gradient: "from-info/15 to-info/5", border: "border-info/40", text: "text-info", iconBg: "bg-info/20" },
              { gradient: "from-destructive/15 to-destructive/5", border: "border-destructive/40", text: "text-destructive", iconBg: "bg-destructive/20" },
            ];
            const color = colorPalette[index % colorPalette.length];
            const progress = weeklyProgress[c.id];
            const sessions = progress?.sessions ?? 0;
            const limit = progress?.limit ?? 5;
            const isComplete = sessions >= limit;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-center transition-all duration-300 group cursor-pointer animate-fade-in",
                  `bg-gradient-to-br ${color.gradient}`,
                  isSelected
                    ? `${color.border} ring-2 ring-current/10 shadow-lg scale-[1.02]`
                    : "border-border/30 hover:border-border/60 hover:shadow-md hover:scale-[1.01]"
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
                  isSelected ? color.iconBg : "bg-muted/50"
                )}>
                  <Users className={cn("h-5 w-5", isSelected ? color.text : "text-muted-foreground")} />
                </div>
                <p className={cn(
                  "text-sm font-bold truncate",
                  isSelected ? color.text : "text-foreground"
                )}>{c.name}</p>
                {/* Weekly progress badge */}
                <div className={cn(
                  "mt-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                  isComplete && !overrideLock
                    ? "bg-success/15 text-success border-success/30"
                    : isComplete && overrideLock
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted/60 text-muted-foreground border-border/40"
                )}>
                  {isComplete && !overrideLock ? (
                    <Lock className="h-2.5 w-2.5" />
                  ) : isComplete ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : null}
                  {sessions}/{limit}
                </div>
                {isSelected && (
                  <div className={cn("absolute top-2 left-2 w-2.5 h-2.5 rounded-full animate-pulse", "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Note Input */}
      {selectedClass && (
        <Card className="border-0 shadow-sm bg-card/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Input
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
                placeholder="ملاحظة اليوم (مثال: إجازة، مرضي، تأجيل...)"
                className="flex-1 h-9 text-sm"
              />
              <Button
                onClick={saveDayNote}
                disabled={savingNote || dayNote === savedDayNote}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                <Save className="h-4 w-4 ml-1" />
                حفظ الملاحظة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock Banner */}
      {isClassLocked && selectedClass && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-warning/40 bg-warning/10 p-4 animate-fade-in">
          <Lock className="h-6 w-6 text-warning shrink-0" />
          <div>
            <p className="font-semibold text-sm text-warning">تم الوصول للحد الأسبوعي</p>
            <p className="text-xs text-muted-foreground">
              اكتمل تحضير هذا الفصل ({selectedProgress?.sessions}/{selectedProgress?.limit} حصص). لإضافة حصص إضافية، فعّل "تجاوز القفل" من الإعدادات.
            </p>
          </div>
        </div>
      )}

      <AttendanceStats
        total={records.length}
        present={records.filter((r) => r.status === "present").length}
        absent={records.filter((r) => r.status === "absent").length}
        late={records.filter((r) => r.status === "late").length}
        earlyLeave={records.filter((r) => r.status === "early_leave").length}
        sickLeave={records.filter((r) => r.status === "sick_leave").length}
      />

      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="pt-6">
          {records.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title={selectedClass ? "لا يوجد طلاب في هذا الفصل" : "اختر فصلاً لبدء تسجيل الحضور"}
              description={selectedClass ? "تأكد من إضافة طلاب لهذا الفصل أولاً" : "حدد الفصل من القائمة أعلاه لعرض قائمة الطلاب وتسجيل حضورهم"}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <Button
                  size="sm"
                  onClick={markAllPresent}
                  disabled={isClassLocked}
                  className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  تحديد الكل حاضر
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecords((prev) => prev.map((r) => ({ ...r, status: "absent" as AttendanceStatus })))}
                  disabled={isClassLocked}
                  className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-4 w-4" />
                  تحديد الكل غائب
                </Button>
                <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="بحث عن طالب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs pr-8 backdrop-blur-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 mr-auto">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AttendanceStatus | "all")}>
                    <SelectTrigger className="w-40 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل ({records.length})</SelectItem>
                      {statusOptions.map((opt) => {
                        const count = records.filter((r) => r.status === opt.value).length;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl w-12">#</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطالب</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, i) => {
                      const idx = records.indexOf(record);
                      const isEven = i % 2 === 0;
                      const isLast = i === filteredRecords.length - 1;
                      return (
                      <tr
                        key={record.student_id}
                        className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20"
                        )}
                      >
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{idx + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{record.full_name}</td>
                        <td className="p-3 border-l border-border/10">
                          <div className="flex flex-wrap gap-1">
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => updateStatus(record.student_id, opt.value)}
                                className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                                  record.status === opt.value
                                    ? opt.color + " font-medium ring-1 ring-current/20 shadow-sm"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className={cn("p-3", isLast && "last:rounded-bl-xl")}>
                          <Textarea
                            value={record.notes}
                            onChange={(e) => updateNotes(record.student_id, e.target.value)}
                            placeholder="ملاحظات..."
                            className="min-h-[36px] h-9 resize-none text-xs"
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving || isClassLocked} className="shadow-md shadow-primary/20">
                  <Save className="h-4 w-4 ml-2" />
                  {isClassLocked ? "🔒 مغلق" : saving ? "جارٍ الحفظ..." : "حفظ الحضور"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
