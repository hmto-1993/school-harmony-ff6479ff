import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, BookOpen, UserCheck, Clock, FileText, AlertTriangle, Eye, Shield, FileBarChart, TrendingDown, CalendarDays, ChevronDown, Loader2, Sparkles, Share2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createArabicPDF, getArabicTableStyles, finalizePDF, finalizePDFAsBlob } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";
import { safeDownload } from "@/lib/download-utils";
import { buildSummaryPDF } from "@/lib/summary-pdf";

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
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [summaryFocus, setSummaryFocus] = useState<"comprehensive" | "attendance" | "grades" | "none">("comprehensive");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'light') return false;
      if (urlTheme === 'dark') return true;
      const saved = localStorage.getItem('shared-view-theme');
      if (saved) return saved !== 'light';
    }
    return true;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('shared-view-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  /** Build PDF doc (shared between download and WhatsApp share) */
  const buildPDF = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none" = summaryFocus) => {
    if (!data) return;
    setExporting(true);
    try {
      // Fetch AI summary in parallel with PDF setup
      const summaryPromise = focus !== "none"
        ? supabase.functions.invoke("summarize-teacher", {
            body: {
              teacherName: data.teacherName,
              schoolName: data.schoolName,
              classes: data.classes,
              attendanceRate: data.attendanceRate,
              totalStudents: data.totalStudents,
              focus,
            },
          }).then(r => r.data?.summary || "").catch(() => "")
        : Promise.resolve("");

      const [pdfSetup, summaryResult] = await Promise.all([
        createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true }),
        summaryPromise,
      ]);

      const { doc, startY, watermark } = pdfSetup;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const tableStyles = getArabicTableStyles();
      const today = format(new Date(), "yyyy/MM/dd");

      doc.setFontSize(16);
      doc.text(`عرض أعمال: ${data.teacherName}`, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(10);
      doc.text(today, pageWidth / 2, startY + 7, { align: "center" });

      // --- AI Summary ---
      let curY = startY + 15;
      if (summaryResult) {
        doc.setFontSize(12);
        doc.setFont("Amiri", "bold");
        doc.text("✦ ملخص ذكي لأداء المعلم", pageWidth / 2, curY, { align: "center" });
        curY += 6;

        // Draw summary box
        const margin = 14;
        const boxWidth = pageWidth - margin * 2;
        doc.setFillColor(240, 245, 255);
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.3);

        // Split text to fit in box
        doc.setFont("Amiri", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(summaryResult, boxWidth - 10);
        const boxHeight = lines.length * 5 + 8;

        doc.roundedRect(margin, curY - 2, boxWidth, boxHeight, 2, 2, "FD");
        doc.text(lines, pageWidth - margin - 5, curY + 4, { align: "right", maxWidth: boxWidth - 10 });
        curY += boxHeight + 6;
      }

      // --- Overview ---
      doc.setFont("Amiri", "bold");
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

      // --- Weekly Attendance per class ---
      const cal = data.academicCalendar;
      if (cal) {
        data.classes.forEach(cls => {
          doc.addPage("a4", "landscape");
          doc.setFontSize(13);
          doc.text(`الحضور الأسبوعي: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

          const classRecords = data.weeklyAttendance.filter(r => r.class_id === cls.id);
          
          // Build week data
          const weekAbsences: Record<number, Record<string, number>> = {};
          const weekLates: Record<number, Record<string, number>> = {};
          const studentTotals: Record<string, { absent: number; late: number }> = {};
          
          cls.students.forEach(s => { studentTotals[s.id] = { absent: 0, late: 0 }; });
          
          classRecords.forEach(r => {
            const diff = Math.floor((new Date(r.date).getTime() - new Date(cal.start_date).getTime()) / 86400000);
            const wk = Math.floor(diff / 7) + 1;
            if (wk < 1 || wk > cal.total_weeks) return;
            if (r.status === 'absent') {
              if (!weekAbsences[wk]) weekAbsences[wk] = {};
              weekAbsences[wk][r.student_id] = (weekAbsences[wk][r.student_id] || 0) + 1;
              if (studentTotals[r.student_id]) studentTotals[r.student_id].absent++;
            }
            if (r.status === 'late') {
              if (!weekLates[wk]) weekLates[wk] = {};
              weekLates[wk][r.student_id] = (weekLates[wk][r.student_id] || 0) + 1;
              if (studentTotals[r.student_id]) studentTotals[r.student_id].late++;
            }
          });

          // Determine active weeks (have data or up to current week)
          const currentWk = Math.floor((Date.now() - new Date(cal.start_date).getTime()) / 86400000 / 7) + 1;
          const maxWeek = Math.min(cal.total_weeks, Math.max(currentWk, ...Object.keys(weekAbsences).map(Number), ...Object.keys(weekLates).map(Number)));
          const weekNums: number[] = [];
          for (let w = 1; w <= maxWeek; w++) weekNums.push(w);

          const headers = ["الطالب", ...weekNums.map(w => `ع${w}`), "غ", "تأخر"];
          const rows = cls.students.map(s => {
            const row = [s.full_name];
            weekNums.forEach(w => {
              const ab = weekAbsences[w]?.[s.id] || 0;
              const lt = weekLates[w]?.[s.id] || 0;
              if (ab > 0 && lt > 0) row.push(`${ab}غ ${lt}ت`);
              else if (ab > 0) row.push(`${ab}غ`);
              else if (lt > 0) row.push(`${lt}ت`);
              else row.push("✓");
            });
            row.push(String(studentTotals[s.id]?.absent || 0));
            row.push(String(studentTotals[s.id]?.late || 0));
            return row.reverse();
          });

          autoTable(doc, {
            startY: 20,
            head: [[...headers].reverse()],
            body: rows,
            ...tableStyles,
            styles: { ...tableStyles.styles, fontSize: 7 },
            columnStyles: { 0: { cellWidth: 'auto' } },
            didParseCell: (hookData: any) => {
              if (hookData.section === 'body') {
                const text = hookData.cell.text?.[0] || '';
                if (text.includes('غ')) hookData.cell.styles.textColor = [229, 57, 53];
                else if (text.includes('ت')) hookData.cell.styles.textColor = [251, 192, 45];
                else if (text === '✓') hookData.cell.styles.textColor = [76, 175, 80];
              }
            },
          });
        });
      }

      // ============================================================
      // Helper: compute student average percentage
      // ============================================================
      const computeStudentAvg = (cls: ClassSummary, studentId: string) => {
        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
        let totalScore = 0, totalMax = 0;
        const gradesBySt: Record<string, { sum: number; count: number; max: number }> = {};
        cls.grades.filter((g: any) => g.student_id === studentId).forEach((g: any) => {
          const cat = classCategories.find((c: any) => c.id === g.category_id);
          if (!cat || g.score === null) return;
          if (!gradesBySt[g.category_id]) gradesBySt[g.category_id] = { sum: 0, count: 0, max: cat.max_score };
          gradesBySt[g.category_id].sum += Number(g.score);
          gradesBySt[g.category_id].count++;
        });
        cls.manualScores.filter((m: any) => m.student_id === studentId).forEach((m: any) => {
          const cat = classCategories.find((c: any) => c.id === m.category_id);
          if (!cat) return;
          gradesBySt[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score };
        });
        Object.values(gradesBySt).forEach(v => {
          if (v.count > 0) { totalScore += (v.sum / v.count); totalMax += v.max; }
        });
        return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
      };

      // ============================================================
      // Helper: classify grade level
      // ============================================================
      const getLevel = (avg: number) => {
        if (avg >= 90) return 0; // ممتاز
        if (avg >= 80) return 1; // جيد جداً
        if (avg >= 70) return 2; // جيد
        if (avg >= 60) return 3; // مقبول
        return 4; // ضعيف
      };
      const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
      const levelColors: [number, number, number][] = [
        [16, 185, 129],   // emerald
        [59, 130, 246],   // blue
        [251, 191, 36],   // amber
        [249, 115, 22],   // orange
        [239, 68, 68],    // red
      ];

      // ============================================================
      // Build all student averages
      // ============================================================
      const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
      data.classes.forEach(cls => {
        cls.students.forEach(s => {
          const avg = computeStudentAvg(cls, s.id);
          if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
        });
      });
      allStudentAvgs.sort((a, b) => b.avg - a.avg);

      // ============================================================
      // PAGE: Grade Distribution Chart — All Classes
      // ============================================================
      doc.addPage("a4", "landscape");
      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text("📊 توزيع مستويات الدرجات — جميع الفصول", pageWidth / 2, 15, { align: "center" });

      // Draw legend
      const legendY = 22;
      const legendStartX = pageWidth / 2 + (levelLabels.length * 25) / 2;
      levelLabels.forEach((label, i) => {
        const lx = legendStartX - i * 32;
        doc.setFillColor(...levelColors[i]);
        doc.rect(lx, legendY - 3, 5, 5, "F");
        doc.setFont("Amiri", "normal");
        doc.setFontSize(8);
        doc.text(label, lx - 1, legendY + 1, { align: "right" });
      });

      // Compute distribution per class
      const classDistributions = data.classes.map(cls => {
        const counts = [0, 0, 0, 0, 0];
        const classAvgs = allStudentAvgs.filter(s => s.classId === cls.id);
        classAvgs.forEach(s => { counts[getLevel(s.avg)]++; });
        return { name: cls.name, counts, total: classAvgs.length };
      });

      // Draw horizontal stacked bar chart
      const chartX = 20;
      const chartY = 30;
      const chartW = pageWidth - 60;
      const barH = Math.min(12, (pageHeight - chartY - 30) / data.classes.length - 2);
      const barGap = 3;

      classDistributions.forEach((cd, idx) => {
        const by = chartY + idx * (barH + barGap);
        // Class name (right-aligned)
        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.text(cd.name, pageWidth - 15, by + barH / 2 + 1.5, { align: "right" });

        // Stacked bars
        let cx = chartX;
        cd.counts.forEach((count, li) => {
          if (count === 0) return;
          const bw = cd.total > 0 ? (count / cd.total) * chartW : 0;
          doc.setFillColor(...levelColors[li]);
          doc.roundedRect(cx, by, bw, barH, 1, 1, "F");
          // Count label inside bar if wide enough
          if (bw > 10) {
            doc.setFontSize(7);
            doc.setFont("Amiri", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(String(count), cx + bw / 2, by + barH / 2 + 1.5, { align: "center" });
            doc.setTextColor(0, 0, 0);
          }
          cx += bw;
        });

        // Percentage labels
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        const totalStr = cd.total > 0 ? `(${cd.total} طالب)` : "";
        doc.text(totalStr, chartX - 2, by + barH / 2 + 1.5, { align: "right" });
      });

      // Overall distribution pie-like summary below
      const overallCounts = [0, 0, 0, 0, 0];
      allStudentAvgs.forEach(s => { overallCounts[getLevel(s.avg)]++; });
      const totalStudentsWithGrades = allStudentAvgs.length;

      const summaryY = chartY + classDistributions.length * (barH + barGap) + 10;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(11);
      doc.text("الإحصاء العام", pageWidth / 2, summaryY, { align: "center" });

      // Draw circular percentage indicators
      const circleR = 8;
      const circleGap = 38;
      const circlesStartX = pageWidth / 2 + ((levelLabels.length - 1) * circleGap) / 2;
      levelLabels.forEach((label, i) => {
        const cx = circlesStartX - i * circleGap;
        const cy = summaryY + 15;
        const pct = totalStudentsWithGrades > 0 ? Math.round((overallCounts[i] / totalStudentsWithGrades) * 100) : 0;

        // Background circle
        doc.setFillColor(245, 245, 245);
        doc.circle(cx, cy, circleR, "F");
        // Colored arc (simplified as filled circle with opacity effect)
        doc.setFillColor(...levelColors[i]);
        doc.circle(cx, cy, circleR - 1.5, "F");
        // White inner
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, circleR - 3.5, "F");
        // Percentage text
        doc.setFontSize(8);
        doc.setFont("Amiri", "bold");
        doc.setTextColor(...levelColors[i]);
        doc.text(`${pct}%`, cx, cy + 1.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
        // Label below
        doc.setFontSize(7);
        doc.setFont("Amiri", "normal");
        doc.text(label, cx, cy + circleR + 5, { align: "center" });
        doc.text(`${overallCounts[i]}`, cx, cy + circleR + 9, { align: "center" });
      });

      // ============================================================
      // PAGE: Line Chart — Grade Level Progression per Period
      // ============================================================
      {
        doc.addPage("a4", "landscape");
        doc.setFontSize(14);
        doc.setFont("Amiri", "bold");
        doc.text("📈 تطور مستوى الفصول خلال الفترات الدراسية", pageWidth / 2, 15, { align: "center" });

        // Compute per-class per-period averages
        const periods = [1, 2]; // period 1 and 2
        const periodLabels = ["الفترة الأولى", "الفترة الثانية"];
        const classLineColors: [number, number, number][] = [
          [59, 130, 246],   // blue
          [16, 185, 129],   // emerald
          [239, 68, 68],    // red
          [251, 191, 36],   // amber
          [139, 92, 246],   // purple
          [249, 115, 22],   // orange
          [6, 182, 212],    // cyan
          [236, 72, 153],   // pink
        ];

        const classPerPeriod: { name: string; color: [number, number, number]; avgs: (number | null)[] }[] = [];

        data.classes.forEach((cls, ci) => {
          const color = classLineColors[ci % classLineColors.length];
          const avgs: (number | null)[] = [];

          periods.forEach(period => {
            const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
            let totalPct = 0, studentCount = 0;

            cls.students.forEach(s => {
              const catScores: Record<string, { sum: number; count: number; max: number }> = {};
              
              // Regular grades for this period
              cls.grades.filter((g: any) => g.student_id === s.id && g.period === period).forEach((g: any) => {
                const cat = classCategories.find((c: any) => c.id === g.category_id);
                if (!cat || g.score === null) return;
                if (!catScores[g.category_id]) catScores[g.category_id] = { sum: 0, count: 0, max: cat.max_score };
                catScores[g.category_id].sum += Number(g.score);
                catScores[g.category_id].count++;
              });

              // Manual scores for this period
              cls.manualScores.filter((m: any) => m.student_id === s.id && m.period === period).forEach((m: any) => {
                const cat = classCategories.find((c: any) => c.id === m.category_id);
                if (!cat) return;
                catScores[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score };
              });

              let sTotal = 0, sMax = 0;
              Object.values(catScores).forEach(v => {
                if (v.count > 0) { sTotal += (v.sum / v.count); sMax += v.max; }
              });
              if (sMax > 0) {
                totalPct += Math.round((sTotal / sMax) * 100);
                studentCount++;
              }
            });

            avgs.push(studentCount > 0 ? Math.round(totalPct / studentCount) : null);
          });

          classPerPeriod.push({ name: cls.name, color, avgs });
        });

        // Draw line chart
        const lcMarginL = 30;
        const lcMarginR = 50;
        const lcTop = 30;
        const lcBottom = pageHeight - 35;
        const lcWidth = pageWidth - lcMarginL - lcMarginR;
        const lcHeight = lcBottom - lcTop;

        // Y-axis: 0-100
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        for (let pct = 0; pct <= 100; pct += 20) {
          const y = lcBottom - (pct / 100) * lcHeight;
          doc.line(lcMarginL, y, lcMarginL + lcWidth, y);
          doc.setFont("Amiri", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(`${pct}%`, lcMarginL - 3, y + 1.5, { align: "right" });
        }
        doc.setTextColor(0, 0, 0);

        // X-axis labels
        const xPoints = periods.map((_, i) => lcMarginL + (i / (periods.length - 1 || 1)) * lcWidth);
        periodLabels.forEach((label, i) => {
          doc.setFont("Amiri", "bold");
          doc.setFontSize(9);
          doc.text(label, xPoints[i], lcBottom + 8, { align: "center" });
        });

        // Axes
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.5);
        doc.line(lcMarginL, lcTop, lcMarginL, lcBottom);
        doc.line(lcMarginL, lcBottom, lcMarginL + lcWidth, lcBottom);

        // Draw lines for each class
        classPerPeriod.forEach((cls) => {
          doc.setDrawColor(...cls.color);
          doc.setLineWidth(1.2);

          const points: { x: number; y: number }[] = [];
          cls.avgs.forEach((avg, i) => {
            if (avg === null) return;
            const x = xPoints[i];
            const y = lcBottom - (avg / 100) * lcHeight;
            points.push({ x, y });
          });

          // Draw line segments
          for (let i = 1; i < points.length; i++) {
            doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
          }

          // Draw data points (circles)
          points.forEach((pt, i) => {
            doc.setFillColor(255, 255, 255);
            doc.circle(pt.x, pt.y, 2.5, "FD");
            doc.setFillColor(...cls.color);
            doc.circle(pt.x, pt.y, 1.8, "F");

            // Value label
            doc.setFontSize(7);
            doc.setFont("Amiri", "bold");
            doc.setTextColor(...cls.color);
            doc.text(`${cls.avgs[periods.indexOf(periods[i])] ?? ""}%`, pt.x, pt.y - 4, { align: "center" });
          });
        });

        doc.setTextColor(0, 0, 0);

        // Legend (right side)
        const legX = lcMarginL + lcWidth + 8;
        let legY = lcTop + 5;
        doc.setFont("Amiri", "bold");
        doc.setFontSize(8);
        doc.text("الفصول:", legX, legY, { align: "right" });
        legY += 6;

        classPerPeriod.forEach((cls) => {
          doc.setFillColor(...cls.color);
          doc.circle(legX - 2, legY - 1.5, 2, "F");
          doc.setFont("Amiri", "normal");
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
          doc.text(cls.name, legX - 6, legY, { align: "right" });
          legY += 6;
        });

        // Level zone backgrounds (faded)
        doc.setLineWidth(0);
        const zones = [
          { min: 90, max: 100, color: [16, 185, 129] as [number, number, number], label: "ممتاز" },
          { min: 80, max: 90, color: [59, 130, 246] as [number, number, number], label: "جيد جداً" },
          { min: 70, max: 80, color: [251, 191, 36] as [number, number, number], label: "جيد" },
          { min: 60, max: 70, color: [249, 115, 22] as [number, number, number], label: "مقبول" },
          { min: 0, max: 60, color: [239, 68, 68] as [number, number, number], label: "ضعيف" },
        ];
        doc.saveGraphicsState();
        // @ts-ignore
        const zoneGState = new (doc as any).GState({ opacity: 0.07 });
        // @ts-ignore
        doc.setGState(zoneGState);
        zones.forEach(zone => {
          const y1 = lcBottom - (zone.max / 100) * lcHeight;
          const y2 = lcBottom - (zone.min / 100) * lcHeight;
          doc.setFillColor(...zone.color);
          doc.rect(lcMarginL, y1, lcWidth, y2 - y1, "F");
        });
        doc.restoreGraphicsState();

        // Zone labels on right edge
        zones.forEach(zone => {
          const midY = lcBottom - ((zone.min + zone.max) / 2 / 100) * lcHeight;
          doc.setFont("Amiri", "normal");
          doc.setFontSize(6);
          doc.setTextColor(...zone.color);
          doc.text(zone.label, lcMarginL + lcWidth + 2, midY + 1, { align: "left" });
        });
        doc.setTextColor(0, 0, 0);
      }

      // ============================================================
      // PAGE: Top 10 / Bottom 10 — All Classes (Grades)
      // ============================================================
      doc.addPage("a4", "landscape");
      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text("⭐ أفضل وأدنى 10 طلاب — الدرجات", pageWidth / 2, 15, { align: "center" });

      const top10 = allStudentAvgs.slice(0, 10);
      const bottom10 = allStudentAvgs.slice(-10).reverse();

      doc.setFontSize(11);
      doc.setFont("Amiri", "bold");
      doc.text("⭐ أفضل 10 طلاب", pageWidth - 14, 22, { align: "right" });
      autoTable(doc, {
        startY: 26,
        head: [["المعدل %", "الفصل", "الطالب", "#"]],
        body: top10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
        margin: { left: pageWidth / 2 + 5 },
      });

      doc.setFontSize(11);
      doc.setFont("Amiri", "bold");
      doc.text("⚠ أدنى 10 طلاب", pageWidth / 2 - 10, 22, { align: "right" });
      autoTable(doc, {
        startY: 26,
        head: [["المعدل %", "الفصل", "الطالب", "#"]],
        body: bottom10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
        margin: { right: pageWidth / 2 + 5 },
      });

      // ============================================================
      // PAGES: Per-class Top 5 / Bottom 5 (Grades)
      // ============================================================
      data.classes.forEach(cls => {
        const classAvgs = cls.students
          .map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id) }))
          .filter(s => s.avg !== null) as { name: string; avg: number }[];
        classAvgs.sort((a, b) => b.avg - a.avg);
        if (classAvgs.length === 0) return;

        doc.addPage("a4", "landscape");
        doc.setFontSize(13);
        doc.setFont("Amiri", "bold");
        doc.text(`ترتيب الطلاب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

        // Mini distribution bar for this class
        const classCounts = [0, 0, 0, 0, 0];
        classAvgs.forEach(s => { classCounts[getLevel(s.avg)]++; });
        const miniBarY = 20;
        let mbx = 30;
        const mbw = pageWidth - 60;
        classCounts.forEach((count, li) => {
          if (count === 0) return;
          const bw = (count / classAvgs.length) * mbw;
          doc.setFillColor(...levelColors[li]);
          doc.roundedRect(mbx, miniBarY, bw, 6, 1, 1, "F");
          if (bw > 12) {
            doc.setFontSize(6);
            doc.setFont("Amiri", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`${levelLabels[li]} (${count})`, mbx + bw / 2, miniBarY + 4, { align: "center" });
            doc.setTextColor(0, 0, 0);
          }
          mbx += bw;
        });

        const classTop5 = classAvgs.slice(0, 5);
        const classBottom5 = classAvgs.slice(-5).reverse();

        doc.setFontSize(11);
        doc.setFont("Amiri", "bold");
        doc.text("⭐ أفضل 5", pageWidth - 14, 32, { align: "right" });
        autoTable(doc, {
          startY: 36,
          head: [["المعدل %", "الطالب", "#"]],
          body: classTop5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
          ...tableStyles,
          headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
          margin: { left: pageWidth / 2 + 5 },
        });

        doc.setFontSize(11);
        doc.setFont("Amiri", "bold");
        doc.text("⚠ أدنى 5", pageWidth / 2 - 10, 32, { align: "right" });
        autoTable(doc, {
          startY: 36,
          head: [["المعدل %", "الطالب", "#"]],
          body: classBottom5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
          ...tableStyles,
          headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
          margin: { right: pageWidth / 2 + 5 },
        });
      });

      // ============================================================
      // PAGE: Attendance Distribution Chart — All Classes
      // ============================================================
      doc.addPage("a4", "landscape");
      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text("📊 ملخص الحضور والغياب — جميع الفصول", pageWidth / 2, 15, { align: "center" });

      const attColors: [number, number, number][] = [
        [16, 185, 129],   // present - emerald
        [239, 68, 68],    // absent - red
        [251, 191, 36],   // late - amber
        [156, 163, 175],  // not recorded - gray
      ];
      const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

      // Legend
      const attLegY = 22;
      const attLegX = pageWidth / 2 + 50;
      attLabels.forEach((label, i) => {
        const lx = attLegX - i * 30;
        doc.setFillColor(...attColors[i]);
        doc.rect(lx, attLegY - 3, 5, 5, "F");
        doc.setFont("Amiri", "normal");
        doc.setFontSize(8);
        doc.text(label, lx - 1, attLegY + 1, { align: "right" });
      });

      // Bar chart
      const attChartY = 30;
      const attBarH = Math.min(12, (pageHeight - attChartY - 40) / data.classes.length - 2);

      data.classes.forEach((cls, idx) => {
        const by = attChartY + idx * (attBarH + barGap);
        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.text(cls.name, pageWidth - 15, by + attBarH / 2 + 1.5, { align: "right" });

        const vals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late, cls.attendance.notRecorded];
        const total = cls.studentCount;
        let cx = chartX;
        vals.forEach((count, li) => {
          if (count === 0) return;
          const bw = total > 0 ? (count / total) * chartW : 0;
          doc.setFillColor(...attColors[li]);
          doc.roundedRect(cx, by, bw, attBarH, 1, 1, "F");
          if (bw > 10) {
            doc.setFontSize(7);
            doc.setFont("Amiri", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(String(count), cx + bw / 2, by + attBarH / 2 + 1.5, { align: "center" });
            doc.setTextColor(0, 0, 0);
          }
          cx += bw;
        });

        // Rate
        const rate = total > 0 ? Math.round((cls.attendance.present / total) * 100) : 0;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.text(`${rate}%`, chartX - 2, by + attBarH / 2 + 1.5, { align: "right" });
      });

      // Overall attendance stats circles
      const totalPresent = data.classes.reduce((s, c) => s + c.attendance.present, 0);
      const totalAbsent = data.classes.reduce((s, c) => s + c.attendance.absent, 0);
      const totalLate = data.classes.reduce((s, c) => s + c.attendance.late, 0);
      const totalAll = data.totalStudents;

      const attSummY = attChartY + data.classes.length * (attBarH + barGap) + 10;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(11);
      doc.text("الإحصاء العام للحضور", pageWidth / 2, attSummY, { align: "center" });

      const attStats = [
        { label: "حاضر", count: totalPresent, color: attColors[0], pct: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0 },
        { label: "غائب", count: totalAbsent, color: attColors[1], pct: totalAll > 0 ? Math.round((totalAbsent / totalAll) * 100) : 0 },
        { label: "متأخر", count: totalLate, color: attColors[2], pct: totalAll > 0 ? Math.round((totalLate / totalAll) * 100) : 0 },
      ];

      const attCirclesX = pageWidth / 2 + ((attStats.length - 1) * circleGap) / 2;
      attStats.forEach((st, i) => {
        const cx = attCirclesX - i * circleGap;
        const cy = attSummY + 15;
        doc.setFillColor(245, 245, 245);
        doc.circle(cx, cy, circleR, "F");
        doc.setFillColor(...st.color);
        doc.circle(cx, cy, circleR - 1.5, "F");
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, circleR - 3.5, "F");
        doc.setFontSize(8);
        doc.setFont("Amiri", "bold");
        doc.setTextColor(...st.color);
        doc.text(`${st.pct}%`, cx, cy + 1.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.setFont("Amiri", "normal");
        doc.text(st.label, cx, cy + circleR + 5, { align: "center" });
        doc.text(`${st.count}`, cx, cy + circleR + 9, { align: "center" });
      });

      // ============================================================
      // PAGE: Top Absentees — Global + Per Class
      // ============================================================
      doc.addPage("a4", "landscape");
      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text("⚠ أكثر الطلاب غياباً", pageWidth / 2, 15, { align: "center" });

      // Global top absentees
      const globalAbsentees: { name: string; className: string; count: number }[] = [];
      data.classes.forEach(cls => {
        cls.topAbsentees.forEach(ta => {
          globalAbsentees.push({ name: ta.name, className: cls.name, count: ta.count });
        });
      });
      globalAbsentees.sort((a, b) => b.count - a.count);
      const topAbsentees10 = globalAbsentees.slice(0, 10);

      doc.setFontSize(11);
      doc.setFont("Amiri", "bold");
      doc.text("أكثر 10 طلاب غياباً — جميع الفصول", pageWidth / 2, 22, { align: "center" });
      autoTable(doc, {
        startY: 26,
        head: [["عدد الغيابات", "الفصل", "الطالب", "#"]],
        body: topAbsentees10.map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
      });

      // Per-class top 5 absentees
      data.classes.forEach(cls => {
        if (cls.topAbsentees.length === 0) return;
        doc.addPage("a4", "landscape");
        doc.setFontSize(13);
        doc.setFont("Amiri", "bold");
        doc.text(`أكثر الطلاب غياباً: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

        // Attendance mini bar
        const attMiniY = 20;
        const attMiniW = pageWidth - 60;
        let amx = 30;
        const attVals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late];
        const attTotal = cls.studentCount;
        attVals.forEach((count, li) => {
          if (count === 0) return;
          const bw = attTotal > 0 ? (count / attTotal) * attMiniW : 0;
          doc.setFillColor(...attColors[li]);
          doc.roundedRect(amx, attMiniY, bw, 6, 1, 1, "F");
          if (bw > 12) {
            doc.setFontSize(6);
            doc.setFont("Amiri", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`${attLabels[li]} (${count})`, amx + bw / 2, attMiniY + 4, { align: "center" });
            doc.setTextColor(0, 0, 0);
          }
          amx += bw;
        });

        const top5Absent = cls.topAbsentees.slice(0, 5);
        autoTable(doc, {
          startY: 30,
          head: [["عدد الغيابات", "الطالب", "#"]],
          body: top5Absent.map((s, i) => [String(s.count), s.name, String(i + 1)]),
          ...tableStyles,
          headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
        });
      });

      // ============================================================
      // PAGE: Lessons
      // ============================================================
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.setFont("Amiri", "bold");
      doc.text("خطط الدروس", pageWidth / 2, 15, { align: "center" });

      const lessonRows = data.classes.map(cls => {
        const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
        return [`${pct}%`, String(cls.lessonPlans.completed), String(cls.lessonPlans.total), cls.name];
      });

      autoTable(doc, {
        startY: 20,
        head: [["نسبة الإنجاز", "المنجز", "الإجمالي", "الفصل"]],
        body: lessonRows,
        ...tableStyles,
      });

      return { doc, watermark };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [data, summaryFocus]);

  /** Export PDF (download) */
  const exportPDF = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none" = summaryFocus) => {
    if (!data) return;
    setExporting(true);
    try {
      const { doc, watermark } = await buildPDF(focus);
      finalizePDF(doc, `shared-report_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير التقرير بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء التصدير");
    }
    setExporting(false);
  }, [data, summaryFocus, buildPDF]);

  /** Share via WhatsApp: generate PDF, upload via edge function, open WhatsApp */
  const shareViaWhatsApp = useCallback(async () => {
    if (!data || !token) return;
    setSharing(true);
    try {
      const { doc, watermark } = await buildPDF(summaryFocus);
      const blob = finalizePDFAsBlob(doc, watermark);

      // Upload via edge function (shared view is unauthenticated)
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", blob, "report.pdf");

      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-shared-report`;
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: formData,
      });

      const uploadResult = await uploadResp.json();
      if (!uploadResp.ok || !uploadResult.url) throw new Error(uploadResult.error || "Upload failed");

      const shareLink = window.location.href;
      const message = `📊 *تقرير أعمال المعلم: ${data.teacherName}*\n\n` +
        `🏫 ${data.schoolName || ''}\n` +
        `👥 عدد الطلاب: ${data.totalStudents}\n` +
        `✅ نسبة الحضور: ${data.attendanceRate}%\n\n` +
        `📄 تحميل التقرير PDF:\n${uploadResult.url}\n\n` +
        `🔗 رابط العرض المباشر:\n${shareLink}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      toast.success("تم فتح واتساب للمشاركة");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء المشاركة");
    }
    setSharing(false);
  }, [data, token, summaryFocus, buildPDF]);
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

  const themeClass = isDark ? 'sv-dark' : 'sv-light';

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", themeClass)} style={{ background: 'var(--sv-page-from)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[hsl(195,100%,50%)/0.2]" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[hsl(195,100%,50%)] animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-[hsl(270,75%,55%)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--sv-text-muted)' }}>جارٍ تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-6", themeClass)} style={{ background: 'var(--sv-page-from)' }}>
        <div className="text-center space-y-4 max-w-md rounded-3xl p-10" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--sv-text)' }}>{error}</h1>
          <p style={{ color: 'var(--sv-text-faint)' }}>تأكد من صحة الرابط أو تواصل مع المعلم للحصول على رابط جديد</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const expiryDate = new Date(data.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));

  const TAB_COLORS: Record<string, { active: string; gradient: string }> = {
    overview: { active: "from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)]", gradient: "shadow-[hsl(195,100%,50%)/0.3]" },
    attendance: { active: "from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]", gradient: "shadow-[hsl(160,84%,39%)/0.3]" },
    weekly: { active: "from-[hsl(210,80%,55%)] to-[hsl(230,70%,55%)]", gradient: "shadow-[hsl(210,80%,55%)/0.3]" },
    grades: { active: "from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)]", gradient: "shadow-[hsl(270,75%,55%)/0.3]" },
    reports: { active: "from-[hsl(38,92%,50%)] to-[hsl(25,90%,52%)]", gradient: "shadow-[hsl(38,92%,50%)/0.3]" },
    lessons: { active: "from-[hsl(340,75%,55%)] to-[hsl(320,70%,50%)]", gradient: "shadow-[hsl(340,75%,55%)/0.3]" },
  };

  return (
    <div className={cn("min-h-screen print:bg-white transition-colors duration-500", themeClass)} style={{ background: `linear-gradient(to bottom right, var(--sv-page-from), var(--sv-page-via), var(--sv-page-to))` }} dir="rtl">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none print:hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px]" style={{ background: 'var(--sv-glow1)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px]" style={{ background: 'var(--sv-glow2)' }} />
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl sticky top-0 z-10 print:static transition-colors duration-500" style={{ background: 'var(--sv-header)', borderBottom: '1px solid var(--sv-header-border)' }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, var(--sv-header-overlay-l), transparent, var(--sv-header-overlay-r))` }} />
        <div className="relative max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {data.schoolName && <p className="text-sm font-medium" style={{ color: 'var(--sv-text-faint)' }}>{data.schoolName}</p>}
              <h1 className="text-xl font-bold" style={{ color: 'var(--sv-text)' }}>عرض أعمال: <span className="bg-gradient-to-l from-[hsl(195,100%,60%)] to-[hsl(270,75%,65%)] bg-clip-text text-transparent">{data.teacherName}</span></h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-view-bg)', color: 'var(--sv-badge-view-text)', border: '1px solid var(--sv-badge-view-border)' }}>
                  <Eye className="h-3 w-3" /> عرض فقط
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-exp-bg)', color: 'var(--sv-badge-exp-text)', border: '1px solid var(--sv-badge-exp-border)' }}>
                  <Shield className="h-3 w-3" /> متبقي {daysLeft} يوم
                </span>
                {data.viewCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-count-bg)', color: 'var(--sv-badge-count-text)', border: '1px solid var(--sv-badge-count-border)' }}>
                    <Eye className="h-3 w-3" /> {data.viewCount} مشاهدة
                  </span>
                )}
                {data.label && <span className="text-xs" style={{ color: 'var(--sv-text-dim)' }}>{data.label}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl transition-all duration-300 hover:scale-110"
                style={{ background: 'var(--sv-toggle-bg)', color: 'var(--sv-toggle-text)' }}
                title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {data.canPrint && (
                <div className="relative">
                  <div className="flex">
                    <button
                      onClick={() => exportPDF()}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] hover:from-[hsl(195,100%,50%)] hover:to-[hsl(210,90%,55%)] rounded-r-xl transition-all text-white disabled:opacity-50 shadow-lg shadow-[hsl(195,100%,50%)/0.2]"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {exporting ? "جارٍ التصدير..." : "تصدير PDF"}
                    </button>
                    <button
                      onClick={() => setShowExportMenu(prev => !prev)}
                      disabled={exporting}
                      className="flex items-center px-2.5 py-2.5 text-sm font-medium bg-gradient-to-l from-[hsl(210,90%,50%)] to-[hsl(230,80%,50%)] hover:from-[hsl(210,90%,55%)] rounded-l-xl transition-all text-white disabled:opacity-50 border-r border-white/20"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {showExportMenu && (
                    <div className="absolute left-0 top-full mt-2 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-20 min-w-[220px]" style={{ background: 'var(--sv-dropdown)', border: '1px solid var(--sv-dropdown-border)' }}>
                      <div className="px-4 py-1.5 text-xs font-semibold" style={{ color: 'var(--sv-dropdown-label)' }}>الملخص الذكي</div>
                      {([
                        { key: "comprehensive", label: "شامل", icon: "📊" },
                        { key: "attendance", label: "التركيز على الحضور", icon: "📋" },
                        { key: "grades", label: "التركيز على الدرجات", icon: "📝" },
                        { key: "none", label: "بدون ملخص ذكي", icon: "⏭️" },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setSummaryFocus(opt.key);
                            setShowExportMenu(false);
                            exportPDF(opt.key);
                          }}
                          className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                          style={{
                            color: summaryFocus === opt.key ? 'var(--sv-selected-text)' : 'var(--sv-dropdown-text)',
                            background: summaryFocus === opt.key ? 'var(--sv-selected-bg)' : 'transparent',
                            fontWeight: summaryFocus === opt.key ? 600 : 400,
                          }}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {summaryFocus === opt.key && <Sparkles className="h-3 w-3 mr-auto" style={{ color: 'var(--sv-blue-accent)' }} />}
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid var(--sv-divider-subtle)' }} className="mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            shareViaWhatsApp();
                          }}
                          disabled={sharing}
                          className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                          style={{ color: 'var(--sv-wa-text)' }}
                        >
                          <span>💬</span>
                          <span>{sharing ? "جارٍ المشاركة..." : "مشاركة عبر واتساب"}</span>
                          {sharing && <Loader2 className="h-3 w-3 mr-auto animate-spin" />}
                          {!sharing && <Share2 className="h-3 w-3 mr-auto" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
          <StatCard label="الفصول" value={data.classes.length} icon={Users} gradient="from-[hsl(195,100%,50%)] to-[hsl(210,90%,55%)]" />
          <StatCard label="الطلاب" value={data.totalStudents} icon={Users} gradient="from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)]" />
          <StatCard label="نسبة الحضور اليوم" value={`${data.attendanceRate}%`} icon={UserCheck} gradient="from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]" />
          <StatCard
            label="خطط الدروس"
            value={(() => {
              const t = data.classes.reduce((a, c) => a + c.lessonPlans.total, 0);
              const d = data.classes.reduce((a, c) => a + c.lessonPlans.completed, 0);
              return t > 0 ? `${Math.round((d / t) * 100)}%` : "—";
            })()}
            icon={BookOpen}
            gradient="from-[hsl(340,75%,55%)] to-[hsl(320,70%,50%)]"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const colors = TAB_COLORS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300",
                  activeTab === tab.id
                    ? `bg-gradient-to-l ${colors.active} text-white shadow-lg ${colors.gradient}`
                    : ""
                )}
                style={activeTab !== tab.id ? { background: 'var(--sv-tab-inactive)', color: 'var(--sv-tab-inactive-text)', border: '1px solid var(--sv-tab-inactive-border)' } : undefined}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="print:hidden">
          <div className={activeTab === "overview" ? "" : "hidden"}><OverviewTab data={data} /></div>
          <div className={activeTab === "attendance" ? "" : "hidden"}><AttendanceTab classes={data.classes} /></div>
          <div className={activeTab === "weekly" ? "" : "hidden"}><WeeklyAttendanceTab data={data} /></div>
          <div className={activeTab === "grades" ? "" : "hidden"}><GradesTab classes={data.classes} categories={data.categories} /></div>
          <div className={activeTab === "reports" ? "" : "hidden"}><ReportsTab data={data} /></div>
          <div className={activeTab === "lessons" ? "" : "hidden"}><LessonsTab classes={data.classes} /></div>
        </div>
      </main>
    </div>
  );
}

// ============ Shared Components ============

function StatCard({ label, value, icon: Icon, gradient }: { label: string; value: string | number; icon: any; gradient: string }) {
  return (
    <div className="relative group overflow-hidden rounded-2xl p-5 text-center transition-all duration-500 hover:scale-[1.02]" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500", gradient)} />
      <div className="relative">
        <div className={cn("w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--sv-text)' }}>{value}</div>
        <div className="text-xs font-medium mt-1.5" style={{ color: 'var(--sv-text-faint)' }}>{label}</div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--sv-text-faint)' }}>{label}</span>
      <span className={cn("font-semibold", valueColor)} style={!valueColor ? { color: 'var(--sv-text-secondary)' } : undefined}>{value}</span>
    </div>
  );
}

// ============ Overview Tab ============

function OverviewTab({ data }: { data: SharedData }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>ملخص الفصول</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.classes.map((cls, i) => (
          <div key={cls.id} className="relative overflow-hidden backdrop-blur-sm rounded-2xl p-5 transition-all duration-300 group animate-fade-in" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)', animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[hsl(195,100%,50%)] to-[hsl(270,75%,55%)] opacity-60 group-hover:opacity-100 transition-opacity" />
            <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--sv-text)' }}>{cls.name}</h3>
            <div className="space-y-2 text-sm">
              <Row label="عدد الطلاب" value={cls.studentCount} />
              <Row label="حاضرون اليوم" value={cls.attendance.present} valueColor="text-[var(--sv-green)]" />
              <Row label="غائبون" value={cls.attendance.absent} valueColor="text-[var(--sv-red)]" />
              <Row label="متأخرون" value={cls.attendance.late} valueColor="text-[var(--sv-amber)]" />
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--sv-card-border)' }}>
                <Row label="خطط الدروس" value={`${cls.lessonPlans.completed}/${cls.lessonPlans.total}`} />
                <Row label="سلوك إيجابي" value={cls.behavior.positive} valueColor="text-[var(--sv-green)]" />
                <Row label="سلوك سلبي" value={cls.behavior.negative} valueColor="text-[var(--sv-red)]" />
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
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>تفاصيل الحضور اليوم</h2>
      <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
              <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الفصل</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الطلاب</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-green)' }}>حاضر</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-red)' }}>غائب</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-amber)' }}>متأخر</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-dim)' }}>لم يُسجل</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>النسبة</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
              return (
                <tr key={cls.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--sv-text-secondary)' }}>{cls.name}</td>
                  <td className="text-center px-4 py-3" style={{ color: 'var(--sv-text-muted)' }}>{cls.studentCount}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-green)' }}>{cls.attendance.present}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-red)' }}>{cls.attendance.absent}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-amber)' }}>{cls.attendance.late}</td>
                  <td className="text-center px-4 py-3" style={{ color: 'var(--sv-text-dim)' }}>{cls.attendance.notRecorded}</td>
                  <td className="text-center px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                      background: rate >= 80 ? 'var(--sv-rate-good-bg)' : rate >= 60 ? 'var(--sv-rate-mid-bg)' : 'var(--sv-rate-bad-bg)',
                      color: rate >= 80 ? 'var(--sv-rate-good-text)' : rate >= 60 ? 'var(--sv-rate-mid-text)' : 'var(--sv-rate-bad-text)',
                    }}>
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
        <details key={cls.id} className="backdrop-blur-sm rounded-2xl" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <summary className="px-4 py-3 font-semibold cursor-pointer transition-colors" style={{ color: 'var(--sv-text-muted)' }}>{cls.name} — قائمة الطلاب</summary>
          <div className="px-4 pb-3 text-sm" style={{ color: 'var(--sv-text-dim)' }}>
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
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>ملخص الدرجات</h2>
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
          <div key={cls.id} className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <button
              onClick={() => toggleClass(cls.id)}
              className="w-full px-4 py-3 font-bold flex items-center justify-between transition-colors"
              style={{ background: 'var(--sv-card-subtle)', borderBottom: '1px solid var(--sv-divider)', color: 'var(--sv-text-secondary)' }}
            >
              <span>{cls.name} ({cls.studentCount} طالب)</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} style={{ color: 'var(--sv-text-dim)' }} />
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الطالب</th>
                      {sortedCats.map((cat: any) => (
                        <th key={cat.id} className="text-center px-2 py-2 font-medium text-xs max-w-[80px] truncate" title={cat.name} style={{ color: 'var(--sv-text-dim)' }}>
                          {cat.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cls.students.map((s) => (
                      <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                        <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--sv-text-secondary)' }}>{s.full_name}</td>
                        {sortedCats.map((cat: any) => {
                          const entry = gradesByStudent[s.id]?.[cat.id];
                          const avg = entry && entry.count > 0 ? Math.round(entry.sum / entry.count) : null;
                          return (
                            <td key={cat.id} className="text-center px-2 py-2">
                              {avg !== null ? (
                                <span className="text-xs font-semibold" style={{ color: avg >= cat.max_score * 0.8 ? 'var(--sv-green)' : avg >= cat.max_score * 0.5 ? 'var(--sv-amber)' : 'var(--sv-red)' }}>
                                  {avg}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--sv-text-ghost)' }}>—</span>
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
      <div className="backdrop-blur-sm rounded-2xl p-8 text-center" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
        <CalendarDays className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--sv-text-ghost)' }} />
        <p className="font-medium" style={{ color: 'var(--sv-text-dim)' }}>لا يوجد تقويم أكاديمي محدد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>تقرير الحضور الأسبوعي</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--sv-tab-inactive)', border: '1px solid var(--sv-card-border)' }}>
            <button
              onClick={() => setWeekFilter("current")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "current"
                  ? "bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={weekFilter !== "current" ? { color: 'var(--sv-text-dim)' } : undefined}
            >
              الأسبوع الحالي (ع{currentWeek})
            </button>
            <button
              onClick={() => setWeekFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "all"
                  ? "bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={weekFilter !== "all" ? { color: 'var(--sv-text-dim)' } : undefined}
            >
              جميع الأسابيع
            </button>
          </div>
          {data.classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                selectedClassId === cls.id
                  ? "bg-gradient-to-l from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={selectedClassId !== cls.id ? { background: 'var(--sv-tab-inactive)', color: 'var(--sv-text-dim)', border: '1px solid var(--sv-card-border)' } : undefined}
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
            <span style={{ color: 'var(--sv-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {weeklyData && (
        <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                  <th className="text-right px-3 py-2 font-semibold sticky right-0 z-10 min-w-[120px]" style={{ color: 'var(--sv-text-muted)', background: 'var(--sv-sticky)' }}>الطالب</th>
                  {weeklyData.weeks.map(w => (
                    <th key={w.weekNum} className="text-center px-1 py-2 font-medium min-w-[36px]" style={{ color: w.weekNum === currentWeek ? 'var(--sv-current-week-text)' : 'var(--sv-text-dim)', background: w.weekNum === currentWeek ? 'var(--sv-current-week-bg)' : undefined }}>
                      <div className="writing-mode-vertical text-[10px]">ع{w.weekNum}</div>
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold min-w-[40px]" style={{ color: 'var(--sv-red)' }}>غ</th>
                  <th className="text-center px-2 py-2 font-semibold min-w-[40px]" style={{ color: 'var(--sv-amber)' }}>تأخر</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.studentRows.map((student) => (
                  <tr key={student.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)', background: student.isAtRisk ? 'var(--sv-at-risk-bg)' : undefined }}>
                    <td className="px-3 py-1.5 font-medium whitespace-nowrap sticky right-0 z-10" style={{ color: 'var(--sv-text-secondary)', background: 'var(--sv-sticky)' }}>
                      <div className="flex items-center gap-1">
                        {student.isAtRisk && <AlertTriangle className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--sv-red)' }} />}
                        <span className="truncate max-w-[100px]">{student.name}</span>
                      </div>
                    </td>
                    {weeklyData.weeks.map(w => {
                      const statuses = student.weekStatuses[w.weekNum] || [];
                      return (
                        <td key={w.weekNum} className="text-center px-0.5 py-1" style={{ background: w.weekNum === currentWeek ? 'var(--sv-current-week-bg)' : undefined }}>
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {statuses.length === 0 ? (
                              <span style={{ color: 'var(--sv-text-invisible)' }}>·</span>
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
                    <td className="text-center px-2 py-1.5 font-bold" style={{ color: 'var(--sv-red)' }}>{student.totalAbsent || '—'}</td>
                    <td className="text-center px-2 py-1.5 font-bold" style={{ color: 'var(--sv-amber)' }}>{student.totalLate || '—'}</td>
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
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>التقارير والإحصائيات</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="إجمالي الغياب (30 يوم)" value={totalAbsences} icon={TrendingDown} gradient="from-[hsl(0,84%,60%)] to-[hsl(350,80%,55%)]" />
        <StatCard label="سلوك إيجابي" value={totalBehaviorPositive} icon={UserCheck} gradient="from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]" />
        <StatCard label="سلوك سلبي" value={totalBehaviorNegative} icon={AlertTriangle} gradient="from-[hsl(38,92%,50%)] to-[hsl(25,90%,52%)]" />
        <StatCard label="عدد المشاهدات" value={data.viewCount} icon={Eye} gradient="from-[hsl(195,100%,50%)] to-[hsl(210,90%,55%)]" />
      </div>

      {data.attendanceReport.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl p-5" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--sv-text)' }}>اتجاه الحضور (آخر 30 يوم)</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {data.attendanceReport.slice(0, 30).reverse().map((day) => {
                const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${rate}%`}>
                    <span className="text-[9px] font-medium" style={{ color: 'var(--sv-text-dim)' }}>{rate}%</span>
                    <div className="w-full rounded-t transition-all duration-300" style={{
                      height: `${rate}%`,
                      background: rate >= 80 ? 'linear-gradient(to top, hsl(160,84%,39%), hsl(160,84%,50%))' : rate >= 60 ? 'linear-gradient(to top, hsl(38,92%,50%), hsl(38,92%,60%))' : 'linear-gradient(to top, hsl(0,84%,50%), hsl(0,84%,60%))',
                      minHeight: '2px',
                      boxShadow: rate >= 80 ? '0 0 8px hsl(160,84%,39%,0.3)' : rate >= 60 ? '0 0 8px hsl(38,92%,50%,0.3)' : '0 0 8px hsl(0,84%,50%,0.3)',
                    }} />
                    <span className="text-[8px] -rotate-45 origin-center whitespace-nowrap" style={{ color: 'var(--sv-text-ghost)' }}>
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {data.classes.map((cls) => (
        cls.topAbsentees.length > 0 && (
          <div key={cls.id} className="backdrop-blur-sm rounded-2xl p-5" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--sv-text)' }}>{cls.name} — الأكثر غياباً</h3>
            <div className="space-y-2">
              {cls.topAbsentees.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--sv-text-muted)' }}>{s.name}</span>
                  <span className="font-bold" style={{ color: 'var(--sv-red)' }}>{s.count} غياب</span>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {data.attendanceReport.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="px-4 py-3 font-bold" style={{ borderBottom: '1px solid var(--sv-divider)', color: 'var(--sv-text-muted)' }}>سجل الحضور اليومي</div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--sv-sticky)' }}>
                <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                  <th className="text-right px-4 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>التاريخ</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-green)' }}>حاضر</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-red)' }}>غائب</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-amber)' }}>متأخر</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data.attendanceReport.map((day) => {
                  const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                  return (
                    <tr key={day.date} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                      <td className="px-4 py-2 font-medium" style={{ color: 'var(--sv-text-secondary)' }}>{day.date}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-green)' }}>{day.present}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-red)' }}>{day.absent}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-amber)' }}>{day.late}</td>
                      <td className="text-center px-4 py-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                          background: rate >= 80 ? 'var(--sv-rate-good-bg)' : rate >= 60 ? 'var(--sv-rate-mid-bg)' : 'var(--sv-rate-bad-bg)',
                          color: rate >= 80 ? 'var(--sv-rate-good-text)' : rate >= 60 ? 'var(--sv-rate-mid-text)' : 'var(--sv-rate-bad-text)',
                        }}>
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
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>خطط الدروس</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, i) => {
          const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
          const color = pct >= 80 ? 'hsl(160,84%,45%)' : pct >= 50 ? 'hsl(38,92%,55%)' : 'hsl(0,84%,60%)';
          return (
            <div key={cls.id} className="relative overflow-hidden backdrop-blur-sm rounded-2xl p-5 transition-all duration-300 group animate-fade-in" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)', animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--sv-text)' }}>{cls.name}</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--sv-text-dim)' }}>الإنجاز</span>
                  <span className="font-bold" style={{ color: 'var(--sv-text-secondary)' }}>{cls.lessonPlans.completed}/{cls.lessonPlans.total}</span>
                </div>
                {/* Circular progress */}
                <div className="flex justify-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" style={{ stroke: 'var(--sv-divider)' }} />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${pct * 2.64} 264`}
                        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.8s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black" style={{ color: 'var(--sv-text)' }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
