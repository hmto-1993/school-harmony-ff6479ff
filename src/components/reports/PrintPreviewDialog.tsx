import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Upload, X } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import ReportPrintHeader from "./ReportPrintHeader";

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

  const handlePrint = () => {
    onOpenChange(false);
    setTimeout(() => window.print(), 200);
  };

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

        <div className="flex-1 overflow-auto border rounded-lg bg-white p-6">
          <div
            ref={contentRef}
            dir="rtl"
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
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

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", `print_header_config_${reportType}`)
        .single();

      if (data?.value) {
        try { setConfig(JSON.parse(data.value)); return; } catch {}
      }

      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();

      if (def?.value) {
        try { setConfig(JSON.parse(def.value)); } catch {}
      }
    })();
  }, [reportType]);

  if (!config) return null;

  return (
    <div className="mb-6">
      <div
        style={{
          borderBottom: "3px solid #3b82f6",
          paddingBottom: "12px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        <div
          style={{
            flex: 1,
            textAlign: config.rightSection?.align || "right",
            fontSize: `${config.rightSection?.fontSize || 12}px`,
            lineHeight: 1.8,
            color: config.rightSection?.color || "#1e293b",
          }}
        >
          {(config.rightSection?.lines || []).map((line: string, i: number) => (
            <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {(config.centerSection?.images || []).map((img: string, i: number) =>
            img ? (
              <img
                key={i}
                src={img}
                alt=""
                style={{
                  width: `${config.centerSection?.imagesSizes?.[i] || 60}px`,
                  height: `${config.centerSection?.imagesSizes?.[i] || 60}px`,
                  objectFit: "contain",
                }}
              />
            ) : null
          )}
        </div>

        <div
          style={{
            flex: 1,
            textAlign: config.leftSection?.align || "left",
            fontSize: `${config.leftSection?.fontSize || 12}px`,
            lineHeight: 1.8,
            color: config.leftSection?.color || "#1e293b",
          }}
        >
          {(config.leftSection?.lines || []).map((line: string, i: number) => (
            <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
