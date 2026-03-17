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
import html2canvas from "html2canvas";
import { toast } from "sonner";

export interface ExportTableGroup {
  className: string;
  headers: string[];
  rows: string[][];
  /** Optional top-level grouped header row */
  groupHeaders?: { label: string; colSpan: number }[];
  /** Optional cell text colors: key = "rowIdx-colIdx" (0-based data row & col), value = hex color */
  cellColors?: Record<string, string>;
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
  /** Optional ref to a DOM element to capture as-is for PDF (html2canvas) */
  tableRef?: React.RefObject<HTMLDivElement>;
}

export default function GradesExportDialog({ title, fileName, groups, extraSheets, trigger, tableRef }: GradesExportDialogProps) {
  const [open, setOpen] = useState(false);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    groups.forEach((group) => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      let startRow = 0;

      // If groupHeaders exist, add the merged group header row first
      if (group.groupHeaders && group.groupHeaders.length > 0) {
        // Expand group header row to full column count (one cell per column)
        const expandedRow: (string)[] = [];
        const merges: XLSX.Range[] = [];
        let col = 0;
        group.groupHeaders.forEach(gh => {
          expandedRow.push(gh.label);
          if (gh.colSpan > 1) {
            merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + gh.colSpan - 1 } });
            for (let j = 1; j < gh.colSpan; j++) {
              expandedRow.push('');
            }
          }
          col += gh.colSpan;
        });
        XLSX.utils.sheet_add_aoa(ws, [expandedRow], { origin: { r: 0, c: 0 } });
        if (merges.length > 0) ws["!merges"] = merges;
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
    // If tableRef is provided, use html2canvas to capture the exact table appearance
    if (tableRef?.current) {
      try {
        const { doc, startY: headerEndY, watermark } = await createArabicPDF({
          reportType: "grades",
          includeHeader: true,
        });
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, headerEndY, { align: "center" });
        doc.setFontSize(10);
        doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, headerEndY + 7, { align: "center" });

        // Temporarily expand container to full width so all columns are captured
        const el = tableRef.current;
        const origOverflow = el.style.overflow;
        const origWidth = el.style.width;
        const origMaxWidth = el.style.maxWidth;
        el.style.overflow = 'visible';
        el.style.width = `${el.scrollWidth}px`;
        el.style.maxWidth = 'none';

        // Hide interactive elements (buttons)
        const buttons = el.querySelectorAll('button');
        buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');
        // Hide separators
        const separators = el.querySelectorAll('span.w-px');
        separators.forEach(sep => (sep as HTMLElement).style.display = 'none');

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: el.scrollWidth,
        });

        // Restore everything
        el.style.overflow = origOverflow;
        el.style.width = origWidth;
        el.style.maxWidth = origMaxWidth;
        buttons.forEach(btn => (btn as HTMLElement).style.display = '');
        separators.forEach(sep => (sep as HTMLElement).style.display = '');

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - 20; // 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const startImgY = headerEndY + 15;

        const pageHeight = doc.internal.pageSize.getHeight();
        const availableHeight = pageHeight - startImgY - 10;

        if (imgHeight <= availableHeight) {
          doc.addImage(imgData, "PNG", 10, startImgY, imgWidth, imgHeight);
        } else {
          // Multi-page: slice the canvas
          const pageImgHeight = availableHeight;
          const sourcePageHeight = (pageImgHeight / imgWidth) * canvas.width;
          let srcY = 0;
          let isFirstPage = true;

          while (srcY < canvas.height) {
            const sliceHeight = Math.min(sourcePageHeight, canvas.height - srcY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;
            const ctx = sliceCanvas.getContext('2d')!;
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

            const sliceData = sliceCanvas.toDataURL("image/png");
            const sliceImgH = (sliceHeight * imgWidth) / canvas.width;

            if (!isFirstPage) doc.addPage();
            doc.addImage(sliceData, "PNG", 10, isFirstPage ? startImgY : 10, imgWidth, sliceImgH);

            srcY += sliceHeight;
            isFirstPage = false;
          }
        }

        finalizePDF(doc, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
        toast.success("تم تصدير ملف PDF بنجاح");
        setOpen(false);
        return;
      } catch (error) {
        console.error("html2canvas PDF error:", error);
        toast.error("حدث خطأ أثناء تصدير PDF");
        return;
      }
    }

    // Fallback: use autoTable for PDF generation
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

    groups.forEach((group, gIdx) => {
      if (gIdx > 0) doc.addPage("a4", "landscape");

      const startY = gIdx === 0 ? headerEndY + 15 : 15;

      doc.setFontSize(13);
      doc.text(group.className, pageWidth / 2, startY, { align: "center" });

      const reversedHeaders = [...group.headers].reverse();
      const reversedRows = group.rows.map((r) => [...r].reverse());

      const headRows: string[][] = [];
      if (group.groupHeaders && group.groupHeaders.length > 0) {
        const reversedGroupHeaders = [...group.groupHeaders].reverse();
        const expandedRow: string[] = [];
        reversedGroupHeaders.forEach(gh => {
          expandedRow.push(gh.label);
          for (let j = 1; j < gh.colSpan; j++) {
            expandedRow.push('');
          }
        });
        headRows.push(expandedRow);
      }
      headRows.push(reversedHeaders);

      autoTable(doc, {
        startY: startY + 5,
        head: headRows,
        body: reversedRows,
        ...tableStyles,
        styles: { ...tableStyles.styles, fontSize: 8 },
        didParseCell: (data: any) => {
          if (group.groupHeaders && group.groupHeaders.length > 0 && data.section === 'head' && data.row.index === 0) {
            const reversedGH = [...group.groupHeaders!].reverse();
            let colOffset = 0;
            for (let i = 0; i < reversedGH.length; i++) {
              if (data.column.index === colOffset) {
                if (reversedGH[i].colSpan > 1) {
                  data.cell.colSpan = reversedGH[i].colSpan;
                }
                break;
              }
              colOffset += reversedGH[i].colSpan;
            }
            let checkCol = 0;
            for (let i = 0; i < reversedGH.length; i++) {
              if (data.column.index > checkCol && data.column.index < checkCol + reversedGH[i].colSpan) {
                data.cell.colSpan = 0;
                break;
              }
              checkCol += reversedGH[i].colSpan;
            }
          }
        },
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
