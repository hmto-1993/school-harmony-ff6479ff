import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, BookOpen, UserCheck, Clock, FileText, AlertTriangle, Eye, Shield, FileBarChart, TrendingDown, CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createArabicPDF, getArabicTableStyles, finalizePDF } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";

// ============ Types ============
interface ClassSummary {
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

interface AttendanceReportDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface WeeklyAttendanceRecord {
  student_id: string;
  status: string;
  class_id: string;
  date: string;
}

interface SharedData {
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

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: BarChart3 },
  { id: "attendance", label: "الحضور", icon: UserCheck },
  { id: "weekly", label: "الأسبوعي", icon: CalendarDays },
  { id: "grades", label: "الدرجات", icon: BookOpen },
  { id: "reports", label: "التقارير", icon: FileBarChart },
  { id: "lessons", label: "خطط الدروس", icon: Clock },
] as const;

export default function SharedViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [exporting, setExporting] = useState(false);

  const exportPDF = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { doc, startY, watermark } = await createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const tableStyles = getArabicTableStyles();
      const today = format(new Date(), "yyyy/MM/dd");

      doc.setFontSize(16);
      doc.text(`عرض أعمال: ${data.teacherName}`, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(10);
      doc.text(today, pageWidth / 2, startY + 7, { align: "center" });

      // --- Overview ---
      let curY = startY + 15;
      doc.setFontSize(13);
      doc.text("ملخص عام", pageWidth / 2, curY, { align: "center" });

      const overviewRows = data.classes.map(cls => [
        `${cls.lessonPlans.completed}/${cls.lessonPlans.total}`,
        String(cls.behavior.negative),
        String(cls.behavior.positive),
        String(cls.attendance.late),
        String(cls.attendance.absent),
        String(cls.attendance.present),
        String(cls.studentCount),
        cls.name,
      ]);

      autoTable(doc, {
        startY: curY + 4,
        head: [["خطط الدروس", "سلوك سلبي", "سلوك إيجابي", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"].reverse().reverse()],
        body: overviewRows,
        ...tableStyles,
      });

      // --- Attendance ---
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.text("تفاصيل الحضور اليوم", pageWidth / 2, 15, { align: "center" });

      const attRows = data.classes.map(cls => {
        const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
        return [
          `${rate}%`,
          String(cls.attendance.notRecorded),
          String(cls.attendance.late),
          String(cls.attendance.absent),
          String(cls.attendance.present),
          String(cls.studentCount),
          cls.name,
        ];
      });

      autoTable(doc, {
        startY: 20,
        head: [["النسبة", "لم يُسجل", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"]],
        body: attRows,
        ...tableStyles,
      });

      // --- Grades per class ---
      const categories = data.categories || [];
      data.classes.forEach(cls => {
        doc.addPage("a4", "landscape");
        doc.setFontSize(13);
        doc.text(`درجات: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null)
          .sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 8);

        const gradesByStudent: Record<string, Record<string, { sum: number; count: number }>> = {};
        cls.students.forEach(s => { gradesByStudent[s.id] = {}; });
        cls.grades.forEach((g: any) => {
          if (!gradesByStudent[g.student_id]) return;
          if (!gradesByStudent[g.student_id][g.category_id]) gradesByStudent[g.student_id][g.category_id] = { sum: 0, count: 0 };
          if (g.score !== null) {
            gradesByStudent[g.student_id][g.category_id].sum += Number(g.score);
            gradesByStudent[g.student_id][g.category_id].count++;
          }
        });
        cls.manualScores.forEach((m: any) => {
          if (!gradesByStudent[m.student_id]) return;
          gradesByStudent[m.student_id][m.category_id] = { sum: Number(m.score), count: 1 };
        });

        const headers = ["الطالب", ...classCategories.map((c: any) => c.name)];
        const rows = cls.students.map(s => {
          const row = [s.full_name];
          classCategories.forEach((cat: any) => {
            const entry = gradesByStudent[s.id]?.[cat.id];
            row.push(entry && entry.count > 0 ? String(Math.round(entry.sum / entry.count)) : "—");
          });
          return row.reverse();
        });

        autoTable(doc, {
          startY: 20,
          head: [[...headers].reverse()],
          body: rows,
          ...tableStyles,
          styles: { ...tableStyles.styles, fontSize: 8 },
        });
      });

      // --- Lessons ---
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.text("خطط الدروس", pageWidth / 2, 15, { align: "center" });

      const lessonRows = data.classes.map(cls => {
        const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
        return [
          `${pct}%`,
          String(cls.lessonPlans.completed),
          String(cls.lessonPlans.total),
          cls.name,
        ];
      });

      autoTable(doc, {
        startY: 20,
        head: [["نسبة الإنجاز", "المنجز", "الإجمالي", "الفصل"]],
        body: lessonRows,
        ...tableStyles,
      });

      finalizePDF(doc, `shared-report_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير التقرير بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    }
    setExporting(false);
  }, [data]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    supabase.functions.invoke("get-shared-data", { body: { token } }).then(({ data: res, error: err }) => {
      if (err || res?.error) {
        setError(res?.error || "حدث خطأ في تحميل البيانات");
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-red-600">{error}</h1>
          <p className="text-gray-500">تأكد من صحة الرابط أو تواصل مع المعلم للحصول على رابط جديد</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const expiryDate = new Date(data.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 print:bg-white" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 print:static">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {data.schoolName && <p className="text-sm text-slate-500 font-medium">{data.schoolName}</p>}
              <h1 className="text-xl font-bold text-slate-800">عرض أعمال: {data.teacherName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  <Eye className="h-3 w-3" /> عرض فقط
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  <Shield className="h-3 w-3" /> متبقي {daysLeft} يوم
                </span>
                {data.viewCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <Eye className="h-3 w-3" /> {data.viewCount} مشاهدة
                  </span>
                )}
                {data.label && <span className="text-xs text-slate-400">{data.label}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {data.canPrint && (
                <button onClick={() => safePrint()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700">
                  <Printer className="h-4 w-4" /> طباعة
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
          <StatCard label="الفصول" value={data.classes.length} icon={Users} color="blue" />
          <StatCard label="الطلاب" value={data.totalStudents} icon={Users} color="indigo" />
          <StatCard label="نسبة الحضور اليوم" value={`${data.attendanceRate}%`} icon={UserCheck} color="emerald" />
          <StatCard
            label="خطط الدروس"
            value={(() => {
              const t = data.classes.reduce((a, c) => a + c.lessonPlans.total, 0);
              const d = data.classes.reduce((a, c) => a + c.lessonPlans.completed, 0);
              return t > 0 ? `${Math.round((d / t) * 100)}%` : "—";
            })()}
            icon={BookOpen}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content - keep all mounted, hide inactive with CSS to preserve state */}
        <div className="print:hidden">
          <div className={activeTab === "overview" ? "" : "hidden"}><OverviewTab data={data} /></div>
          <div className={activeTab === "attendance" ? "" : "hidden"}><AttendanceTab classes={data.classes} /></div>
          <div className={activeTab === "weekly" ? "" : "hidden"}><WeeklyAttendanceTab data={data} /></div>
          <div className={activeTab === "grades" ? "" : "hidden"}><GradesTab classes={data.classes} categories={data.categories} /></div>
          <div className={activeTab === "reports" ? "" : "hidden"}><ReportsTab data={data} /></div>
          <div className={activeTab === "lessons" ? "" : "hidden"}><LessonsTab classes={data.classes} /></div>
        </div>

        {/* Print: show all */}
        <div className="hidden print:block space-y-8">
          <OverviewTab data={data} />
          <AttendanceTab classes={data.classes} />
          <WeeklyAttendanceTab data={data} isPrint />
          <GradesTab classes={data.classes} categories={data.categories} isPrint />
          <ReportsTab data={data} />
          <LessonsTab classes={data.classes} />
        </div>
      </main>
    </div>
  );
}

// ============ Shared Components ============

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-center", colors[color] || colors.blue)}>
      <Icon className="h-6 w-6 mx-auto mb-2 opacity-70" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-70 mt-1">{label}</div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold", valueColor || "text-slate-800")}>{value}</span>
    </div>
  );
}

// ============ Overview Tab ============

function OverviewTab({ data }: { data: SharedData }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">ملخص الفصول</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-3">{cls.name}</h3>
            <div className="space-y-2 text-sm">
              <Row label="عدد الطلاب" value={cls.studentCount} />
              <Row label="حاضرون اليوم" value={cls.attendance.present} valueColor="text-emerald-600" />
              <Row label="غائبون" value={cls.attendance.absent} valueColor="text-red-500" />
              <Row label="متأخرون" value={cls.attendance.late} valueColor="text-amber-500" />
              <div className="border-t pt-2 mt-2">
                <Row label="خطط الدروس" value={`${cls.lessonPlans.completed}/${cls.lessonPlans.total}`} />
                <Row label="سلوك إيجابي" value={cls.behavior.positive} valueColor="text-emerald-600" />
                <Row label="سلوك سلبي" value={cls.behavior.negative} valueColor="text-red-500" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Attendance Tab ============

function AttendanceTab({ classes }: { classes: ClassSummary[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">تفاصيل الحضور اليوم</h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">الفصل</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">الطلاب</th>
              <th className="text-center px-4 py-3 font-semibold text-emerald-600">حاضر</th>
              <th className="text-center px-4 py-3 font-semibold text-red-500">غائب</th>
              <th className="text-center px-4 py-3 font-semibold text-amber-500">متأخر</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-400">لم يُسجل</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">النسبة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((cls) => {
              const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
              return (
                <tr key={cls.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{cls.name}</td>
                  <td className="text-center px-4 py-3">{cls.studentCount}</td>
                  <td className="text-center px-4 py-3 text-emerald-600 font-semibold">{cls.attendance.present}</td>
                  <td className="text-center px-4 py-3 text-red-500 font-semibold">{cls.attendance.absent}</td>
                  <td className="text-center px-4 py-3 text-amber-500 font-semibold">{cls.attendance.late}</td>
                  <td className="text-center px-4 py-3 text-slate-400">{cls.attendance.notRecorded}</td>
                  <td className="text-center px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                      {rate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {classes.map((cls) => (
        <details key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <summary className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">{cls.name} — قائمة الطلاب</summary>
          <div className="px-4 pb-3 text-sm text-slate-500">
            <p>عدد الطلاب: {cls.studentCount} | حاضر: {cls.attendance.present} | غائب: {cls.attendance.absent}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

// ============ Grades Tab (collapsible classes) ============

function GradesTab({ classes, categories, isPrint }: { classes: ClassSummary[]; categories: any[]; isPrint?: boolean }) {
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">ملخص الدرجات</h2>
      {classes.map((cls) => {
        const isExpanded = isPrint || expandedClasses[cls.id] || false;
        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
        const gradesByStudent: Record<string, Record<string, { sum: number; count: number }>> = {};

        cls.students.forEach((s) => {
          gradesByStudent[s.id] = {};
        });

        cls.grades.forEach((g: any) => {
          if (!gradesByStudent[g.student_id]) return;
          const catId = g.category_id;
          if (!gradesByStudent[g.student_id][catId]) gradesByStudent[g.student_id][catId] = { sum: 0, count: 0 };
          if (g.score !== null) {
            gradesByStudent[g.student_id][catId].sum += Number(g.score);
            gradesByStudent[g.student_id][catId].count++;
          }
        });

        cls.manualScores.forEach((m: any) => {
          if (!gradesByStudent[m.student_id]) return;
          gradesByStudent[m.student_id][m.category_id] = { sum: Number(m.score), count: 1 };
        });

        const sortedCats = classCategories.sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 6);

        return (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleClass(cls.id)}
              className="w-full px-4 py-3 bg-slate-50 border-b font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <span>{cls.name} ({cls.studentCount} طالب)</span>
              <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right px-3 py-2 text-slate-600 font-semibold">الطالب</th>
                      {sortedCats.map((cat: any) => (
                        <th key={cat.id} className="text-center px-2 py-2 text-slate-500 font-medium text-xs max-w-[80px] truncate" title={cat.name}>
                          {cat.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {cls.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{s.full_name}</td>
                        {sortedCats.map((cat: any) => {
                          const entry = gradesByStudent[s.id]?.[cat.id];
                          const avg = entry && entry.count > 0 ? Math.round(entry.sum / entry.count) : null;
                          return (
                            <td key={cat.id} className="text-center px-2 py-2">
                              {avg !== null ? (
                                <span className={cn("text-xs font-semibold", avg >= cat.max_score * 0.8 ? "text-emerald-600" : avg >= cat.max_score * 0.5 ? "text-amber-600" : "text-red-500")}>
                                  {avg}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ Weekly Attendance Tab ============

const STATUS_COLORS: Record<string, string> = {
  present: "#4caf50",
  absent: "#e53935",
  late: "#fbc02d",
  sick_leave: "#1e88e5",
  early_leave: "#1e88e5",
};

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  sick_leave: "مستأذن",
  early_leave: "خروج مبكر",
};

function getWeekNum(dateStr: string, startDate: string): number {
  const d = new Date(dateStr);
  const s = new Date(startDate);
  const diff = Math.floor((d.getTime() - s.getTime()) / 86400000);
  return Math.floor(diff / 7) + 1;
}

function getCurrentWeekNum(startDate: string): number {
  return getWeekNum(new Date().toISOString().split("T")[0], startDate);
}

function WeeklyAttendanceTab({ data, isPrint }: { data: SharedData; isPrint?: boolean }) {
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id || "");
  const [weekFilter, setWeekFilter] = useState<"current" | "all">("current");
  const cal = data.academicCalendar;

  const currentWeek = cal ? getCurrentWeekNum(cal.start_date) : 1;

  const weeklyData = useMemo(() => {
    if (!cal || !selectedClassId) return null;

    const cls = data.classes.find(c => c.id === selectedClassId);
    if (!cls) return null;

    const classRecords = data.weeklyAttendance.filter(r => r.class_id === selectedClassId);
    const schedule = data.classSchedules.find(s => s.class_id === selectedClassId);
    const periodsPerWeek = schedule?.periods_per_week || 5;

    // Build weeks
    const weekDatesMap: Record<number, string[]> = {};
    classRecords.forEach(r => {
      const wk = getWeekNum(r.date, cal.start_date);
      if (wk < 1 || wk > cal.total_weeks) return;
      if (!weekDatesMap[wk]) weekDatesMap[wk] = [];
      if (!weekDatesMap[wk].includes(r.date)) weekDatesMap[wk].push(r.date);
    });

    const allWeeks: { weekNum: number; dates: string[] }[] = [];
    for (let w = 1; w <= cal.total_weeks; w++) {
      allWeeks.push({ weekNum: w, dates: (weekDatesMap[w] || []).sort() });
    }

    // Filter weeks based on selection
    const showAll = isPrint || weekFilter === "all";
    const weeks = showAll ? allWeeks : allWeeks.filter(w => w.weekNum === currentWeek);

    // Build student rows
    const studentRows = cls.students.map(s => {
      const studentRecords = classRecords.filter(r => r.student_id === s.id);
      const weekStatuses: Record<number, string[]> = {};
      let totalAbsent = 0;
      let totalLate = 0;

      studentRecords.forEach(r => {
        const wk = getWeekNum(r.date, cal.start_date);
        if (wk < 1 || wk > cal.total_weeks) return;
        if (!weekStatuses[wk]) weekStatuses[wk] = [];
        weekStatuses[wk].push(r.status);
        if (r.status === 'absent') totalAbsent++;
        if (r.status === 'late') totalLate++;
      });

      return {
        id: s.id,
        name: s.full_name,
        weekStatuses,
        totalAbsent,
        totalLate,
        isAtRisk: totalAbsent >= 3,
      };
    });

    return { weeks, studentRows, periodsPerWeek };
  }, [data, selectedClassId, cal, weekFilter, isPrint, currentWeek]);

  if (!cal) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">لا يوجد تقويم أكاديمي محدد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800">تقرير الحضور الأسبوعي</h2>
        <div className="flex gap-2 flex-wrap">
          {/* Week filter */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setWeekFilter("current")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "current"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              الأسبوع الحالي (ع{currentWeek})
            </button>
            <button
              onClick={() => setWeekFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "all"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              جميع الأسابيع
            </button>
          </div>
          {/* Class filter */}
          {data.classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                selectedClassId === cls.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[key] }} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {weeklyData && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 sticky right-0 bg-slate-50 z-10 min-w-[120px]">الطالب</th>
                  {weeklyData.weeks.map(w => (
                    <th key={w.weekNum} className={cn("text-center px-1 py-2 font-medium min-w-[36px]", w.weekNum === currentWeek ? "text-blue-600 bg-blue-50/50" : "text-slate-500")}>
                      <div className="writing-mode-vertical text-[10px]">ع{w.weekNum}</div>
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold text-red-500 min-w-[40px]">غ</th>
                  <th className="text-center px-2 py-2 font-semibold text-amber-500 min-w-[40px]">تأخر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weeklyData.studentRows.map((student) => (
                  <tr key={student.id} className={cn("hover:bg-slate-50/50", student.isAtRisk && "bg-red-50/30")}>
                    <td className="px-3 py-1.5 font-medium text-slate-800 whitespace-nowrap sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-1">
                        {student.isAtRisk && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        <span className="truncate max-w-[100px]">{student.name}</span>
                      </div>
                    </td>
                    {weeklyData.weeks.map(w => {
                      const statuses = student.weekStatuses[w.weekNum] || [];
                      return (
                        <td key={w.weekNum} className={cn("text-center px-0.5 py-1", w.weekNum === currentWeek && "bg-blue-50/30")}>
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {statuses.length === 0 ? (
                              <span className="text-slate-200">·</span>
                            ) : (
                              statuses.map((s, i) => (
                                <span
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{ backgroundColor: STATUS_COLORS[s] || '#ccc' }}
                                  title={STATUS_LABELS[s] || s}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-1.5 font-bold text-red-500">{student.totalAbsent || '—'}</td>
                    <td className="text-center px-2 py-1.5 font-bold text-amber-500">{student.totalLate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Reports Tab ============

function ReportsTab({ data }: { data: SharedData }) {
  const totalAbsences = data.classes.reduce((a, c) => a + c.totalAbsences, 0);
  const totalBehaviorPositive = data.classes.reduce((a, c) => a + c.behavior.positive, 0);
  const totalBehaviorNegative = data.classes.reduce((a, c) => a + c.behavior.negative, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">التقارير والإحصائيات</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="إجمالي الغياب (30 يوم)" value={totalAbsences} icon={TrendingDown} color="red" />
        <StatCard label="سلوك إيجابي" value={totalBehaviorPositive} icon={UserCheck} color="emerald" />
        <StatCard label="سلوك سلبي" value={totalBehaviorNegative} icon={AlertTriangle} color="amber" />
        <StatCard label="عدد المشاهدات" value={data.viewCount} icon={Eye} color="blue" />
      </div>

      {/* Attendance trend chart (simple bar) */}
      {data.attendanceReport.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">اتجاه الحضور (آخر 30 يوم)</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {data.attendanceReport.slice(0, 30).reverse().map((day) => {
                const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${rate}%`}>
                    <span className="text-[9px] text-slate-400 font-medium">{rate}%</span>
                    <div className="w-full rounded-t" style={{
                      height: `${rate}%`,
                      backgroundColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
                      minHeight: '2px',
                    }} />
                    <span className="text-[8px] text-slate-400 -rotate-45 origin-center whitespace-nowrap">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top absentees per class */}
      {data.classes.map((cls) => (
        cls.topAbsentees.length > 0 && (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3">{cls.name} — الأكثر غياباً</h3>
            <div className="space-y-2">
              {cls.topAbsentees.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{s.name}</span>
                  <span className="text-red-500 font-bold">{s.count} غياب</span>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {/* Attendance daily report table */}
      {data.attendanceReport.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b font-bold text-slate-700">سجل الحضور اليومي</div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600">التاريخ</th>
                  <th className="text-center px-4 py-2 font-semibold text-emerald-600">حاضر</th>
                  <th className="text-center px-4 py-2 font-semibold text-red-500">غائب</th>
                  <th className="text-center px-4 py-2 font-semibold text-amber-500">متأخر</th>
                  <th className="text-center px-4 py-2 font-semibold text-slate-600">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.attendanceReport.map((day) => {
                  const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                  return (
                    <tr key={day.date} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-medium text-slate-800">{day.date}</td>
                      <td className="text-center px-4 py-2 text-emerald-600 font-semibold">{day.present}</td>
                      <td className="text-center px-4 py-2 text-red-500 font-semibold">{day.absent}</td>
                      <td className="text-center px-4 py-2 text-amber-500 font-semibold">{day.late}</td>
                      <td className="text-center px-4 py-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Lessons Tab ============

function LessonsTab({ classes }: { classes: ClassSummary[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">خطط الدروس</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => {
          const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
          return (
            <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3">{cls.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">الإنجاز</span>
                  <span className="font-bold text-slate-800">{cls.lessonPlans.completed}/{cls.lessonPlans.total}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-center text-lg font-bold" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
