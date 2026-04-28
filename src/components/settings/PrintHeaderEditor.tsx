import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
import {
  Save, Copy, RectangleVertical, RectangleHorizontal,
  FileText, Settings2, Sparkles, Wrench,
} from "lucide-react";
import { getPrintOrientation, setPrintOrientation } from "@/lib/print-utils";

import {
  PrintHeaderConfig, defaultConfig, reportTypes, normalizeConfig,
} from "./print-header-types";
import HeaderPreview from "./print-header/HeaderPreview";
import HeaderContentTab from "./print-header/HeaderContentTab";
import FormattingTab from "./print-header/FormattingTab";
import ExtrasTab from "./print-header/ExtrasTab";
import AdvancedTab from "./print-header/AdvancedTab";

// Re-export types for backward compatibility
export type {
  WatermarkConfig, FooterSignature, FooterSignaturesConfig, MarginsConfig, AdvancedConfig, PrintHeaderConfig,
} from "./print-header-types";

export default function PrintHeaderEditor() {
  const [config, setConfig] = useState<PrintHeaderConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>("__default__");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [orientation, setOrientation] = useState(getPrintOrientation);

  useEffect(() => {
    loadConfig(selectedReportType);
  }, [selectedReportType]);

  const getBaseKey = (reportType: string) =>
    reportType === "__default__" ? "print_header_config" : `print_header_config_${reportType}`;

  const loadConfig = async (reportType: string) => {
    setLoadingConfig(true);
    try {
      const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
      const wantsDefault = reportType === "__default__";
      const parsed = wantsDefault
        ? await fetchScopedPrintHeader()
        : await fetchScopedPrintHeader(reportType);
      if (parsed) {
        normalizeConfig(parsed);
        setConfig(parsed);
      } else if (!wantsDefault) {
        const defParsed = await fetchScopedPrintHeader();
        if (defParsed) { normalizeConfig(defParsed); setConfig(defParsed); }
        else setConfig(defaultConfig);
      } else { setConfig(defaultConfig); }
    } catch { setConfig(defaultConfig); }
    setLoadingConfig(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const baseKey = getBaseKey(selectedReportType);
    const value = JSON.stringify(config);
    // Resolve the actual id to write against — scoped per-tenant for non-admins.
    const { getWriteScopedHeaderId } = await import("@/lib/print-header-fetch");
    const writeId = selectedReportType === "__default__"
      ? await getWriteScopedHeaderId()
      : await getWriteScopedHeaderId(selectedReportType);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("id", writeId).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("site_settings").update({ value }).eq("id", writeId));
    } else {
      // Insert with the base key — the BEFORE-INSERT trigger scopes it for owners,
      // and admins keep it global. This preserves the legacy primary-owner flow.
      ({ error } = await supabase.from("site_settings").insert({ id: baseKey, value }));
    }
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      // Invalidate cached print headers so the next print picks up the new values
      try {
        const mod = await import("@/lib/grades-print-helpers");
        mod.clearPrintHeaderCache?.();
      } catch { /* ignore */ }
      const rt = reportTypes.find(r => r.id === selectedReportType);
      toast({ title: "تم الحفظ", description: `تم حفظ ترويسة ${rt?.label || ""}` });
    }
  };

  const handleCopyFromDefault = async () => {
    const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
    const parsed = await fetchScopedPrintHeader();
    if (parsed) {
      normalizeConfig(parsed);
      setConfig(parsed);
      toast({ title: "تم النسخ", description: "تم نسخ الترويسة الافتراضية كقاعدة" });
    }
  };

  const handleExportPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `print-header${selectedReportType !== "__default__" ? `-${selectedReportType}` : ""}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "تم التصدير", description: "تم تحميل صورة الترويسة بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تصدير الصورة", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleOrientationChange = (value: string) => {
    if (value === "portrait" || value === "landscape") {
      setOrientation(value);
      setPrintOrientation(value);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Label className="text-sm font-semibold whitespace-nowrap">نوع التقرير:</Label>
          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
            <SelectTrigger className="w-56 h-9"><SelectValue placeholder="اختر نوع التقرير" /></SelectTrigger>
            <SelectContent>
              {reportTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  <span className="flex items-center gap-2">{rt.icon} {rt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedReportType !== "__default__" && (
            <Button variant="outline" size="sm" className="gap-1 text-xs h-9" onClick={handleCopyFromDefault}>
              <Copy className="h-3.5 w-3.5" />نسخ الافتراضية
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 border-r pr-3 mr-auto">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">الاتجاه:</Label>
          <div className="flex border rounded-md overflow-hidden">
            <button type="button"
              className={cn("p-1.5 px-2 flex items-center gap-1 text-xs transition-colors", orientation === "portrait" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => handleOrientationChange("portrait")}
            >
              <RectangleVertical className="h-3.5 w-3.5" />عمودي
            </button>
            <button type="button"
              className={cn("p-1.5 px-2 flex items-center gap-1 text-xs transition-colors", orientation === "landscape" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => handleOrientationChange("landscape")}
            >
              <RectangleHorizontal className="h-3.5 w-3.5" />أفقي
            </button>
          </div>
        </div>
      </div>

      {loadingConfig ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <HeaderPreview config={config} previewRef={previewRef} exporting={exporting} onExportPng={handleExportPng} />

          <Tabs defaultValue="header" dir="rtl" className="space-y-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="header" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />الترويسة</TabsTrigger>
              <TabsTrigger value="formatting" className="gap-1.5 text-xs"><Settings2 className="h-3.5 w-3.5" />التنسيق</TabsTrigger>
              <TabsTrigger value="extras" className="gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" />الإضافات</TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" />متقدم</TabsTrigger>
            </TabsList>

            <TabsContent value="header"><HeaderContentTab config={config} setConfig={setConfig} /></TabsContent>
            <TabsContent value="formatting"><FormattingTab config={config} setConfig={setConfig} /></TabsContent>
            <TabsContent value="extras"><ExtrasTab config={config} setConfig={setConfig} /></TabsContent>
            <TabsContent value="advanced"><AdvancedTab config={config} setConfig={setConfig} /></TabsContent>
          </Tabs>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
