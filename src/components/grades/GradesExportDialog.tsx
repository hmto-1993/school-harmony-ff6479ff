import { useState } from "react";
import { safePrint } from "@/lib/print-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { createArabicPDF, getArabicTableStyles, finalizePDF } from "@/lib/arabic-pdf";
import { safeWriteXLSX } from "@/lib/download-utils";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export interface ExportTableGroup {
  className: string;
  headers: string[];
  rows: string[][];
  /** Optional top-level grouped header row: each entry is "label::colSpan" or just "label" (colSpan=1). Use "" to skip (rowSpan from headers). */
  groupHeaders?: { label: string; colSpan: number }[];
}

export interface ExportExtraSheet {
  name: string;
  data: Record<string, string | number>[];
}

interface GradesExportDialogProps {
  title: string;
  fileName: string;
  groups: ExportTableGroup[];
  extraSheets?: ExportExtraSheet[];
  trigger?: React.ReactNode;
}

export default function GradesExportDialog({ title, fileName, groups, extraSheets, trigger }: GradesExportDialogProps) {
  const [open, setOpen] = useState(false);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    groups.forEach((group) => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      let startRow = 0;

      // If groupHeaders exist, add the merged group header row first
      if (group.groupHeaders && group.groupHeaders.length > 0) {
        const groupRow = group.groupHeaders.map(gh => gh.label);
        XLSX.utils.sheet_add_aoa(ws, [groupRow], { origin: { r: 0, c: 0 } });
        // Set up merges for colSpan > 1
        const merges: XLSX.Range[] = [];
        let col = 0;
        group.groupHeaders.forEach(gh => {
          if (gh.colSpan > 1) {
            merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + gh.colSpan - 1 } });
          }
          col += gh.colSpan;
        });
        ws["!merges"] = merges;
        startRow = 1;
      }

      // Add detail headers
      XLSX.utils.sheet_add_aoa(ws, [group.headers], { origin: { r: startRow, c: 0 } });

      // Add data rows
      const dataRows = group.rows.map((row) =>
        row.map((val) => {
          const num = Number(val);
          return !isNaN(num) && val !== "" && !val.includes("/") ? num : val;
        })
      );
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: { r: startRow + 1, c: 0 } });

      const sheetName = group.className.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Add extra sheets (e.g. statistics)
    extraSheets?.forEach((sheet) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.data), sheet.name.substring(0, 31));
    });

    safeWriteXLSX(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("تم تصدير ملف Excel بنجاح");
    setOpen(false);
  };

  const exportPDF = async () => {
    const { doc, startY: headerEndY, watermark } = await createArabicPDF({
      reportType: "grades",
      includeHeader: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableStyles = getArabicTableStyles();

    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, headerEndY, { align: "center" });
    doc.setFontSize(10);
    doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, headerEndY + 7, { align: "center" });

    let isFirst = true;

    groups.forEach((group) => {
      if (!isFirst) doc.addPage("a4", "landscape");
      isFirst = false;

      const startY = isFirst ? headerEndY + 15 : 15;

      doc.setFontSize(13);
      doc.text(group.className, pageWidth / 2, startY, { align: "center" });

      // Reverse headers/rows for RTL display
      const reversedHeaders = [...group.headers].reverse();
      const reversedRows = group.rows.map((r) => [...r].reverse());

      autoTable(doc, {
        startY: startY + 5,
        head: [reversedHeaders],
        body: reversedRows,
        ...tableStyles,
        styles: { ...tableStyles.styles, fontSize: 8 },
      });
    });

    finalizePDF(doc, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
    toast.success("تم تصدير ملف PDF بنجاح");
    setOpen(false);
  };

  const handlePrint = () => {
    setOpen(false);
    setTimeout(() => safePrint(), 300);
  };

  if (groups.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير" onClick={(e) => { e.preventDefault(); setOpen(true); }}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={(e) => { e.preventDefault(); e.stopPropagation(); safePrint(); }}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير {title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="excel" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="print" className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </TabsTrigger>
          </TabsList>
          <TabsContent value="excel" className="pt-4">
            <Button onClick={exportExcel} className="w-full gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </Button>
          </TabsContent>
          <TabsContent value="pdf" className="pt-4">
            <Button onClick={exportPDF} className="w-full gap-2">
              <FileText className="h-4 w-4" />
              تصدير PDF
            </Button>
          </TabsContent>
          <TabsContent value="print" className="pt-4">
            <Button onClick={handlePrint} className="w-full gap-2">
              <Printer className="h-4 w-4" />
              طباعة الصفحة
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
