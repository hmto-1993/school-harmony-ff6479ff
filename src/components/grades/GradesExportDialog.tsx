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
  groupHeaders?: { label: string; colSpan: number }[];
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
  tableRef?: React.RefObject<HTMLDivElement>;
}

export default function GradesExportDialog({ title, fileName, groups, extraSheets, trigger, tableRef }: GradesExportDialogProps) {
  const [open, setOpen] = useState(false);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    groups.forEach((group) => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      let startRow = 0;

      if (group.groupHeaders && group.groupHeaders.length > 0) {
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

      XLSX.utils.sheet_add_aoa(ws, [group.headers], { origin: { r: startRow, c: 0 } });

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

    extraSheets?.forEach((sheet) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.data), sheet.name.substring(0, 31));
    });

    safeWriteXLSX(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("تم تصدير ملف Excel بنجاح");
    setOpen(false);
  };

  const exportPDF = async () => {
    // html2canvas path: capture the exact visible table
    if (tableRef?.current) {
      try {
        const { doc, startY: headerEndY, watermark } = await createArabicPDF({
          reportType: "grades",
          includeHeader: true,
          orientation: "portrait",
        });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, headerEndY, { align: "center" });
        doc.setFontSize(10);
        doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, headerEndY + 7, { align: "center" });

        const el = tableRef.current;
        // Save original styles
        const origStyles = {
          overflow: el.style.overflow,
          width: el.style.width,
          maxWidth: el.style.maxWidth,
        };
        // Expand to full scrollable width
        el.style.overflow = 'visible';
        el.style.width = `${el.scrollWidth}px`;
        el.style.maxWidth = 'none';

        // Apply light-capture class for light mode colors (same as print)
        const hadLightCapture = el.classList.contains('light-capture');
        el.classList.add('light-capture');

        // Hide only interactive buttons (Undo, Plus, Add) but keep grade icons & stars visible
        const undoButtons = el.querySelectorAll('button[title="تراجع"], button[title="إضافة تقييم"]');
        const seps = el.querySelectorAll('span.w-px');
        undoButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');
        seps.forEach(s => (s as HTMLElement).style.display = 'none');

        // Match print styles exactly: font 9px, padding 3px 4px, compact icons
        const tableEl = el.querySelector('table') as HTMLElement;
        const allCells = el.querySelectorAll('td, th');
        const allIcons = el.querySelectorAll('svg');
        const allMinWCells = el.querySelectorAll('td[class*="min-w-"], th[class*="min-w-"]');
        const origStyles2 = {
          fontSize: tableEl?.style.fontSize,
          lineHeight: tableEl?.style.lineHeight,
          tableLayout: tableEl?.style.tableLayout,
          borderCollapse: tableEl?.style.borderCollapse,
          direction: tableEl?.style.direction,
          cells: Array.from(allCells).map(c => ({ 
            padding: (c as HTMLElement).style.padding, 
            fontSize: (c as HTMLElement).style.fontSize,
            whiteSpace: (c as HTMLElement).style.whiteSpace,
          })),
          icons: Array.from(allIcons).map(ic => ({ width: (ic as SVGElement).style.width, height: (ic as SVGElement).style.height })),
          minWCells: Array.from(allMinWCells).map(c => ({ minWidth: (c as HTMLElement).style.minWidth })),
        };
        if (tableEl) {
          tableEl.style.fontSize = '9px';
          tableEl.style.lineHeight = '1.3';
          tableEl.style.tableLayout = 'auto';
          tableEl.style.borderCollapse = 'collapse';
          tableEl.style.direction = 'rtl';
        }
        allCells.forEach(c => { 
          (c as HTMLElement).style.padding = '3px 4px'; 
          (c as HTMLElement).style.fontSize = '9px';
          (c as HTMLElement).style.whiteSpace = 'nowrap';
        });
        allIcons.forEach(ic => { (ic as SVGElement).style.width = '12px'; (ic as SVGElement).style.height = '12px'; });
        allMinWCells.forEach(c => { (c as HTMLElement).style.minWidth = '0'; });

        // Recalculate width after style changes
        el.style.width = `${el.scrollWidth}px`;

        // Measure row boundaries before capture
        const elRect = el.getBoundingClientRect();
        const thead = el.querySelector('thead');
        const theadH = thead ? thead.getBoundingClientRect().bottom - elRect.top : 0;
        const tbodyRows = Array.from(el.querySelectorAll('tbody tr'));
        const rowBottomsCss = tbodyRows.map(r => (r as HTMLElement).getBoundingClientRect().bottom - elRect.top);

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: el.scrollWidth,
        });

        // Restore all styles
        el.style.overflow = origStyles.overflow;
        el.style.width = origStyles.width;
        el.style.maxWidth = origStyles.maxWidth;
        if (!hadLightCapture) el.classList.remove('light-capture');
        undoButtons.forEach(btn => (btn as HTMLElement).style.display = '');
        seps.forEach(s => (s as HTMLElement).style.display = '');
        if (tableEl) {
          tableEl.style.fontSize = origStyles2.fontSize || '';
          tableEl.style.lineHeight = origStyles2.lineHeight || '';
          tableEl.style.tableLayout = origStyles2.tableLayout || '';
          tableEl.style.borderCollapse = origStyles2.borderCollapse || '';
          tableEl.style.direction = origStyles2.direction || '';
        }
        allCells.forEach((c, i) => { 
          (c as HTMLElement).style.padding = origStyles2.cells[i]?.padding || ''; 
          (c as HTMLElement).style.fontSize = origStyles2.cells[i]?.fontSize || '';
          (c as HTMLElement).style.whiteSpace = origStyles2.cells[i]?.whiteSpace || '';
        });
        allIcons.forEach((ic, i) => { (ic as SVGElement).style.width = origStyles2.icons[i]?.width || ''; (ic as SVGElement).style.height = origStyles2.icons[i]?.height || ''; });
        allMinWCells.forEach((c, i) => { (c as HTMLElement).style.minWidth = origStyles2.minWCells[i]?.minWidth || ''; });

        // Calculations
        const cssToPx = canvas.height / elRect.height;
        const imgWidth = pageWidth - 20;
        const pxPerMm = canvas.width / imgWidth;
        const startImgY = headerEndY + 15;
        const availFirst = pageHeight - startImgY - 10;
        const availNext = pageHeight - 20;
        const totalImgH = canvas.height / pxPerMm;

        if (totalImgH <= availFirst) {
          doc.addImage(canvas.toDataURL("image/png"), "PNG", 10, startImgY, imgWidth, totalImgH);
        } else {
          const headerPx = theadH * cssToPx;
          const headerMm = headerPx / pxPerMm;
          let srcY = 0;
          let isFirst = true;

          while (srcY < canvas.height - 1) {
            const availMm = isFirst ? availFirst : availNext;
            const dataAvailMm = isFirst ? availMm : availMm - headerMm;
            const maxDataPx = dataAvailMm * pxPerMm;

            // Find last row boundary that fits
            let cutY = Math.min(srcY + maxDataPx, canvas.height);
            for (let i = rowBottomsCss.length - 1; i >= 0; i--) {
              const rowPx = rowBottomsCss[i] * cssToPx;
              if (rowPx > srcY + 1 && rowPx <= srcY + maxDataPx) {
                cutY = rowPx;
                break;
              }
            }
            cutY = Math.min(cutY, canvas.height);
            const sliceH = cutY - srcY;
            if (sliceH <= 1) break;

            const addHeader = !isFirst && headerPx > 0;
            const totalH = addHeader ? headerPx + sliceH : sliceH;

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.ceil(totalH);
            const ctx = sliceCanvas.getContext('2d')!;

            if (addHeader) {
              ctx.drawImage(canvas, 0, 0, canvas.width, headerPx, 0, 0, canvas.width, headerPx);
              ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, headerPx, canvas.width, sliceH);
            } else {
              ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            }

            if (!isFirst) doc.addPage("a4", "landscape");
            const sliceImgH = totalH / pxPerMm;
            doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 10, isFirst ? startImgY : 10, imgWidth, sliceImgH);

            srcY = cutY;
            isFirst = false;
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

    // Fallback: autoTable
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
          for (let j = 1; j < gh.colSpan; j++) expandedRow.push('');
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
                if (reversedGH[i].colSpan > 1) data.cell.colSpan = reversedGH[i].colSpan;
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
