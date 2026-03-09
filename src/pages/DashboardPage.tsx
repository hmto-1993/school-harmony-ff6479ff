import { useEffect, useState, useCallback } from "react";
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

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [todayPresent, setTodayPresent] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);
  const [todayLate, setTodayLate] = useState(0);
  const [todayNotRecorded, setTodayNotRecorded] = useState(0);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("نظام إدارة المدرسة");

  useEffect(() => {
    fetchAll();
    supabase.from("site_settings").select("value").eq("id", "school_name").single().then(({ data }) => {
      if (data?.value) setSchoolName(data.value);
    });
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    const [
      { data: studentsData },
      { data: classesData },
      { data: attendanceData },
    ] = await Promise.all([
      supabase.from("students").select("id, class_id"),
      supabase.from("classes").select("id, name"),
      supabase.from("attendance_records").select("student_id, status, class_id").eq("date", today),
    ]);

    const students = studentsData || [];
    const classes = classesData || [];
    const attendance = attendanceData || [];

    setTotalStudents(students.length);
    setTotalClasses(classes.length);

    const present = attendance.filter((r) => r.status === "present").length;
    const absent = attendance.filter((r) => r.status === "absent").length;
    const late = attendance.filter((r) => r.status === "late").length;
    const recorded = attendance.length;
    const notRecorded = students.length - recorded;

    setTodayPresent(present);
    setTodayAbsent(absent);
    setTodayLate(late);
    setTodayNotRecorded(notRecorded > 0 ? notRecorded : 0);
    setAttendanceRate(students.length > 0 ? Math.round((present / students.length) * 100) : 0);

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
    setClassStats(Object.values(classMap).filter((c) => c.total > 0));
    setLoading(false);
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-8">
      <DashboardHeader onPrint={handlePrint} />

      <DashboardStatCards
        totalStudents={totalStudents}
        totalClasses={totalClasses}
        todayPresent={todayPresent}
        todayAbsent={todayAbsent}
        todayLate={todayLate}
        attendanceRate={attendanceRate}
        loading={loading}
      />

      <SmartDashboardSummary />

      <AttendanceOverview
        todayPresent={todayPresent}
        todayAbsent={todayAbsent}
        todayLate={todayLate}
        todayNotRecorded={todayNotRecorded}
        classStats={classStats}
      />

      {/* Honor Roll Section */}
      <HonorRoll />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PeriodComparison />
        </div>
        <div className="space-y-6">
          <AcademicCalendarWidget />
          <SafeZoneCounter />
        </div>
      </div>
      <PerformanceDashboard />

      {/* Print-only view */}
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
