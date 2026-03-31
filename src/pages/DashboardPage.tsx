import { useCallback, ReactNode } from "react";
import { safePrint } from "@/lib/print-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStatCards from "@/components/dashboard/DashboardStatCards";
import AttendanceOverview from "@/components/dashboard/AttendanceOverview";
import PeriodComparison from "@/components/dashboard/PeriodComparison";
import PerformanceDashboard from "@/components/dashboard/PerformanceDashboard";
import DashboardPrintView from "@/components/dashboard/DashboardPrintView";
import AcademicCalendarWidget from "@/components/dashboard/AcademicCalendarWidget";
import SmartDashboardSummary from "@/components/dashboard/SmartDashboardSummary";
import HonorRoll from "@/components/student/HonorRoll";
import SafeZoneCounter from "@/components/dashboard/SafeZoneCounter";
import WeekLessonsWidget from "@/components/dashboard/WeekLessonsWidget";
import DraggableWidget from "@/components/dashboard/DraggableWidget";
import { useDashboardOrder } from "@/hooks/useDashboardOrder";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import EmptyState from "@/components/EmptyState";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

async function fetchDashboardData() {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDayOfWeek = new Date().getDay();

  const [
    { data: studentsData },
    { data: classesData },
    { data: attendanceData },
    { data: settingsData },
    { data: schedulesData },
  ] = await Promise.all([
    supabase.from("students").select("id, class_id"),
    supabase.from("classes").select("id, name"),
    supabase.from("attendance_records").select("student_id, status, class_id").eq("date", today),
    supabase.from("site_settings").select("value").eq("id", "school_name").single(),
    supabase.from("class_schedules").select("class_id, days_of_week"),
  ]);

  const students = studentsData || [];
  const classes = classesData || [];
  const attendance = attendanceData || [];
  const schedules = schedulesData || [];

  const activeClassIds = new Set(
    schedules
      .filter((s) => Array.isArray(s.days_of_week) && s.days_of_week.includes(todayDayOfWeek))
      .map((s) => s.class_id)
  );

  const activeStudents = students.filter((s) => s.class_id && activeClassIds.has(s.class_id));

  const present = attendance.filter((r) => r.status === "present").length;
  const absent = attendance.filter((r) => r.status === "absent").length;
  const late = attendance.filter((r) => r.status === "late").length;
  const notRecorded = Math.max(0, activeStudents.length - attendance.length);

  const classMap: Record<string, ClassStats> = {};
  classes.forEach((c) => {
    classMap[c.id] = { name: c.name, present: 0, absent: 0, late: 0, total: 0 };
  });
  students.forEach((s) => {
    if (s.class_id && classMap[s.class_id]) classMap[s.class_id].total++;
  });
  attendance.forEach((a) => {
    if (a.class_id && classMap[a.class_id]) {
      if (a.status === "present") classMap[a.class_id].present++;
      else if (a.status === "absent") classMap[a.class_id].absent++;
      else if (a.status === "late") classMap[a.class_id].late++;
    }
  });

  return {
    totalStudents: students.length,
    totalClasses: classes.length,
    todayPresent: present,
    todayAbsent: absent,
    todayLate: late,
    todayNotRecorded: notRecorded,
    attendanceRate: activeStudents.length > 0 ? Math.round((present / activeStudents.length) * 100) : 0,
    classStats: Object.values(classMap).filter((c) => c.total > 0),
    schoolName: settingsData?.value || "نظام إدارة المدرسة",
  };
}

export default function DashboardPage() {
  const { role, user } = useAuth();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const {
    order,
    locked,
    draggedId,
    toggleLock,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetOrder,
  } = useDashboardOrder();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["dashboard-stats", format(new Date(), "yyyy-MM-dd")],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });

  const totalStudents = data?.totalStudents ?? 0;
  const totalClasses = data?.totalClasses ?? 0;
  const todayPresent = data?.todayPresent ?? 0;
  const todayAbsent = data?.todayAbsent ?? 0;
  const todayLate = data?.todayLate ?? 0;
  const todayNotRecorded = data?.todayNotRecorded ?? 0;
  const attendanceRate = data?.attendanceRate ?? 0;
  const classStats = data?.classStats ?? [];
  const schoolName = data?.schoolName ?? "نظام إدارة المدرسة";

  const handlePrint = useCallback(() => {
    safePrint();
  }, []);

  if (permsLoaded && !perms.can_view_dashboard && !perms.read_only_mode && role !== "admin") {
    return <EmptyState icon={Lock} title="لا تملك صلاحية عرض لوحة التحكم" description="تواصل مع المسؤول لتفعيل صلاحية عرض لوحة التحكم" />;
  }

  const widgetMap: Record<string, ReactNode> = {
    smartSummary: <SmartDashboardSummary />,
    attendanceAndComparison: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AttendanceOverview
          todayPresent={todayPresent}
          todayAbsent={todayAbsent}
          todayLate={todayLate}
          todayNotRecorded={todayNotRecorded}
          classStats={classStats}
        />
        <PeriodComparison />
        <SafeZoneCounter />
      </div>
    ),
    widgetGrid: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 auto-rows-[350px] [&>*]:flex [&>*]:flex-col [&>*]:overflow-hidden">
        <WeekLessonsWidget />
        <AcademicCalendarWidget />
      </div>
    ),
    honorRoll: <HonorRoll />,
    performanceDashboard: <PerformanceDashboard />,
  };

  const renderWidget = (id: string) => (
    <DraggableWidget
      key={id}
      id={id}
      locked={locked}
      isDragging={draggedId === id}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {widgetMap[id]}
    </DraggableWidget>
  );

  return (
    <div className="space-y-5">
      <DashboardHeader
        onPrint={handlePrint}
        locked={locked}
        onToggleLock={toggleLock}
        onResetOrder={resetOrder}
      />

      <DashboardStatCards
        totalStudents={totalStudents}
        totalClasses={totalClasses}
        todayPresent={todayPresent}
        todayAbsent={todayAbsent}
        todayLate={todayLate}
        attendanceRate={attendanceRate}
        loading={loading}
      />

      {order.map((id) => renderWidget(id))}

      <DashboardPrintView
        totalStudents={totalStudents}
        totalClasses={totalClasses}
        todayPresent={todayPresent}
        todayAbsent={todayAbsent}
        todayLate={todayLate}
        todayNotRecorded={todayNotRecorded}
        attendanceRate={attendanceRate}
        classStats={classStats}
        schoolName={schoolName}
      />
    </div>
  );
}
