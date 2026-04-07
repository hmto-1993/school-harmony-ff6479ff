export interface ClassSummary {
  id: string;
  name: string;
  grade: string;
  section: string;
  studentCount: number;
  students: { id: string; full_name: string }[];
  attendance: { present: number; absent: number; late: number; total: number; notRecorded: number };
  grades: any[];
  manualScores: any[];
  lessonPlans: { total: number; completed: number };
  behavior: { positive: number; negative: number };
  totalAbsences: number;
  topAbsentees: { name: string; count: number }[];
}

export interface AttendanceReportDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface WeeklyAttendanceRecord {
  student_id: string;
  status: string;
  class_id: string;
  date: string;
}

export interface SharedData {
  teacherName: string;
  schoolName: string;
  expiresAt: string;
  canPrint: boolean;
  canExport: boolean;
  label: string;
  totalStudents: number;
  attendanceRate: number;
  classes: ClassSummary[];
  categories: any[];
  attendanceReport: AttendanceReportDay[];
  viewCount: number;
  weeklyAttendance: WeeklyAttendanceRecord[];
  academicCalendar: { start_date: string; total_weeks: number; semester: string } | null;
  classSchedules: { class_id: string; periods_per_week: number; days_of_week: number[] }[];
}

export const TABS = [
  { id: "overview", label: "نظرة عامة", icon: "BarChart3" },
  { id: "attendance", label: "الحضور", icon: "UserCheck" },
  { id: "weekly", label: "الأسبوعي", icon: "CalendarDays" },
  { id: "grades", label: "الدرجات", icon: "BookOpen" },
  { id: "reports", label: "التقارير", icon: "FileBarChart" },
  { id: "lessons", label: "خطط الدروس", icon: "Clock" },
] as const;
