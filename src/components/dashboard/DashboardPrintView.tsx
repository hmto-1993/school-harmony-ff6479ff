import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import PrintWatermark from "@/components/shared/PrintWatermark";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { resolveLogoSrc } from "@/lib/default-logos";

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Props {
  totalStudents: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayNotRecorded: number;
  attendanceRate: number;
  classStats: ClassStats[];
  schoolName?: string;
}

/** Reusable header renderer */
function PrintHeader({ config, schoolName, today, dayName }: { config: PrintHeaderConfig | null; schoolName: string; today: string; dayName: string }) {
  if (config) {
    return (
      <div style={{ borderBottom: "3px solid #3b82f6", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div style={{ maxWidth: "40%", textAlign: "center", fontSize: `${config.rightSection.fontSize}px`, lineHeight: 1.8, color: config.rightSection.color || "#1e293b" }}>
          {config.rightSection.lines.map((line, i) => (
            <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {config.centerSection.images.map((img, i) => {
            const src = resolveLogoSrc(i, img);
            if (!src) return null;
            return (
              <img key={i} src={src} alt="" style={{ width: `${config.centerSection.imagesSizes[i] || 60}px`, height: `${config.centerSection.imagesSizes[i] || 60}px`, objectFit: "contain" }} />
            );
          })}
        </div>
        <div style={{ maxWidth: "40%", textAlign: "center", fontSize: `${config.leftSection.fontSize}px`, lineHeight: 1.8, color: config.leftSection.color || "#1e293b" }}>
          {config.leftSection.lines.map((line, i) => (
            <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ borderBottom: "3px solid #3b82f6", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1e293b" }}>{schoolName}</h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>تقرير لوحة التحكم اليومي</p>
      </div>
      <div style={{ textAlign: "left" }}>
        <p style={{ fontSize: "13px", fontWeight: 600 }}>{dayName}</p>
        <p style={{ fontSize: "12px", color: "#64748b" }}>{today}</p>
      </div>
    </div>
  );
}

export default function DashboardPrintView({
  totalStudents, totalClasses, todayPresent, todayAbsent, todayLate, todayNotRecorded, attendanceRate, classStats, schoolName = "نظام إدارة المدرسة",
}: Props) {
  const today = format(new Date(), "yyyy/MM/dd");
  const dayName = new Date().toLocaleDateString("ar-SA", { weekday: "long" });

  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);
  const { getWeeksInfo, currentWeek } = useAcademicWeek();
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
      const parsed = await fetchScopedPrintHeader();
      if (parsed) setHeaderConfig(parsed);

      // Fetch lesson plans for current week
      if (currentWeek) {
        const { data: plans } = await supabase.from("lesson_plans").select("*").eq("week_number", currentWeek).eq("is_completed", false).order("day_index").order("slot_index");
        setLessonPlans(plans || []);
      }

      const { data: cls } = await supabase.from("classes").select("id, name");
      if (cls) {
        const map: Record<string, string> = {};
        cls.forEach(c => { map[c.id] = c.name; });
        setClassesMap(map);
      }
    })();
  }, [currentWeek]);

  const statItems = [
    { label: "إجمالي الطلاب", value: totalStudents, color: "#3b82f6" },
    { label: "عدد الفصول", value: totalClasses, color: "#8b5cf6" },
    { label: "الحضور", value: todayPresent, color: "#10b981" },
    { label: "الغياب", value: todayAbsent, color: "#ef4444" },
    { label: "المتأخرون", value: todayLate, color: "#f59e0b" },
    { label: "نسبة الحضور", value: `${attendanceRate}%`, color: "#3b82f6" },
  ];

  const weeksInfo = getWeeksInfo();
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

  const baseStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    color: "#1e293b",
    fontSize: "12px",
    lineHeight: 1.6,
  };

  return (
    <div className="print-area hidden print:block" dir="rtl" style={baseStyle}>
      <PrintWatermark />

      {/* ========== PAGE 1: Attendance ========== */}
      <div style={{ pageBreakAfter: "always" }}>
        <PrintHeader config={headerConfig} schoolName={schoolName} today={today} dayName={dayName} />

        <h2 style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", margin: "0 0 16px", color: "#1e293b" }}>
          📊 تقرير الحضور اليومي — {dayName} {today}
        </h2>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "20px" }}>
          {statItems.map((item) => (
            <div key={item.label} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 8px", textAlign: "center", borderTop: `3px solid ${item.color}` }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
              <p style={{ fontSize: "10px", color: "#64748b", margin: "4px 0 0" }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Attendance Bar */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: "12px", borderRadius: "6px", background: "#e2e8f0", overflow: "hidden", display: "flex" }}>
                {todayPresent > 0 && <div style={{ width: `${(todayPresent / totalStudents) * 100}%`, background: "#10b981", height: "100%" }} />}
                {todayLate > 0 && <div style={{ width: `${(todayLate / totalStudents) * 100}%`, background: "#f59e0b", height: "100%" }} />}
                {todayAbsent > 0 && <div style={{ width: `${(todayAbsent / totalStudents) * 100}%`, background: "#ef4444", height: "100%" }} />}
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "10px" }}>
                <span>🟢 حاضر: {todayPresent}</span>
                <span>🟡 متأخر: {todayLate}</span>
                <span>🔴 غائب: {todayAbsent}</span>
                <span>⚪ لم يُسجل: {todayNotRecorded}</span>
              </div>
            </div>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: `4px solid ${attendanceRate >= 80 ? "#10b981" : attendanceRate >= 50 ? "#f59e0b" : "#ef4444"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "18px", fontWeight: 800 }}>{attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* Class Summary Table */}
        {classStats.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>📋 ملخص الفصول</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>الفصل</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>الطلاب</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#10b981" }}>حاضر</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#ef4444" }}>غائب</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#f59e0b" }}>متأخر</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>نسبة الحضور</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((cls) => {
                  const rate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                  return (
                    <tr key={cls.name} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{cls.name}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#64748b" }}>{cls.total}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#10b981" }}>{cls.present}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#ef4444" }}>{cls.absent}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>{cls.late}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#ef4444" }}>{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== PAGE 2: Grades (Class Comparison) ========== */}
      <div style={{ pageBreakAfter: "always" }}>
        <PrintHeader config={headerConfig} schoolName={schoolName} today={today} dayName={dayName} />
        <h2 style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", margin: "0 0 16px", color: "#1e293b" }}>
          📈 ملخص الدرجات والأداء — {today}
        </h2>
        <GradesPrintSection />
      </div>

      {/* ========== PAGE 3: Calendar + Lessons ========== */}
      <div>
        <PrintHeader config={headerConfig} schoolName={schoolName} today={today} dayName={dayName} />
        <h2 style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", margin: "0 0 16px", color: "#1e293b" }}>
          📅 التقويم الأكاديمي ودروس الأسبوع {currentWeek ? `(الأسبوع ${currentWeek})` : ""}
        </h2>

        {/* Academic Calendar */}
        {weeksInfo.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>📅 التقويم الأكاديمي</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>الأسبوع</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>من</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>إلى</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>النوع</th>
                </tr>
              </thead>
              <tbody>
                {weeksInfo.map((w) => (
                  <tr key={w.weekNumber} style={{ borderTop: "1px solid #f1f5f9", background: w.weekNumber === currentWeek ? "#eff6ff" : "transparent" }}>
                    <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: w.weekNumber === currentWeek ? 700 : 400 }}>
                      {w.weekNumber}{w.weekNumber === currentWeek ? " ◄" : ""}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>{format(w.startDate, "MM/dd")}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>{format(w.endDate, "MM/dd")}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: w.type === "holiday" ? "#10b981" : w.type === "midterm" ? "#f59e0b" : w.type === "final" ? "#ef4444" : "#64748b" }}>
                      {w.label || "دراسة"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Week Lessons */}
        {lessonPlans.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>📖 دروس الأسبوع {currentWeek}</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>اليوم</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>الحصة</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>الفصل</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>عنوان الدرس</th>
                </tr>
              </thead>
              <tbody>
                {lessonPlans.map((lp, i) => (
                  <tr key={lp.id || i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 12px", fontWeight: 600 }}>{dayNames[lp.day_index] || `يوم ${lp.day_index + 1}`}</td>
                    <td style={{ padding: "6px 12px", textAlign: "center" }}>{lp.slot_index + 1}</td>
                    <td style={{ padding: "6px 12px" }}>{classesMap[lp.class_id] || "—"}</td>
                    <td style={{ padding: "6px 12px" }}>{lp.lesson_title || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
          <span>تم إنشاء التقرير تلقائياً بتاريخ {today}</span>
          <span>{schoolName} — جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}

/** Grades summary section fetched independently for print */
function GradesPrintSection() {
  const [data, setData] = useState<{ className: string; students: { name: string; total: number; max: number }[] }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: cls }, { data: students }, { data: cats }, { data: manual }] = await Promise.all([
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("students").select("id, full_name, class_id").order("full_name"),
        supabase.from("grade_categories").select("id, name, max_score, class_id").order("sort_order"),
        supabase.from("manual_category_scores").select("student_id, category_id, score").eq("period", 1),
      ]);

      if (!cls || !students || !cats) return;

      const manualMap = new Map<string, Map<string, number>>();
      (manual || []).forEach((m: any) => {
        if (!manualMap.has(m.student_id)) manualMap.set(m.student_id, new Map());
        manualMap.get(m.student_id)!.set(m.category_id, Number(m.score));
      });

      const result = cls.map(c => {
        const classStudents = students.filter(s => s.class_id === c.id);
        const classCats = cats.filter(cat => cat.class_id === c.id);
        const maxTotal = classCats.reduce((sum, cat) => sum + Number(cat.max_score), 0);

        return {
          className: c.name,
          students: classStudents.map(s => {
            const studentManual = manualMap.get(s.id);
            const total = classCats.reduce((sum, cat) => sum + (studentManual?.get(cat.id) || 0), 0);
            return { name: s.full_name, total, max: maxTotal };
          }),
        };
      }).filter(g => g.students.length > 0);

      setData(result);
    })();
  }, []);

  if (data.length === 0) {
    return <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>لا توجد بيانات درجات</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.map(group => {
        const avg = group.students.length > 0 ? Math.round(group.students.reduce((s, st) => s + (st.max > 0 ? (st.total / st.max) * 100 : 0), 0) / group.students.length) : 0;
        const top3 = [...group.students].sort((a, b) => b.total - a.total).slice(0, 3);
        const bottom3 = [...group.students].sort((a, b) => a.total - b.total).slice(0, 3);

        return (
          <div key={group.className} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>{group.className} — {group.students.length} طالب</h3>
              <span style={{ fontSize: "12px", fontWeight: 700, color: avg >= 80 ? "#10b981" : avg >= 50 ? "#f59e0b" : "#ef4444" }}>المعدل: {avg}%</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
              {/* Top students */}
              <div style={{ padding: "10px 14px", borderLeft: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", margin: "0 0 6px" }}>🏆 الأعلى</p>
                {top3.map((s, i) => (
                  <p key={i} style={{ fontSize: "11px", margin: "2px 0" }}>{i + 1}. {s.name} — <b>{s.total}/{s.max}</b></p>
                ))}
              </div>
              {/* Bottom students */}
              <div style={{ padding: "10px 14px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", margin: "0 0 6px" }}>⚠️ يحتاجون متابعة</p>
                {bottom3.map((s, i) => (
                  <p key={i} style={{ fontSize: "11px", margin: "2px 0" }}>{i + 1}. {s.name} — <b>{s.total}/{s.max}</b></p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
