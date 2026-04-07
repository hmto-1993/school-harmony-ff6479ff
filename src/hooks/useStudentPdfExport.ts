import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ParentVisibility, PdfHeader } from "@/components/student-dashboard/constants";

export function useStudentPdfExport(
  student: any,
  isParent: boolean,
  parentVis: ParentVisibility,
  schoolName: string,
  schoolLogoUrl: string,
  parentPdfHeader: PdfHeader,
) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!student) return;
    setExportingPdf(true);
    try {
      const vis = student.visibility || { grades: true, attendance: true, behavior: true };
      const effectiveVis = isParent ? {
        grades: vis.grades && parentVis.parentShowGrades,
        attendance: vis.attendance && parentVis.parentShowAttendance,
        behavior: vis.behavior && parentVis.parentShowBehavior,
      } : vis;

      const container = document.createElement("div");
      container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:#fff;padding:30px 40px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;color:#1a1a2e;";

      let html = "";

      // Custom PDF Header
      const hasCustomHeader = parentPdfHeader.line1 || parentPdfHeader.line2 || parentPdfHeader.line3;
      if (hasCustomHeader) {
        html += `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">`;
        if (parentPdfHeader.showLogo && schoolLogoUrl) {
          html += `<img src="${schoolLogoUrl}" style="width:60px;height:60px;border-radius:8px;object-fit:contain;" crossorigin="anonymous" />`;
        }
        html += `<div style="text-align:center;flex:1;">`;
        if (parentPdfHeader.line1) html += `<p style="font-size:14px;font-weight:bold;margin:0 0 2px;color:#1e3a5f;">${parentPdfHeader.line1}</p>`;
        if (parentPdfHeader.line2) html += `<p style="font-size:12px;margin:0 0 2px;color:#333;">${parentPdfHeader.line2}</p>`;
        if (parentPdfHeader.line3) html += `<p style="font-size:12px;margin:0 0 2px;color:#333;">${parentPdfHeader.line3}</p>`;
        html += `</div>`;
        if (parentPdfHeader.showLogo && schoolLogoUrl) html += `<div style="width:60px;"></div>`;
        html += `</div>`;
        html += `<hr style="border:none;border-top:2px solid #1e3a5f;margin:0 0 12px;">`;
      } else if (schoolName) {
        html += `<h1 style="text-align:center;font-size:20px;margin:0 0 4px;color:#1e3a5f;">${schoolName}</h1>`;
      }

      html += `<h2 style="text-align:center;font-size:16px;margin:0 0 4px;color:#333;">تقرير الطالب: ${student.full_name}</h2>`;
      const classInfo = student.class ? `${student.class.name} - ${student.class.grade} (${student.class.section})` : "";
      if (classInfo) html += `<p style="text-align:center;font-size:12px;margin:0 0 2px;color:#666;">${classInfo}</p>`;
      if (parentVis.parentShowNationalId && student.national_id) {
        html += `<p style="text-align:center;font-size:12px;margin:0 0 2px;color:#666;">الهوية الوطنية: ${student.national_id}</p>`;
      }
      html += `<p style="text-align:center;font-size:11px;margin:0 0 12px;color:#999;">تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}</p>`;
      html += `<hr style="border:none;border-top:1px solid #ddd;margin:0 0 16px;">`;

      const tableStyle = `width:100%;border-collapse:collapse;margin:0 0 20px;font-size:11px;`;
      const thStyle = `background:#f0f4f8;padding:6px 10px;text-align:right;border:1px solid #ddd;font-weight:bold;color:#1e3a5f;`;
      const tdStyle = `padding:5px 10px;text-align:right;border:1px solid #eee;`;

      // SVG icons
      const svgStar = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      const svgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
      const svgMinus = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>`;
      const svgX = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
      const emptyCircle = `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;border:1.5px solid #ccc;"></span>`;

      const pdfGetLevel = (score: number | null, maxScore: number, catName: string) => {
        if (score === null || score === undefined) return null;
        const isPartic = catName === "المشاركة" || catName.includes("المشاركة");
        if (score >= maxScore && isPartic) return "star";
        if (score >= maxScore) return "excellent";
        if (score === 0) return "zero";
        const slotCount = isPartic ? 3 : 1;
        const perSlot = Math.round(maxScore / slotCount);
        const averageScore = Math.round(perSlot / 2);
        if (score >= perSlot) return "excellent";
        if (score >= averageScore) return "average";
        return "zero";
      };
      const pdfGetIconHtml = (level: string | null) => {
        if (level === "star") return svgStar;
        if (level === "excellent") return svgCheck;
        if (level === "average") return svgMinus;
        if (level === "zero") return svgX;
        return emptyCircle;
      };
      const pdfGetIconLevel = (score: number | null, maxScore: number, catName: string): { level: string; isStar: boolean }[] => {
        if (score === null || score === undefined) return [{ level: "zero", isStar: false }];
        if (score <= 0) return [{ level: "zero", isStar: false }];
        const isPartic = catName === "المشاركة" || catName.includes("المشاركة");
        if (score >= maxScore && isPartic) return [{ level: "excellent", isStar: true }];
        if (score >= maxScore) return [{ level: "excellent", isStar: false }];
        const slotCount = isPartic ? 3 : 1;
        const perSlot = Math.round(maxScore / slotCount);
        const averageScore = Math.round(perSlot / 2);
        const icons: { level: string; isStar: boolean }[] = [];
        let remaining = score;
        while (remaining > 0 && icons.length < slotCount) {
          if (remaining >= perSlot) { icons.push({ level: "excellent", isStar: false }); remaining -= perSlot; }
          else if (remaining >= averageScore) { icons.push({ level: "average", isStar: false }); remaining -= averageScore; }
          else { icons.push({ level: "average", isStar: false }); remaining = 0; }
        }
        return icons.length > 0 ? icons : [{ level: "zero", isStar: false }];
      };
      const pdfIconFromObj = (icon: { level: string; isStar: boolean }) => {
        if (icon.isStar) return svgStar;
        if (icon.level === "excellent") return svgCheck;
        if (icon.level === "average") return svgMinus;
        return svgX;
      };

      // Grades
      if (effectiveVis.grades && student.grades.length > 0) {
        const cwGrades = student.grades.filter((g: any) => g.grade_categories?.category_group === "classwork");

        const dailyGrades = cwGrades.filter((g: any) => g.date);
        if (dailyGrades.length > 0) {
          const uniqueDates = Array.from(new Set<string>(dailyGrades.map((g: any) => g.date))).sort().slice(-7);
          const dailyCatNames = Array.from(new Set<string>(dailyGrades.map((g: any) => g.grade_categories?.name).filter(Boolean)));
          const dayLabels: Record<number, string> = { 0: "الأحد", 1: "الإثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };
          html += `<h3 style="font-size:14px;margin:0 0 8px;color:#1e3a5f;">📅 تفاعل اليوم</h3>`;
          html += `<table style="${tableStyle}"><thead><tr>`;
          html += `<th style="${thStyle}">اليوم</th>`;
          dailyCatNames.forEach(name => { html += `<th style="${thStyle}text-align:center;">${name}</th>`; });
          html += `</tr></thead><tbody>`;
          uniqueDates.forEach((date, di) => {
            const d = new Date(date);
            const bg = di % 2 === 0 ? "#fff" : "#fafbfc";
            html += `<tr style="background:${bg}">`;
            html += `<td style="${tdStyle}font-weight:bold;">${dayLabels[d.getDay()] || ""} ${d.getDate()}/${d.getMonth() + 1}</td>`;
            dailyCatNames.forEach(catName => {
              const grade = dailyGrades.find((g: any) => g.date === date && g.grade_categories?.name === catName);
              const level = grade ? pdfGetLevel(grade.score, grade.grade_categories?.max_score || 100, catName) : null;
              html += `<td style="${tdStyle}text-align:center;">${pdfGetIconHtml(level)}</td>`;
            });
            html += `</tr>`;
          });
          html += `</tbody></table>`;
        }

        if (cwGrades.length > 0) {
          const cwCatNames = Array.from(new Set<string>(cwGrades.map((g: any) => g.grade_categories?.name).filter(Boolean)));
          html += `<h3 style="font-size:14px;margin:0 0 8px;color:#1e3a5f;">📊 التفاعل الكلي</h3>`;
          html += `<table style="${tableStyle}"><thead><tr>`;
          html += `<th style="${thStyle}">فئة التقييم</th><th style="${thStyle}text-align:center;">التقييم</th>`;
          html += `</tr></thead><tbody>`;
          cwCatNames.forEach((catName, ci) => {
            const catGrades = cwGrades.filter((g: any) => g.grade_categories?.name === catName).sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
            const allIcons = catGrades.flatMap((g: any) => pdfGetIconLevel(g.score, g.grade_categories?.max_score || 100, catName));
            const pdfIconsCount = isParent ? parentVis.parentClassworkIconsCount : (student.evalSettings?.iconsCount || 15);
            const displayIcons = allIcons.slice(-pdfIconsCount);
            const bg = ci % 2 === 0 ? "#fff" : "#fafbfc";
            html += `<tr style="background:${bg}">`;
            html += `<td style="${tdStyle}font-weight:bold;">${catName}</td>`;
            html += `<td style="${tdStyle}text-align:center;"><div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">`;
            displayIcons.forEach(icon => { html += pdfIconFromObj(icon); });
            if (displayIcons.length === 0) html += `<span style="color:#999;font-size:11px;">لا توجد بيانات</span>`;
            html += `</div></td></tr>`;
          });
          html += `</tbody></table>`;
        }

        html += `<div style="display:flex;gap:16px;justify-content:center;margin:0 0 16px;font-size:10px;color:#666;">`;
        html += `<span style="display:flex;align-items:center;gap:4px;">${svgStar} متميز</span>`;
        html += `<span style="display:flex;align-items:center;gap:4px;">${svgCheck} ممتاز</span>`;
        html += `<span style="display:flex;align-items:center;gap:4px;">${svgMinus} متوسط</span>`;
        html += `<span style="display:flex;align-items:center;gap:4px;">${svgX} ضعيف</span>`;
        html += `</div>`;
      }

      // Attendance
      const statusLabels: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", early_leave: "خروج مبكر", sick_leave: "إجازة مرضية" };
      if (effectiveVis.attendance && student.attendance.length > 0) {
        html += `<h3 style="font-size:14px;margin:0 0 8px;color:#1e3a5f;">✔ الحضور والغياب</h3>`;
        html += `<table style="${tableStyle}"><thead><tr>`;
        html += `<th style="${thStyle}">التاريخ</th><th style="${thStyle}">الحالة</th><th style="${thStyle}">ملاحظات</th>`;
        html += `</tr></thead><tbody>`;
        student.attendance.forEach((a: any, i: number) => {
          const bg = i % 2 === 0 ? "#fff" : "#fafbfc";
          html += `<tr style="background:${bg}"><td style="${tdStyle}">${a.date}</td><td style="${tdStyle}">${statusLabels[a.status] || a.status}</td><td style="${tdStyle}">${a.notes || "-"}</td></tr>`;
        });
        html += `</tbody></table>`;
      }

      // Behavior
      const svgThumbsUp = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;
      const svgThumbsDown = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>`;
      const svgMinusBehavior = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`;

      const behaviorTypeMap: Record<string, { label: string; icon: string; color: string; bg: string }> = {
        positive: { label: "إيجابي", icon: svgThumbsUp, color: "#16a34a", bg: "#f0fdf4" },
        negative: { label: "سلبي", icon: svgThumbsDown, color: "#e11d48", bg: "#fff1f2" },
        neutral: { label: "محايد", icon: svgMinusBehavior, color: "#f59e0b", bg: "#fffbeb" },
        "إيجابي": { label: "إيجابي", icon: svgThumbsUp, color: "#16a34a", bg: "#f0fdf4" },
        "سلبي": { label: "سلبي", icon: svgThumbsDown, color: "#e11d48", bg: "#fff1f2" },
        "محايد": { label: "محايد", icon: svgMinusBehavior, color: "#f59e0b", bg: "#fffbeb" },
      };
      const defaultBehavior = { label: "—", icon: svgMinusBehavior, color: "#999", bg: "#f9fafb" };
      const cleanBehaviorNote = (note?: string) => {
        if (!note) return "-";
        return note.replace(/\[severity:\w+\]\s*/g, "").trim() || "-";
      };

      if (effectiveVis.behavior && student.behaviors.length > 0) {
        html += `<h3 style="font-size:14px;margin:0 0 8px;color:#1e3a5f;">🎯 التقييمات السلوكية</h3>`;
        // Legend
        html += `<div style="display:flex;gap:16px;justify-content:center;margin:0 0 10px;font-size:10px;">`;
        html += `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;font-weight:600;">${svgThumbsUp} إيجابي</span>`;
        html += `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#fffbeb;border:1px solid #fde68a;color:#f59e0b;font-weight:600;">${svgMinusBehavior} محايد</span>`;
        html += `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#fff1f2;border:1px solid #fecdd3;color:#e11d48;font-weight:600;">${svgThumbsDown} سلبي</span>`;
        html += `</div>`;
        html += `<table style="${tableStyle}"><thead><tr>`;
        html += `<th style="${thStyle}width:30px;">#</th><th style="${thStyle}">التاريخ</th><th style="${thStyle}text-align:center;width:60px;">السلوك</th><th style="${thStyle}">الملاحظة</th>`;
        html += `</tr></thead><tbody>`;
        student.behaviors.forEach((b: any, i: number) => {
          const bg = i % 2 === 0 ? "#fff" : "#fafbfc";
          const info = behaviorTypeMap[b.type] || defaultBehavior;
          html += `<tr style="background:${bg}">`;
          html += `<td style="${tdStyle}color:#999;font-weight:600;">${i + 1}</td>`;
          html += `<td style="${tdStyle}font-weight:600;">${b.date}</td>`;
          html += `<td style="${tdStyle}text-align:center;"><div style="display:inline-flex;padding:4px;border-radius:8px;background:${info.bg};">${info.icon}</div></td>`;
          html += `<td style="${tdStyle}color:#666;">${cleanBehaviorNote(b.note)}</td>`;
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }

      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      document.body.removeChild(container);

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const doc = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save(`تقرير_${student.full_name}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    }
    setExportingPdf(false);
  };

  return { exportingPdf, handleExportPdf };
}
