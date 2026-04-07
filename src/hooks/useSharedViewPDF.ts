import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createArabicPDF, getArabicTableStyles, finalizePDF, finalizePDFAsBlob } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";
import { safeDownload } from "@/lib/download-utils";
import { buildSummaryPDF } from "@/lib/summary-pdf";
import type { SharedData, ClassSummary } from "@/components/shared-view/types";

export function useSharedViewPDF(data: SharedData | null, token: string | undefined) {
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [summaryFocus, setSummaryFocus] = useState<"comprehensive" | "attendance" | "grades" | "none">("comprehensive");

  const buildPDF = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none" = summaryFocus) => {
    if (!data) return;
    setExporting(true);
    try {
      const summaryPromise = focus !== "none"
        ? supabase.functions.invoke("summarize-teacher", {
            body: { teacherName: data.teacherName, schoolName: data.schoolName, classes: data.classes, attendanceRate: data.attendanceRate, totalStudents: data.totalStudents, focus },
          }).then(r => r.data?.summary || "").catch(() => "")
        : Promise.resolve("");

      const [pdfSetup, summaryResult] = await Promise.all([
        createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true }),
        summaryPromise,
      ]);

      const { doc, startY, watermark, advanced } = pdfSetup;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const tableStyles = getArabicTableStyles(advanced);
      const today = format(new Date(), "yyyy/MM/dd");
      const categories = data.categories || [];

      doc.setFontSize(16);
      doc.text(`عرض أعمال: ${data.teacherName}`, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(10);
      doc.text(today, pageWidth / 2, startY + 7, { align: "center" });

      let curY = startY + 15;
      if (summaryResult) {
        doc.setFontSize(12);
        doc.setFont("Amiri", "bold");
        doc.text("✦ ملخص ذكي لأداء المعلم", pageWidth / 2, curY, { align: "center" });
        curY += 6;
        const margin = 14;
        const boxWidth = pageWidth - margin * 2;
        doc.setFillColor(240, 245, 255);
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.3);
        doc.setFont("Amiri", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(summaryResult, boxWidth - 10);
        const boxHeight = lines.length * 5 + 8;
        doc.roundedRect(margin, curY - 2, boxWidth, boxHeight, 2, 2, "FD");
        doc.text(lines, pageWidth - margin - 5, curY + 4, { align: "right", maxWidth: boxWidth - 10 });
        curY += boxHeight + 6;
      }

      // Overview
      doc.setFont("Amiri", "bold");
      doc.setFontSize(13);
      doc.text("ملخص عام", pageWidth / 2, curY, { align: "center" });
      const overviewRows = data.classes.map(cls => [
        `${cls.lessonPlans.completed}/${cls.lessonPlans.total}`, String(cls.behavior.negative), String(cls.behavior.positive),
        String(cls.attendance.late), String(cls.attendance.absent), String(cls.attendance.present), String(cls.studentCount), cls.name,
      ]);
      autoTable(doc, { startY: curY + 4, head: [["خطط الدروس", "سلوك سلبي", "سلوك إيجابي", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"].reverse().reverse()], body: overviewRows, ...tableStyles });

      // Attendance
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.text("تفاصيل الحضور اليوم", pageWidth / 2, 15, { align: "center" });
      const attRows = data.classes.map(cls => {
        const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
        return [`${rate}%`, String(cls.attendance.notRecorded), String(cls.attendance.late), String(cls.attendance.absent), String(cls.attendance.present), String(cls.studentCount), cls.name];
      });
      autoTable(doc, { startY: 20, head: [["النسبة", "لم يُسجل", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"]], body: attRows, ...tableStyles });

      // Grades per class
      data.classes.forEach(cls => {
        doc.addPage("a4", "landscape");
        doc.setFontSize(13);
        doc.text(`درجات: ${cls.name}`, pageWidth / 2, 15, { align: "center" });
        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null).sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 8);
        const gradesByStudent: Record<string, Record<string, { sum: number; count: number }>> = {};
        cls.students.forEach(s => { gradesByStudent[s.id] = {}; });
        cls.grades.forEach((g: any) => {
          if (!gradesByStudent[g.student_id]) return;
          if (!gradesByStudent[g.student_id][g.category_id]) gradesByStudent[g.student_id][g.category_id] = { sum: 0, count: 0 };
          if (g.score !== null) { gradesByStudent[g.student_id][g.category_id].sum += Number(g.score); gradesByStudent[g.student_id][g.category_id].count++; }
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
        autoTable(doc, { startY: 20, head: [[...headers].reverse()], body: rows, ...tableStyles, styles: { ...tableStyles.styles, fontSize: 8 } });
      });

      // Weekly Attendance per class
      const cal = data.academicCalendar;
      if (cal) {
        data.classes.forEach(cls => {
          doc.addPage("a4", "landscape");
          doc.setFontSize(13);
          doc.text(`الحضور الأسبوعي: ${cls.name}`, pageWidth / 2, 15, { align: "center" });
          const classRecords = data.weeklyAttendance.filter(r => r.class_id === cls.id);
          const weekAbsences: Record<number, Record<string, number>> = {};
          const weekLates: Record<number, Record<string, number>> = {};
          const studentTotals: Record<string, { absent: number; late: number }> = {};
          cls.students.forEach(s => { studentTotals[s.id] = { absent: 0, late: 0 }; });
          classRecords.forEach(r => {
            const diff = Math.floor((new Date(r.date).getTime() - new Date(cal.start_date).getTime()) / 86400000);
            const wk = Math.floor(diff / 7) + 1;
            if (wk < 1 || wk > cal.total_weeks) return;
            if (r.status === 'absent') { if (!weekAbsences[wk]) weekAbsences[wk] = {}; weekAbsences[wk][r.student_id] = (weekAbsences[wk][r.student_id] || 0) + 1; if (studentTotals[r.student_id]) studentTotals[r.student_id].absent++; }
            if (r.status === 'late') { if (!weekLates[wk]) weekLates[wk] = {}; weekLates[wk][r.student_id] = (weekLates[wk][r.student_id] || 0) + 1; if (studentTotals[r.student_id]) studentTotals[r.student_id].late++; }
          });
          const currentWk = Math.floor((Date.now() - new Date(cal.start_date).getTime()) / 86400000 / 7) + 1;
          const maxWeek = Math.min(cal.total_weeks, Math.max(currentWk, ...Object.keys(weekAbsences).map(Number), ...Object.keys(weekLates).map(Number)));
          const weekNums: number[] = [];
          for (let w = 1; w <= maxWeek; w++) weekNums.push(w);
          const wHeaders = ["الطالب", ...weekNums.map(w => `ع${w}`), "غ", "تأخر"];
          const wRows = cls.students.map(s => {
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
            startY: 20, head: [[...wHeaders].reverse()], body: wRows, ...tableStyles, styles: { ...tableStyles.styles, fontSize: 7 }, columnStyles: { 0: { cellWidth: 'auto' } },
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

      // Grade Distribution & Analytics pages
      const computeStudentAvg = (cls: ClassSummary, studentId: string) => {
        const cc = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
        let totalScore = 0, totalMax = 0;
        const gs: Record<string, { sum: number; count: number; max: number }> = {};
        cls.grades.filter((g: any) => g.student_id === studentId).forEach((g: any) => { const cat = cc.find((c: any) => c.id === g.category_id); if (!cat || g.score === null) return; if (!gs[g.category_id]) gs[g.category_id] = { sum: 0, count: 0, max: cat.max_score }; gs[g.category_id].sum += Number(g.score); gs[g.category_id].count++; });
        cls.manualScores.filter((m: any) => m.student_id === studentId).forEach((m: any) => { const cat = cc.find((c: any) => c.id === m.category_id); if (!cat) return; gs[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score }; });
        Object.values(gs).forEach(v => { if (v.count > 0) { totalScore += (v.sum / v.count); totalMax += v.max; } });
        return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
      };
      const getLevel = (avg: number) => { if (avg >= 90) return 0; if (avg >= 80) return 1; if (avg >= 70) return 2; if (avg >= 60) return 3; return 4; };
      const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
      const levelColors: [number, number, number][] = [[16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68]];

      const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
      data.classes.forEach(cls => { cls.students.forEach(s => { const avg = computeStudentAvg(cls, s.id); if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id }); }); });
      allStudentAvgs.sort((a, b) => b.avg - a.avg);

      // Grade Distribution Chart
      doc.addPage("a4", "landscape");
      doc.setFontSize(14); doc.setFont("Amiri", "bold");
      doc.text("📊 توزيع مستويات الدرجات — جميع الفصول", pageWidth / 2, 15, { align: "center" });
      const legendY = 22;
      const legendStartX = pageWidth / 2 + (levelLabels.length * 25) / 2;
      levelLabels.forEach((label, i) => { const lx = legendStartX - i * 32; doc.setFillColor(...levelColors[i]); doc.rect(lx, legendY - 3, 5, 5, "F"); doc.setFont("Amiri", "normal"); doc.setFontSize(8); doc.text(label, lx - 1, legendY + 1, { align: "right" }); });
      const classDistributions = data.classes.map(cls => { const counts = [0, 0, 0, 0, 0]; allStudentAvgs.filter(s => s.classId === cls.id).forEach(s => { counts[getLevel(s.avg)]++; }); return { name: cls.name, counts, total: allStudentAvgs.filter(s => s.classId === cls.id).length }; });
      const chartX = 20; const chartY = 30; const chartW = pageWidth - 60;
      const barH = Math.min(12, (pageHeight - chartY - 30) / data.classes.length - 2); const barGap = 3;
      classDistributions.forEach((cd, idx) => {
        const by = chartY + idx * (barH + barGap);
        doc.setFont("Amiri", "bold"); doc.setFontSize(9); doc.text(cd.name, pageWidth - 15, by + barH / 2 + 1.5, { align: "right" });
        let cx = chartX;
        cd.counts.forEach((count, li) => { if (count === 0) return; const bw = cd.total > 0 ? (count / cd.total) * chartW : 0; doc.setFillColor(...levelColors[li]); doc.roundedRect(cx, by, bw, barH, 1, 1, "F"); if (bw > 10) { doc.setFontSize(7); doc.setFont("Amiri", "bold"); doc.setTextColor(255, 255, 255); doc.text(String(count), cx + bw / 2, by + barH / 2 + 1.5, { align: "center" }); doc.setTextColor(0, 0, 0); } cx += bw; });
        doc.setFont("Amiri", "normal"); doc.setFontSize(7); doc.text(cd.total > 0 ? `(${cd.total} طالب)` : "", chartX - 2, by + barH / 2 + 1.5, { align: "right" });
      });
      const overallCounts = [0, 0, 0, 0, 0]; allStudentAvgs.forEach(s => { overallCounts[getLevel(s.avg)]++; });
      const totalStudentsWithGrades = allStudentAvgs.length;
      const summaryY2 = chartY + classDistributions.length * (barH + barGap) + 10;
      doc.setFont("Amiri", "bold"); doc.setFontSize(11); doc.text("الإحصاء العام", pageWidth / 2, summaryY2, { align: "center" });
      const circleR = 8; const circleGap = 38;
      const circlesStartX = pageWidth / 2 + ((levelLabels.length - 1) * circleGap) / 2;
      levelLabels.forEach((label, i) => {
        const cx2 = circlesStartX - i * circleGap; const cy = summaryY2 + 15;
        const pct = totalStudentsWithGrades > 0 ? Math.round((overallCounts[i] / totalStudentsWithGrades) * 100) : 0;
        doc.setFillColor(245, 245, 245); doc.circle(cx2, cy, circleR, "F"); doc.setFillColor(...levelColors[i]); doc.circle(cx2, cy, circleR - 1.5, "F"); doc.setFillColor(255, 255, 255); doc.circle(cx2, cy, circleR - 3.5, "F");
        doc.setFontSize(8); doc.setFont("Amiri", "bold"); doc.setTextColor(...levelColors[i]); doc.text(`${pct}%`, cx2, cy + 1.5, { align: "center" }); doc.setTextColor(0, 0, 0);
        doc.setFontSize(7); doc.setFont("Amiri", "normal"); doc.text(label, cx2, cy + circleR + 5, { align: "center" }); doc.text(`${overallCounts[i]}`, cx2, cy + circleR + 9, { align: "center" });
      });

      // Period progression chart
      {
        doc.addPage("a4", "landscape");
        doc.setFontSize(14); doc.setFont("Amiri", "bold");
        doc.text("📈 تطور مستوى الفصول خلال الفترات الدراسية", pageWidth / 2, 15, { align: "center" });
        const periods = [1, 2]; const periodLabels = ["الفترة الأولى", "الفترة الثانية"];
        const classLineColors: [number, number, number][] = [[59, 130, 246], [16, 185, 129], [239, 68, 68], [251, 191, 36], [139, 92, 246], [249, 115, 22], [6, 182, 212], [236, 72, 153]];
        const classPerPeriod: { name: string; color: [number, number, number]; avgs: (number | null)[] }[] = [];
        data.classes.forEach((cls, ci) => {
          const color = classLineColors[ci % classLineColors.length]; const avgs: (number | null)[] = [];
          periods.forEach(period => {
            const cc = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
            let totalPct = 0, studentCount = 0;
            cls.students.forEach(s => {
              const catScores: Record<string, { sum: number; count: number; max: number }> = {};
              cls.grades.filter((g: any) => g.student_id === s.id && g.period === period).forEach((g: any) => { const cat = cc.find((c: any) => c.id === g.category_id); if (!cat || g.score === null) return; if (!catScores[g.category_id]) catScores[g.category_id] = { sum: 0, count: 0, max: cat.max_score }; catScores[g.category_id].sum += Number(g.score); catScores[g.category_id].count++; });
              cls.manualScores.filter((m: any) => m.student_id === s.id && m.period === period).forEach((m: any) => { const cat = cc.find((c: any) => c.id === m.category_id); if (!cat) return; catScores[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score }; });
              let sTotal = 0, sMax = 0; Object.values(catScores).forEach(v => { if (v.count > 0) { sTotal += (v.sum / v.count); sMax += v.max; } });
              if (sMax > 0) { totalPct += Math.round((sTotal / sMax) * 100); studentCount++; }
            });
            avgs.push(studentCount > 0 ? Math.round(totalPct / studentCount) : null);
          });
          classPerPeriod.push({ name: cls.name, color, avgs });
        });
        const lcML = 30, lcMR = 50, lcTop = 30, lcBot = pageHeight - 35, lcW = pageWidth - lcML - lcMR, lcH = lcBot - lcTop;
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
        for (let pct = 0; pct <= 100; pct += 20) { const y = lcBot - (pct / 100) * lcH; doc.line(lcML, y, lcML + lcW, y); doc.setFont("Amiri", "normal"); doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.text(`${pct}%`, lcML - 3, y + 1.5, { align: "right" }); }
        doc.setTextColor(0, 0, 0);
        const xPoints = periods.map((_, i) => lcML + (i / (periods.length - 1 || 1)) * lcW);
        periodLabels.forEach((label, i) => { doc.setFont("Amiri", "bold"); doc.setFontSize(9); doc.text(label, xPoints[i], lcBot + 8, { align: "center" }); });
        doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.5); doc.line(lcML, lcTop, lcML, lcBot); doc.line(lcML, lcBot, lcML + lcW, lcBot);
        classPerPeriod.forEach((cls2) => {
          doc.setDrawColor(...cls2.color); doc.setLineWidth(1.2);
          const points: { x: number; y: number }[] = [];
          cls2.avgs.forEach((avg, i) => { if (avg === null) return; points.push({ x: xPoints[i], y: lcBot - (avg / 100) * lcH }); });
          for (let i = 1; i < points.length; i++) doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
          points.forEach((pt, i) => { doc.setFillColor(255, 255, 255); doc.circle(pt.x, pt.y, 2.5, "FD"); doc.setFillColor(...cls2.color); doc.circle(pt.x, pt.y, 1.8, "F"); doc.setFontSize(7); doc.setFont("Amiri", "bold"); doc.setTextColor(...cls2.color); doc.text(`${cls2.avgs[periods.indexOf(periods[i])] ?? ""}%`, pt.x, pt.y - 4, { align: "center" }); });
        });
        doc.setTextColor(0, 0, 0);
        const legX = lcML + lcW + 8; let legY = lcTop + 5;
        doc.setFont("Amiri", "bold"); doc.setFontSize(8); doc.text("الفصول:", legX, legY, { align: "right" }); legY += 6;
        classPerPeriod.forEach((cls2) => { doc.setFillColor(...cls2.color); doc.circle(legX - 2, legY - 1.5, 2, "F"); doc.setFont("Amiri", "normal"); doc.setFontSize(7); doc.setTextColor(0, 0, 0); doc.text(cls2.name, legX - 6, legY, { align: "right" }); legY += 6; });
        const zones = [{ min: 90, max: 100, color: [16, 185, 129] as [number, number, number], label: "ممتاز" }, { min: 80, max: 90, color: [59, 130, 246] as [number, number, number], label: "جيد جداً" }, { min: 70, max: 80, color: [251, 191, 36] as [number, number, number], label: "جيد" }, { min: 60, max: 70, color: [249, 115, 22] as [number, number, number], label: "مقبول" }, { min: 0, max: 60, color: [239, 68, 68] as [number, number, number], label: "ضعيف" }];
        doc.saveGraphicsState(); // @ts-ignore
        const zoneGState = new (doc as any).GState({ opacity: 0.07 }); // @ts-ignore
        doc.setGState(zoneGState);
        zones.forEach(zone => { const y1 = lcBot - (zone.max / 100) * lcH; const y2 = lcBot - (zone.min / 100) * lcH; doc.setFillColor(...zone.color); doc.rect(lcML, y1, lcW, y2 - y1, "F"); });
        doc.restoreGraphicsState();
        zones.forEach(zone => { const midY = lcBot - ((zone.min + zone.max) / 2 / 100) * lcH; doc.setFont("Amiri", "normal"); doc.setFontSize(6); doc.setTextColor(...zone.color); doc.text(zone.label, lcML + lcW + 2, midY + 1, { align: "left" }); });
        doc.setTextColor(0, 0, 0);
      }

      // Top 10 / Bottom 10
      doc.addPage("a4", "landscape");
      doc.setFontSize(14); doc.setFont("Amiri", "bold");
      doc.text("⭐ أفضل وأدنى 10 طلاب — الدرجات", pageWidth / 2, 15, { align: "center" });
      const top10 = allStudentAvgs.slice(0, 10); const bottom10 = allStudentAvgs.slice(-10).reverse();
      doc.setFontSize(11); doc.text("⭐ أفضل 10 طلاب", pageWidth - 14, 22, { align: "right" });
      autoTable(doc, { startY: 26, head: [["المعدل %", "الفصل", "الطالب", "#"]], body: top10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] }, margin: { left: pageWidth / 2 + 5 } });
      doc.setFontSize(11); doc.text("⚠ أدنى 10 طلاب", pageWidth / 2 - 10, 22, { align: "right" });
      autoTable(doc, { startY: 26, head: [["المعدل %", "الفصل", "الطالب", "#"]], body: bottom10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] }, margin: { right: pageWidth / 2 + 5 } });

      // Per-class Top/Bottom 5
      data.classes.forEach(cls => {
        const classAvgs2 = cls.students.map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id) })).filter(s => s.avg !== null) as { name: string; avg: number }[];
        classAvgs2.sort((a, b) => b.avg - a.avg);
        if (classAvgs2.length === 0) return;
        doc.addPage("a4", "landscape");
        doc.setFontSize(13); doc.setFont("Amiri", "bold"); doc.text(`ترتيب الطلاب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });
        const classCounts2 = [0, 0, 0, 0, 0]; classAvgs2.forEach(s => { classCounts2[getLevel(s.avg)]++; });
        const miniBarY = 20; let mbx = 30; const mbw = pageWidth - 60;
        classCounts2.forEach((count, li) => { if (count === 0) return; const bw = (count / classAvgs2.length) * mbw; doc.setFillColor(...levelColors[li]); doc.roundedRect(mbx, miniBarY, bw, 6, 1, 1, "F"); if (bw > 12) { doc.setFontSize(6); doc.setFont("Amiri", "bold"); doc.setTextColor(255, 255, 255); doc.text(`${levelLabels[li]} (${count})`, mbx + bw / 2, miniBarY + 4, { align: "center" }); doc.setTextColor(0, 0, 0); } mbx += bw; });
        const ct5 = classAvgs2.slice(0, 5); const cb5 = classAvgs2.slice(-5).reverse();
        doc.setFontSize(11); doc.text("⭐ أفضل 5", pageWidth - 14, 32, { align: "right" });
        autoTable(doc, { startY: 36, head: [["المعدل %", "الطالب", "#"]], body: ct5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] }, margin: { left: pageWidth / 2 + 5 } });
        doc.setFontSize(11); doc.text("⚠ أدنى 5", pageWidth / 2 - 10, 32, { align: "right" });
        autoTable(doc, { startY: 36, head: [["المعدل %", "الطالب", "#"]], body: cb5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] }, margin: { right: pageWidth / 2 + 5 } });
      });

      // Attendance Distribution
      doc.addPage("a4", "landscape");
      doc.setFontSize(14); doc.setFont("Amiri", "bold");
      doc.text("📊 ملخص الحضور والغياب — جميع الفصول", pageWidth / 2, 15, { align: "center" });
      const attColors: [number, number, number][] = [[16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175]];
      const attLabels2 = ["حاضر", "غائب", "متأخر", "لم يُسجل"];
      const attLegY = 22; const attLegX = pageWidth / 2 + 50;
      attLabels2.forEach((label, i) => { const lx = attLegX - i * 30; doc.setFillColor(...attColors[i]); doc.rect(lx, attLegY - 3, 5, 5, "F"); doc.setFont("Amiri", "normal"); doc.setFontSize(8); doc.text(label, lx - 1, attLegY + 1, { align: "right" }); });
      const attChartY = 30; const attBarH2 = Math.min(12, (pageHeight - attChartY - 40) / data.classes.length - 2);
      data.classes.forEach((cls, idx) => {
        const by = attChartY + idx * (attBarH2 + barGap);
        doc.setFont("Amiri", "bold"); doc.setFontSize(9); doc.text(cls.name, pageWidth - 15, by + attBarH2 / 2 + 1.5, { align: "right" });
        const vals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late, cls.attendance.notRecorded];
        let cx3 = chartX;
        vals.forEach((count, li) => { if (count === 0) return; const bw = cls.studentCount > 0 ? (count / cls.studentCount) * chartW : 0; doc.setFillColor(...attColors[li]); doc.roundedRect(cx3, by, bw, attBarH2, 1, 1, "F"); if (bw > 10) { doc.setFontSize(7); doc.setFont("Amiri", "bold"); doc.setTextColor(255, 255, 255); doc.text(String(count), cx3 + bw / 2, by + attBarH2 / 2 + 1.5, { align: "center" }); doc.setTextColor(0, 0, 0); } cx3 += bw; });
        const rate = cls.studentCount > 0 ? Math.round((cls.attendance.present / cls.studentCount) * 100) : 0;
        doc.setFont("Amiri", "normal"); doc.setFontSize(7); doc.text(`${rate}%`, chartX - 2, by + attBarH2 / 2 + 1.5, { align: "right" });
      });
      const totalPresent = data.classes.reduce((s, c) => s + c.attendance.present, 0);
      const totalAbsent = data.classes.reduce((s, c) => s + c.attendance.absent, 0);
      const totalLate = data.classes.reduce((s, c) => s + c.attendance.late, 0);
      const totalAll = data.totalStudents;
      const attSummY = attChartY + data.classes.length * (attBarH2 + barGap) + 10;
      doc.setFont("Amiri", "bold"); doc.setFontSize(11); doc.text("الإحصاء العام للحضور", pageWidth / 2, attSummY, { align: "center" });
      const attStats = [
        { label: "حاضر", count: totalPresent, color: attColors[0], pct: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0 },
        { label: "غائب", count: totalAbsent, color: attColors[1], pct: totalAll > 0 ? Math.round((totalAbsent / totalAll) * 100) : 0 },
        { label: "متأخر", count: totalLate, color: attColors[2], pct: totalAll > 0 ? Math.round((totalLate / totalAll) * 100) : 0 },
      ];
      const attCirclesX = pageWidth / 2 + ((attStats.length - 1) * circleGap) / 2;
      attStats.forEach((st, i) => {
        const cx4 = attCirclesX - i * circleGap; const cy = attSummY + 15;
        doc.setFillColor(245, 245, 245); doc.circle(cx4, cy, circleR, "F"); doc.setFillColor(...st.color); doc.circle(cx4, cy, circleR - 1.5, "F"); doc.setFillColor(255, 255, 255); doc.circle(cx4, cy, circleR - 3.5, "F");
        doc.setFontSize(8); doc.setFont("Amiri", "bold"); doc.setTextColor(...st.color); doc.text(`${st.pct}%`, cx4, cy + 1.5, { align: "center" }); doc.setTextColor(0, 0, 0);
        doc.setFontSize(7); doc.setFont("Amiri", "normal"); doc.text(st.label, cx4, cy + circleR + 5, { align: "center" }); doc.text(`${st.count}`, cx4, cy + circleR + 9, { align: "center" });
      });

      // Top Absentees
      doc.addPage("a4", "landscape");
      doc.setFontSize(14); doc.setFont("Amiri", "bold"); doc.text("⚠ أكثر الطلاب غياباً", pageWidth / 2, 15, { align: "center" });
      const globalAbsentees: { name: string; className: string; count: number }[] = [];
      data.classes.forEach(cls => { cls.topAbsentees.forEach(ta => { globalAbsentees.push({ name: ta.name, className: cls.name, count: ta.count }); }); });
      globalAbsentees.sort((a, b) => b.count - a.count);
      doc.setFontSize(11); doc.text("أكثر 10 طلاب غياباً — جميع الفصول", pageWidth / 2, 22, { align: "center" });
      autoTable(doc, { startY: 26, head: [["عدد الغيابات", "الفصل", "الطالب", "#"]], body: globalAbsentees.slice(0, 10).map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] } });
      data.classes.forEach(cls => {
        if (cls.topAbsentees.length === 0) return;
        doc.addPage("a4", "landscape");
        doc.setFontSize(13); doc.setFont("Amiri", "bold"); doc.text(`أكثر الطلاب غياباً: ${cls.name}`, pageWidth / 2, 15, { align: "center" });
        const attMiniY = 20; const attMiniW = pageWidth - 60; let amx = 30;
        [cls.attendance.present, cls.attendance.absent, cls.attendance.late].forEach((count, li) => {
          if (count === 0) return; const bw = cls.studentCount > 0 ? (count / cls.studentCount) * attMiniW : 0;
          doc.setFillColor(...attColors[li]); doc.roundedRect(amx, attMiniY, bw, 6, 1, 1, "F");
          if (bw > 12) { doc.setFontSize(6); doc.setFont("Amiri", "bold"); doc.setTextColor(255, 255, 255); doc.text(`${attLabels2[li]} (${count})`, amx + bw / 2, attMiniY + 4, { align: "center" }); doc.setTextColor(0, 0, 0); }
          amx += bw;
        });
        autoTable(doc, { startY: 30, head: [["عدد الغيابات", "الطالب", "#"]], body: cls.topAbsentees.slice(0, 5).map((s, i) => [String(s.count), s.name, String(i + 1)]), ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] } });
      });

      // Lessons
      doc.addPage("a4", "landscape");
      doc.setFontSize(13); doc.setFont("Amiri", "bold"); doc.text("خطط الدروس", pageWidth / 2, 15, { align: "center" });
      autoTable(doc, { startY: 20, head: [["نسبة الإنجاز", "المنجز", "الإجمالي", "الفصل"]], body: data.classes.map(cls => { const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0; return [`${pct}%`, String(cls.lessonPlans.completed), String(cls.lessonPlans.total), cls.name]; }), ...tableStyles });

      return { doc, watermark };
    } catch (err) { console.error(err); throw err; }
  }, [data, summaryFocus]);

  const exportPDF = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none" = summaryFocus) => {
    if (!data) return;
    setExporting(true);
    try { const { doc, watermark } = await buildPDF(focus); finalizePDF(doc, `shared-report_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark); toast.success("تم تصدير التقرير بنجاح"); } catch { toast.error("حدث خطأ أثناء التصدير"); }
    setExporting(false);
  }, [data, summaryFocus, buildPDF]);

  const exportSummaryPDF = useCallback(async (withAI: boolean) => {
    if (!data) return;
    setExporting(true);
    try {
      let aiText = "";
      if (withAI) { const { data: aiRes } = await supabase.functions.invoke("summarize-teacher", { body: { teacherName: data.teacherName, schoolName: data.schoolName, classes: data.classes, attendanceRate: data.attendanceRate, totalStudents: data.totalStudents, focus: "comprehensive" } }); aiText = aiRes?.summary || ""; }
      const { doc, watermark } = await buildSummaryPDF(data, { includeAISummary: withAI, aiSummaryText: aiText });
      finalizePDF(doc, `ملخص-مستويات_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير الملخص بنجاح");
    } catch { toast.error("حدث خطأ أثناء التصدير"); }
    setExporting(false);
  }, [data]);

  const shareViaWhatsApp = useCallback(async () => {
    if (!data || !token) return;
    setSharing(true);
    try {
      const { doc, watermark } = await buildPDF(summaryFocus);
      const blob = finalizePDFAsBlob(doc, watermark);
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", blob, "report.pdf");
      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-shared-report`;
      const uploadResp = await fetch(uploadUrl, { method: "POST", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: formData });
      const uploadResult = await uploadResp.json();
      if (!uploadResp.ok || !uploadResult.url) throw new Error(uploadResult.error || "Upload failed");
      const shareLink = window.location.href;
      const message = `📊 *تقرير أعمال المعلم: ${data.teacherName}*\n\n🏫 ${data.schoolName || ''}\n👥 عدد الطلاب: ${data.totalStudents}\n✅ نسبة الحضور: ${data.attendanceRate}%\n\n📄 تحميل التقرير PDF:\n${uploadResult.url}\n\n🔗 رابط العرض المباشر:\n${shareLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      toast.success("تم فتح واتساب للمشاركة");
    } catch (err) { console.error(err); toast.error("حدث خطأ أثناء المشاركة"); }
    setSharing(false);
  }, [data, token, summaryFocus, buildPDF]);

  return { exporting, sharing, summaryFocus, setSummaryFocus, exportPDF, exportSummaryPDF, shareViaWhatsApp, showExportMenu: false, setShowExportMenu: () => {} };
}
