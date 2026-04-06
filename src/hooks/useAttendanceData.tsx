import { useEffect, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";

export type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "sick_leave";

export interface StudentAttendance {
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  notes: string;
  existing_id?: string;
}

export const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "حاضر", color: "bg-success/10 text-success border-success/30" },
  { value: "absent", label: "غائب", color: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "late", label: "متأخر", color: "bg-warning/10 text-warning border-warning/30" },
  { value: "early_leave", label: "منصرف مبكرًا", color: "bg-muted text-muted-foreground border-border" },
  { value: "sick_leave", label: "إجازة مرضية", color: "bg-info/10 text-info border-info/30" },
];

export type WeeklyProgress = Record<string, { sessions: number; limit: number }>;

export interface AbsenceAlert {
  student_id: string;
  totalAbsent: number;
  allowedSessions: number;
  threshold: number;
  exceeded: boolean;
}

export function useAttendanceData() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const { calendarData, getWeekForDate } = useAcademicWeek();

  const [classesLoading, setClassesLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
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
  const [weeklyProgressLoaded, setWeeklyProgressLoaded] = useState(false);
  const [overrideLock, setOverrideLock] = useState(false);
  const [absenceAlerts, setAbsenceAlerts] = useState<Record<string, AbsenceAlert>>({});

  const date = format(selectedDate, "yyyy-MM-dd");

  const selectedProgress = selectedClass ? weeklyProgress[selectedClass] : null;
  const isClassLocked = useMemo(() => {
    if (!selectedProgress) return false;
    if (overrideLock) return false;
    const alreadySavedToday = records.some(r => r.existing_id);
    if (alreadySavedToday) return false;
    return selectedProgress.sessions >= selectedProgress.limit;
  }, [selectedProgress, overrideLock, records]);

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
    const sat = new Date(selectedDate);
    sat.setDate(sat.getDate() - ((sat.getDay() + 1) % 7));
    const fri = new Date(sat);
    fri.setDate(sat.getDate() + 6);
    return { start: format(sat, "yyyy-MM-dd"), end: format(fri, "yyyy-MM-dd") };
  }, [selectedDate, calendarData, getWeekForDate]);

  const loadWeeklyProgress = useCallback(async () => {
    setWeeklyProgressLoaded(false);
    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) { setWeeklyProgressLoaded(true); return; }

    const { data: schedules } = await supabase
      .from("class_schedules")
      .select("class_id, periods_per_week")
      .in("class_id", classIds);

    const limitsMap: Record<string, number> = {};
    (schedules || []).forEach(s => { limitsMap[s.class_id] = s.periods_per_week; });

    const { data: attRecords } = await supabase
      .from("attendance_records")
      .select("class_id, date")
      .in("class_id", classIds)
      .gte("date", weekBounds.start)
      .lte("date", weekBounds.end)
      .limit(5000);

    const sessionMap: Record<string, Set<string>> = {};
    (attRecords || []).forEach(r => {
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
    setWeeklyProgressLoaded(true);
  }, [classes, weekBounds]);

  const loadDayNote = useCallback(async () => {
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
  }, [selectedClass, date]);

  const saveDayNote = useCallback(async () => {
    if (!user || !selectedClass) return;
    setSavingNote(true);
    const { data: existing } = await supabase
      .from("attendance_schedule_exceptions")
      .select("id")
      .eq("class_id", selectedClass)
      .eq("original_date", date)
      .eq("type", "note")
      .maybeSingle();

    if (existing) {
      await supabase.from("attendance_schedule_exceptions").update({ reason: dayNote }).eq("id", existing.id);
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
  }, [user, selectedClass, date, dayNote, toast]);

  const loadAbsenceAlerts = useCallback(async () => {
    if (!selectedClass) return;
    const { data: settings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"]);

    let threshold = 20, allowedSessions = 0, mode = "percentage";
    (settings || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
    });

    const { data: students } = await supabase.from("students").select("id").eq("class_id", selectedClass);
    if (!students || students.length === 0) return;

    const studentIds = students.map(s => s.id);
    let allAtt: any[] = [];
    const batchSize = 500;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      const { data } = await supabase.from("attendance_records").select("student_id, status").in("student_id", batch).limit(5000);
      allAtt = allAtt.concat(data || []);
    }

    const alerts: Record<string, AbsenceAlert> = {};
    const studentAbsences: Record<string, { absent: number; total: number }> = {};
    allAtt.forEach((r: any) => {
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
        alerts[sid] = { student_id: sid, totalAbsent: data.absent, allowedSessions, threshold, exceeded };
      }
    });
    setAbsenceAlerts(alerts);
  }, [selectedClass]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    const [{ data: students }, { data: attendance }] = await Promise.all([
      supabase.from("students").select("id, full_name").eq("class_id", selectedClass).order("full_name"),
      supabase.from("attendance_records").select("id, student_id, status, notes").eq("class_id", selectedClass).eq("date", date),
    ]);
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
    setStudentsLoading(false);
  }, [selectedClass, date]);

  useEffect(() => {
    setClassesLoading(true);
    Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("site_settings").select("value").eq("id", "attendance_override_lock").maybeSingle(),
    ]).then(([{ data: cls }, { data: lockData }]) => {
      setClasses(cls || []);
      setOverrideLock(lockData?.value === "true");
      setClassesLoading(false);
    });
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    loadWeeklyProgress();
  }, [classes, weekBounds, loadWeeklyProgress]);

  useEffect(() => {
    if (!selectedClass) return;
    loadStudents();
    loadDayNote();
    loadAbsenceAlerts();
  }, [selectedClass, date, loadStudents, loadDayNote, loadAbsenceAlerts]);

  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  }, []);

  const updateNotes = useCallback((studentId: string, notes: string) => {
    setRecords((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, notes } : r)));
  }, []);

  const markAllPresent = useCallback(() => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" as AttendanceStatus })));
  }, []);

  const markAllAbsent = useCallback(() => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "absent" as AttendanceStatus })));
  }, []);

  const handleMoveSession = useCallback(async () => {
    if (!user || !selectedClass || records.length === 0) return;
    const newDate = format(moveTargetDate, "yyyy-MM-dd");
    if (newDate === date) return;
    setMovingDate(true);
    let query = supabase.from("attendance_records").update({ date: newDate }).eq("class_id", selectedClass).eq("date", date);
    if (role !== "admin") query = query.eq("recorded_by", user.id);
    const { error } = await query.select("id");
    if (error) {
      const msg = error.message?.includes("row-level security")
        ? "لا يمكنك نقل سجلات ليست من تسجيلك أو في تاريخ سابق"
        : "فشل نقل الحصة";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } else {
      toast({ title: "تم النقل", description: `تم نقل حصة التحضير إلى ${newDate}` });
      setSelectedDate(moveTargetDate);
    }
    setMovingDate(false);
    setMoveConfirmOpen(false);
  }, [user, selectedClass, records, moveTargetDate, date, role, toast]);

  const handleSave = useCallback(async () => {
    if (!user || !selectedClass) return;
    setSaving(true);
    try {
      const toUpdate = records.filter((r) => r.existing_id);
      const toInsert = records.filter((r) => !r.existing_id);
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((record) =>
            supabase.from("attendance_records").update({ status: record.status, notes: record.notes }).eq("id", record.existing_id!)
              .then(({ error }) => { if (error) throw new Error(error.message || "فشل تحديث سجل الحضور"); })
          )
        );
      }
      if (toInsert.length > 0) {
        const { error } = await supabase.from("attendance_records").insert(
          toInsert.map((r) => ({
            student_id: r.student_id, class_id: selectedClass, date, status: r.status, notes: r.notes, recorded_by: user.id,
          }))
        );
        if (error) throw new Error(error.message || "فشل إدخال سجلات الحضور");
      }
      toast({ title: "تم الحفظ", description: "تم حفظ سجلات الحضور بنجاح" });
      loadStudents();
      loadWeeklyProgress();
    } catch (err: any) {
      toast({ title: "فشل حفظ الحضور", description: err?.message || "حدث خطأ غير متوقع أثناء الحفظ.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, selectedClass, records, date, toast, loadStudents, loadWeeklyProgress]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) result = result.filter((r) => r.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return result;
  }, [records, statusFilter, searchQuery]);

  const isViewOnly = !perms.can_manage_attendance || perms.read_only_mode;

  return {
    user, role, perms, permsLoaded,
    classesLoading, classes, selectedClass, setSelectedClass,
    studentsLoading, records, setRecords, saving,
    selectedDate, setSelectedDate, date,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    dayNote, setDayNote, savedDayNote, savingNote, saveDayNote,
    moveDialogOpen, setMoveDialogOpen, moveConfirmOpen, setMoveConfirmOpen,
    moveTargetDate, setMoveTargetDate, movingDate, handleMoveSession,
    weeklyProgress, weeklyProgressLoaded, overrideLock,
    absenceAlerts, selectedProgress, isClassLocked,
    filteredRecords, isViewOnly,
    updateStatus, updateNotes, markAllPresent, markAllAbsent, handleSave,
    toast,
  };
}
