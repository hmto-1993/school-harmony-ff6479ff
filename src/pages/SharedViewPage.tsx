import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, BookOpen, UserCheck, Clock, Printer, FileDown, AlertTriangle, Eye, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { safePrint } from "@/lib/print-utils";

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
}

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: BarChart3 },
  { id: "attendance", label: "الحضور", icon: UserCheck },
  { id: "grades", label: "الدرجات", icon: BookOpen },
  { id: "lessons", label: "خطط الدروس", icon: Clock },
] as const;

export default function SharedViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "attendance" && <AttendanceTab classes={data.classes} />}
        {activeTab === "grades" && <GradesTab classes={data.classes} categories={data.categories} />}
        {activeTab === "lessons" && <LessonsTab classes={data.classes} />}

        {/* Print: show all */}
        <div className="hidden print:block space-y-8">
          <OverviewTab data={data} />
          <AttendanceTab classes={data.classes} />
          <GradesTab classes={data.classes} categories={data.categories} />
          <LessonsTab classes={data.classes} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-center", colors[color] || colors.blue)}>
      <Icon className="h-6 w-6 mx-auto mb-2 opacity-70" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-70 mt-1">{label}</div>
    </div>
  );
}

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

function Row({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold", valueColor || "text-slate-800")}>{value}</span>
    </div>
  );
}

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

      {/* Per-class student attendance */}
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

function GradesTab({ classes, categories }: { classes: ClassSummary[]; categories: any[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">ملخص الدرجات</h2>
      {classes.map((cls) => {
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

        // Also include manual scores
        cls.manualScores.forEach((m: any) => {
          if (!gradesByStudent[m.student_id]) return;
          gradesByStudent[m.student_id][m.category_id] = { sum: Number(m.score), count: 1 };
        });

        const sortedCats = classCategories.sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 6);

        return (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 border-b font-bold text-slate-700">{cls.name}</div>
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
          </div>
        );
      })}
    </div>
  );
}

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
