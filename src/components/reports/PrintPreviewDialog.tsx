import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Upload, X, ArrowRight } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import { safePrint } from "@/lib/print-utils";
import ReportPrintHeader from "./ReportPrintHeader";
import { useDynamicLeftHeader, buildLeftHeaderLines } from "@/hooks/useDynamicLeftHeader";
import { useDynamicRightHeader, buildRightHeaderLines } from "@/hooks/useDynamicRightHeader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: "attendance" | "grades" | "behavior";
  title: string;
  children: React.ReactNode;
}

export default function PrintPreviewDialog({
  open,
  onOpenChange,
  reportType,
  title,
  children,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useCallback(() => {
    onOpenChange(false);
    setIsPrinting(true);
    requestAnimationFrame(() => {
      safePrint(() => {
        setIsPrinting(false);
      });
    });
  }, [onOpenChange]);

  const handleExportPng = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${reportType}-report.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "تم التصدير", description: "تم تحميل صورة التقرير بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تصدير الصورة", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الطباعة — {title}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleExportPng}
                disabled={exporting}
              >
                <Upload className="h-4 w-4" />
                {exporting ? "جارٍ..." : "PNG"}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-white p-6 text-gray-900 [&_*]:!text-gray-900 [&_table]:!text-gray-900 [&_th]:!text-gray-700 [&_td]:!text-gray-900 [&_.text-muted-foreground]:!text-gray-500 [&_h1]:!text-gray-900 [&_h2]:!text-gray-900 [&_h3]:!text-gray-900 [&_h4]:!text-gray-900 [&_p]:!text-gray-900 [&_span]:!text-gray-800 [&_.badge]:!text-inherit">
          <div
            ref={contentRef}
            dir="rtl"
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", color: "#1a1a1a" }}
          >
            {/* Header from settings */}
            <ReportPrintHeaderInline reportType={reportType} />
            {/* Report content */}
            <div className="space-y-4">{children}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline version of ReportPrintHeader (always visible, not just print)
 */
function ReportPrintHeaderInline({
  reportType,
}: {
  reportType: "attendance" | "grades" | "behavior";
}) {
  const [config, setConfig] = useState<any>(null);
  const dyn = useDynamicLeftHeader();
  const dynRight = useDynamicRightHeader();

  useEffect(() => {
    (async () => {
      const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
      const parsed = await fetchScopedPrintHeader(reportType);
      if (parsed) setConfig(parsed);
    })();
  }, [reportType]);

  if (!config) return null;

  return (
    <div className="mb-6">
      <div
        style={{
          borderBottom: `${config.margins?.borderWidth ?? 3}px solid ${config.margins?.borderColor ?? "#3b82f6"}`,
          paddingBottom: "6px",
          marginBottom: `${config.margins?.borderBottomMargin ?? 8}mm`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div style={{ flex: "1 1 0%", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              textAlign: "right",
              fontSize: `${config.rightSection?.fontSize || 12}px`,
              lineHeight: 1.8,
              color: config.rightSection?.color || "#1e293b",
            }}
          >
            {buildRightHeaderLines(dynRight).map((row, i) => (
              <p key={i} style={{ margin: 0 }}>
                {row.label ? (
                  <>
                    <span style={{ fontWeight: 700 }}>{row.label}:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{row.value}</span>
                  </>
                ) : (
                  <span style={{ fontWeight: row.bold ? 700 : 600 }}>{row.value}</span>
                )}
              </p>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, margin: "0 auto" }}>
          {(config.centerSection?.images || []).map((img: string, i: number) =>
            img ? (
              <img
                key={i}
                src={img}
                alt=""
                style={{
                  width: `${config.centerSection?.imagesWidths?.[i] ?? config.centerSection?.imagesSizes?.[i] ?? 60}px`,
                  height: `${config.centerSection?.imagesSizes?.[i] || 60}px`,
                  objectFit: "contain",
                }}
              />
            ) : null
          )}
        </div>

        <div dir="ltr" style={{ flex: "1 1 0%", display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              textAlign: "left",
              fontSize: `${config.leftSection?.fontSize || 12}px`,
              lineHeight: 1.8,
              color: config.leftSection?.color || "#1e293b",
            }}
          >
            {buildLeftHeaderLines(dyn).map((row, i) => (
              <p key={i} style={{ margin: 0 }}>
                <span style={{ fontWeight: 700 }}>{row.label}:</span>{" "}
                <span style={{ fontWeight: 500 }}>{row.value}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
