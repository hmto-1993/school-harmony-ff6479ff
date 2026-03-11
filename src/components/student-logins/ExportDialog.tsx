import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import { createArabicPDF, getArabicTableStyles } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface StudentStat {
  id: string;
  name: string;
  classId: string | null;
  count: number;
  lastLogin: string;
}

interface ClassStat {
  id: string;
  name: string;
  totalLogins: number;
  uniqueStudents: number;
}

interface LoginRecord {
  id: string;
  student_id: string;
  class_id: string | null;
  logged_in_at: string;
  students: { full_name: string; national_id: string | null; class_id: string | null } | null;
}

interface ExportDialogProps {
  classStats: ClassStat[];
  studentStats: StudentStat[];
  filteredLogins: LoginRecord[];
  getClassName: (classId: string | null) => string;
  getStudentsForClass: (classId: string) => StudentStat[];
}

export default function ExportDialog({
  classStats,
  studentStats,
  filteredLogins,
  getClassName,
  getStudentsForClass,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetailed, setIncludeDetailed] = useState(true);
  const [includePerClass, setIncludePerClass] = useState(true);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (includeSummary) {
      const classSummary = classStats.map((c) => ({
        "الفصل": c.name,
        "إجمالي الزيارات": c.totalLogins,
        "عدد الطلاب": c.uniqueStudents,
        "متوسط/طالب": c.uniqueStudents > 0 ? +(c.totalLogins / c.uniqueStudents).toFixed(1) : 0,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classSummary), "ملخص الفصول");

      const allStudents = studentStats.map((s, i) => ({
        "#": i + 1,
        "اسم الطالب": s.name,
        "الفصل": getClassName(s.classId),
        "عدد الزيارات": s.count,
        "آخر دخول": format(new Date(s.lastLogin), "yyyy/MM/dd HH:mm"),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allStudents), "ملخص الطلاب");
    }

    if (includeDetailed) {
      const detailed = filteredLogins.map((l, i) => ({
        "#": i + 1,
        "اسم الطالب": l.students?.full_name || "غير معروف",
        "الفصل": getClassName(l.class_id),
        "التاريخ": format(new Date(l.logged_in_at), "yyyy/MM/dd"),
        "الوقت": format(new Date(l.logged_in_at), "hh:mm:ss a", { locale: ar }),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailed), "السجل التفصيلي");
    }

    if (includePerClass) {
      classStats.forEach((c) => {
        const classLogins = filteredLogins.filter((l) => l.class_id === c.id);
        if (classLogins.length === 0) return;
        const data = classLogins.map((l, i) => ({
          "#": i + 1,
          "اسم الطالب": l.students?.full_name || "غير معروف",
          "التاريخ": format(new Date(l.logged_in_at), "yyyy/MM/dd"),
          "الوقت": format(new Date(l.logged_in_at), "hh:mm:ss a", { locale: ar }),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), c.name.substring(0, 31));
      });
    }

    safeWriteXLSX(wb, `سجل_دخول_الطلاب_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("تم تصدير ملف Excel بنجاح");
    setOpen(false);
  };

  const exportPDF = async () => {
    const { doc, startY: headerEndY } = await createArabicPDF({ reportType: "student_logins", includeHeader: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableStyles = getArabicTableStyles();

    doc.setFontSize(16);
    doc.text("سجل دخول الطلاب", pageWidth / 2, headerEndY, { align: "center" });
    doc.setFontSize(10);
    doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, headerEndY + 7, { align: "center" });

    let startY = headerEndY + 15;

    if (includeSummary) {
      doc.setFontSize(12);
      doc.text("ملخص الفصول", pageWidth - 14, startY, { align: "right" });
      autoTable(doc, {
        startY: startY + 4,
        head: [["متوسط/طالب", "عدد الطلاب", "إجمالي الزيارات", "الفصل"]],
        body: classStats.map((c) => [
          c.uniqueStudents > 0 ? (c.totalLogins / c.uniqueStudents).toFixed(1) : "0",
          c.uniqueStudents.toString(),
          c.totalLogins.toString(),
          c.name,
        ]),
        ...tableStyles,
        columnStyles: { 3: { halign: "right" } },
      });
    }

    if (includeDetailed) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("السجل التفصيلي لجميع الطلاب", pageWidth / 2, 15, { align: "center" });
      autoTable(doc, {
        startY: 22,
        head: [["الوقت", "التاريخ", "الفصل", "اسم الطالب", "#"]],
        body: filteredLogins.map((l, i) => [
          format(new Date(l.logged_in_at), "hh:mm:ss a", { locale: ar }),
          format(new Date(l.logged_in_at), "yyyy/MM/dd"),
          getClassName(l.class_id),
          l.students?.full_name || "غير معروف",
          (i + 1).toString(),
        ]),
        ...tableStyles,
        columnStyles: { 3: { halign: "right" } },
      });
    }

    if (includePerClass) {
      classStats.forEach((c) => {
        const classLogins = filteredLogins.filter((l) => l.class_id === c.id);
        if (classLogins.length === 0) return;
        doc.addPage();
        doc.setFontSize(14);
        doc.text(c.name, pageWidth / 2, 15, { align: "center" });
        autoTable(doc, {
          startY: 22,
          head: [["الوقت", "التاريخ", "اسم الطالب", "#"]],
          body: classLogins.map((l, i) => [
            format(new Date(l.logged_in_at), "hh:mm:ss a", { locale: ar }),
            format(new Date(l.logged_in_at), "yyyy/MM/dd"),
            l.students?.full_name || "غير معروف",
            (i + 1).toString(),
          ]),
          ...tableStyles,
          columnStyles: { 2: { halign: "right" } },
        });
      });
    }

    doc.save(`سجل_دخول_الطلاب_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("تم تصدير ملف PDF بنجاح");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          تصدير
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير سجل الدخول</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">اختر المحتوى المراد تصديره:</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="summary" checked={includeSummary} onCheckedChange={(v) => setIncludeSummary(!!v)} />
              <Label htmlFor="summary">ملخص الفصول والطلاب</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="detailed" checked={includeDetailed} onCheckedChange={(v) => setIncludeDetailed(!!v)} />
              <Label htmlFor="detailed">السجل التفصيلي (كل عملية دخول بتاريخها ووقتها)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="perclass" checked={includePerClass} onCheckedChange={(v) => setIncludePerClass(!!v)} />
              <Label htmlFor="perclass">تفاصيل كل فصل في صفحة منفصلة</Label>
            </div>
          </div>
        </div>

        <Tabs defaultValue="excel" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
          </TabsList>
          <TabsContent value="excel" className="pt-4">
            <Button onClick={exportExcel} className="w-full gap-2" disabled={!includeSummary && !includeDetailed && !includePerClass}>
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </Button>
          </TabsContent>
          <TabsContent value="pdf" className="pt-4">
            <Button onClick={exportPDF} className="w-full gap-2" disabled={!includeSummary && !includeDetailed && !includePerClass}>
              <FileText className="h-4 w-4" />
              تصدير PDF
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
