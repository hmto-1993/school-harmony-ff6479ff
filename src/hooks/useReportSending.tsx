import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

export interface AttendanceRow {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
  class_name?: string;
}

export interface GradeRow {
  student_id?: string;
  student_name: string;
  categories: Record<string, number | null>;
  total: number;
}

export interface CategoryMeta {
  id: string;
  name: string;
  max_score: number;
  weight: number;
  group?: string;
}

interface UseReportSendingParams {
  selectedClass: string;
  selectedStudent: string;
  students: { id: string; full_name: string; parent_phone: string | null }[];
  dateFrom: string;
  dateTo: string;
  attendanceData: AttendanceRow[];
  attendanceSummary: { total: number; present: number; absent: number; late: number };
  gradeData: GradeRow[];
  categoryNames: string[];
}

export function useReportSending({
  selectedClass,
  selectedStudent,
  students,
  dateFrom,
  dateTo,
  attendanceData,
  attendanceSummary,
  gradeData,
  categoryNames,
}: UseReportSendingParams) {
  const [sendingSMS, setSendingSMS] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; active: boolean }>({ current: 0, total: 0, active: false });
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; sections: { attendance: boolean; grades: boolean } }>({ open: false, sections: { attendance: true, grades: true } });

  const getReportLabel = (sections: { attendance: boolean; grades: boolean }) => {
    if (sections.attendance && sections.grades) return "تقرير شامل";
    if (sections.attendance) return "تقرير الحضور";
    return "تقرير الدرجات";
  };

  const validateStudentForSend = (): { id: string; full_name: string; parent_phone: string } | null => {
    if (selectedStudent === "all") {
      toast({ title: "تنبيه", description: "اختر طالب محدد لإرسال التقرير لولي أمره", variant: "destructive" });
      return null;
    }
    const student = students.find((s) => s.id === selectedStudent);
    if (!student?.parent_phone) {
      toast({ title: "تنبيه", description: "لا يوجد رقم هاتف لولي أمر هذا الطالب", variant: "destructive" });
      return null;
    }
    return student as { id: string; full_name: string; parent_phone: string };
  };

  const generateStudentReportPDF = async (studentName: string, sections: { attendance: boolean; grades: boolean }): Promise<ArrayBuffer | null> => {
    try {
      const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
      const autoTableImport = await import("jspdf-autotable");
      const autoTable = autoTableImport.default;
      const reportType = sections.attendance && !sections.grades ? "attendance" : sections.grades && !sections.attendance ? "grades" : "attendance";
      const { doc, startY, advanced } = await createArabicPDF({ orientation: "landscape", reportType, includeHeader: true });
      const tableStyles = getArabicTableStyles(advanced);
      const pageWidth = doc.internal.pageSize.getWidth();

      const titleText = sections.attendance && sections.grades
        ? `تقرير الطالب: ${studentName}`
        : sections.attendance
        ? `تقرير حضور الطالب: ${studentName}`
        : `تقرير درجات الطالب: ${studentName}`;

      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text(titleText, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("Amiri", "normal");
      doc.text(`الفترة: ${dateFrom} إلى ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

      let currentY = startY + 15;

      if (sections.attendance && attendanceData.length > 0) {
        doc.setFontSize(13);
        doc.text("تقرير الحضور", pageWidth / 2, currentY, { align: "center" });

        const attTableData = attendanceData.map((r, i) => [
          r.notes || "",
          STATUS_LABELS[r.status] || r.status,
          r.date,
          r.student_name,
          String(i + 1),
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب", "#"]],
          body: attTableData,
          ...tableStyles,
          columnStyles: {
            3: { halign: "right" as const, fontStyle: "bold" as const },
            4: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text(
          `حاضر: ${attendanceSummary.present} | غائب: ${attendanceSummary.absent} | متأخر: ${attendanceSummary.late} | الإجمالي: ${attendanceSummary.total}`,
          pageWidth / 2,
          currentY,
          { align: "center" }
        );
        currentY += 10;
      }

      if (sections.grades && gradeData.length > 0) {
        if (sections.attendance && currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage("a4", "landscape");
          currentY = 15;
        }
        doc.setFontSize(13);
        doc.text("تقرير الدرجات", pageWidth / 2, currentY, { align: "center" });

        const head = ["المجموع", ...categoryNames.slice().reverse(), "اسم الطالب", "#"];
        const body = gradeData.map((r, i) => [
          String(r.total),
          ...categoryNames.slice().reverse().map((n) => (r.categories[n] !== null ? String(r.categories[n]) : "—")),
          r.student_name,
          String(i + 1),
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [head],
          body,
          ...tableStyles,
          columnStyles: {
            [head.length - 2]: { halign: "right" as const, fontStyle: "bold" as const },
            [head.length - 1]: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
            0: { fillColor: [219, 234, 254] as [number, number, number], fontStyle: "bold" as const },
          },
        });
      }

      return doc.output("arraybuffer");
    } catch (err) {
      console.error("PDF generation error:", err);
      return null;
    }
  };

  const generateAndUploadPDF = async (studentName: string, studentId: string, sections: { attendance: boolean; grades: boolean }): Promise<string | null> => {
    toast({ title: "جارٍ إعداد التقرير...", description: "يتم إنشاء ملف PDF" });
    const pdfBuffer = await generateStudentReportPDF(studentName, sections);
    if (!pdfBuffer) {
      toast({ title: "خطأ", description: "فشل إنشاء ملف PDF", variant: "destructive" });
      return null;
    }

    const fileName = `report_${studentId}_${dateFrom}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      toast({ title: "خطأ", description: "فشل رفع الملف: " + uploadError.message, variant: "destructive" });
      return null;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("reports").createSignedUrl(fileName, 3600);
    if (signedUrlError) {
      toast({ title: "خطأ", description: "فشل إنشاء رابط التقرير", variant: "destructive" });
      return null;
    }
    return signedUrlData?.signedUrl || null;
  };

  const handleSendSMS = async (sections: { attendance: boolean; grades: boolean }) => {
    const student = validateStudentForSend();
    if (!student) return;

    setSendingSMS(true);
    try {
      const pdfUrl = await generateAndUploadPDF(student.full_name, student.id, sections);
      if (!pdfUrl) { setSendingSMS(false); return; }

      const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: student.parent_phone, message },
      });

      if (error || !data?.success) {
        toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
      } else {
        toast({ title: "تم ✅", description: "تم إرسال التقرير عبر SMS بنجاح" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setSendingSMS(false);
  };

  const handleSendWhatsApp = async (sections: { attendance: boolean; grades: boolean }) => {
    const student = validateStudentForSend();
    if (!student) return;

    setSendingSMS(true);
    try {
      const pdfUrl = await generateAndUploadPDF(student.full_name, student.id, sections);
      if (!pdfUrl) { setSendingSMS(false); return; }

      let phone = student.parent_phone.replace(/[\s\-\+]/g, "");
      if (phone.startsWith("0")) phone = "966" + phone.slice(1);
      if (!phone.startsWith("966")) phone = "966" + phone;

      const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      toast({ title: "تم ✅", description: "تم فتح واتساب مع رسالة التقرير" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setSendingSMS(false);
  };

  const handleBulkSendSMS = async (sections: { attendance: boolean; grades: boolean }) => {
    if (!selectedClass) return;

    const studentsWithPhone = students.filter((s) => s.parent_phone);
    if (studentsWithPhone.length === 0) {
      toast({ title: "تنبيه", description: "لا يوجد طلاب بأرقام هواتف أولياء أمور في هذا الفصل", variant: "destructive" });
      return;
    }

    setSendingSMS(true);
    setBulkProgress({ current: 0, total: studentsWithPhone.length, active: true });

    let successCount = 0;
    let failCount = 0;

    const allAttendance: Record<string, AttendanceRow[]> = {};
    const allGrades: Record<string, GradeRow> = {};

    if (sections.attendance) {
      const { data: attData } = await supabase
        .from("attendance_records")
        .select("status, notes, date, student_id, students(full_name)")
        .eq("class_id", selectedClass)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });

      (attData || []).forEach((r: any) => {
        const sid = r.student_id;
        if (!allAttendance[sid]) allAttendance[sid] = [];
        allAttendance[sid].push({
          student_name: r.students?.full_name || "—",
          student_id: sid,
          date: r.date,
          status: r.status,
          notes: r.notes,
        });
      });
    }

    if (sections.grades) {
      const { data: cats } = await supabase
        .from("grade_categories")
        .select("id, name, weight, max_score")
        .eq("class_id", selectedClass)
        .order("sort_order");
      const categories = cats || [];

      const studentIds = studentsWithPhone.map((s) => s.id);
      const { data: gradesData } = await supabase
        .from("grades")
        .select("student_id, category_id, score")
        .in("student_id", studentIds);

      const gradeMap: Record<string, Record<string, number | null>> = {};
      (gradesData || []).forEach((g: any) => {
        if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
        gradeMap[g.student_id][g.category_id] = g.score;
      });

      studentsWithPhone.forEach((s) => {
        const catScores: Record<string, number | null> = {};
        let total = 0;
        categories.forEach((cat) => {
          const score = gradeMap[s.id]?.[cat.id] ?? null;
          catScores[cat.name] = score;
          if (score !== null) total += (score / cat.max_score) * cat.weight;
        });
        allGrades[s.id] = { student_name: s.full_name, categories: catScores, total: Math.round(total * 100) / 100 };
      });
    }

    for (let i = 0; i < studentsWithPhone.length; i++) {
      const student = studentsWithPhone[i];
      setBulkProgress({ current: i + 1, total: studentsWithPhone.length, active: true });

      try {
        const studentAttendance = allAttendance[student.id] || [];
        const studentGrade = allGrades[student.id];
        const studentAttSummary = {
          total: studentAttendance.length,
          present: studentAttendance.filter((r) => r.status === "present").length,
          absent: studentAttendance.filter((r) => r.status === "absent").length,
          late: studentAttendance.filter((r) => r.status === "late").length,
        };

        const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
        const autoTableImport = await import("jspdf-autotable");
        const autoTable = autoTableImport.default;
        const reportType = sections.attendance && !sections.grades ? "attendance" : "grades";
        const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType, includeHeader: true });
        const tableStyles = getArabicTableStyles();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(14);
        doc.setFont("Amiri", "bold");
        doc.text(`تقرير الطالب: ${student.full_name}`, pageWidth / 2, startY, { align: "center" });
        doc.setFontSize(9);
        doc.setFont("Amiri", "normal");
        doc.text(`الفترة: ${dateFrom} إلى ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

        let currentY = startY + 15;

        if (sections.attendance && studentAttendance.length > 0) {
          doc.setFontSize(13);
          doc.text("تقرير الحضور", pageWidth / 2, currentY, { align: "center" });
          autoTable(doc, {
            startY: currentY + 5,
            head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب", "#"]],
            body: studentAttendance.map((r, i) => [r.notes || "", STATUS_LABELS[r.status] || r.status, r.date, r.student_name, String(i + 1)]),
            ...tableStyles,
            columnStyles: {
              3: { halign: "right" as const, fontStyle: "bold" as const },
              4: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
            },
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(10);
          doc.text(`حاضر: ${studentAttSummary.present} | غائب: ${studentAttSummary.absent} | متأخر: ${studentAttSummary.late}`, pageWidth / 2, currentY, { align: "center" });
          currentY += 10;
        }

        if (sections.grades && studentGrade) {
          if (sections.attendance && currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage("a4", "landscape");
            currentY = 15;
          }
          doc.setFontSize(13);
          doc.text("تقرير الدرجات", pageWidth / 2, currentY, { align: "center" });
          const catNames = Object.keys(studentGrade.categories);
          const head = ["المجموع", ...catNames.slice().reverse(), "اسم الطالب", "#"];
          autoTable(doc, {
            startY: currentY + 5,
            head: [head],
            body: [[String(studentGrade.total), ...catNames.slice().reverse().map((n) => studentGrade.categories[n] !== null ? String(studentGrade.categories[n]) : "—"), studentGrade.student_name, "1"]],
            ...tableStyles,
            columnStyles: {
              [head.length - 2]: { halign: "right" as const, fontStyle: "bold" as const },
              [head.length - 1]: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
              0: { fillColor: [219, 234, 254] as [number, number, number], fontStyle: "bold" as const },
            },
          });
        }

        const pdfBuffer = doc.output("arraybuffer");
        const fileName = `report_${student.id}_${dateFrom}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadError) { failCount++; continue; }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("reports").createSignedUrl(fileName, 3600);
        if (signedUrlError) { failCount++; continue; }
        const pdfUrl = signedUrlData?.signedUrl;

        const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { phone: student.parent_phone, message },
        });

        if (error || !data?.success) failCount++;
        else successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkProgress({ current: 0, total: 0, active: false });
    setSendingSMS(false);
    toast({
      title: "تم الإرسال الجماعي ✅",
      description: `نجح: ${successCount} | فشل: ${failCount} من أصل ${studentsWithPhone.length} طالب`,
    });
  };

  return {
    sendingSMS,
    bulkProgress,
    bulkConfirm,
    setBulkConfirm,
    handleSendSMS,
    handleSendWhatsApp,
    handleBulkSendSMS,
    getReportLabel,
    STATUS_LABELS,
  };
}
