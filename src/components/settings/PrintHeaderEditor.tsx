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

  const getSettingKey = (reportType: string) =>
    reportType === "__default__" ? "print_header_config" : `print_header_config_${reportType}`;

  const loadConfig = async (reportType: string) => {
    setLoadingConfig(true);
    const key = getSettingKey(reportType);
    const { data } = await supabase.from("site_settings").select("value").eq("id", key).single();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        normalizeConfig(parsed);
        setConfig(parsed);
      } catch { setConfig(defaultConfig); }
    } else if (reportType !== "__default__") {
      const { data: defData } = await supabase.from("site_settings").select("value").eq("id", "print_header_config").single();
      if (defData?.value) {
        try {
          const parsed = JSON.parse(defData.value);
          normalizeConfig(parsed);
          setConfig(parsed);
        } catch { setConfig(defaultConfig); }
      } else { setConfig(defaultConfig); }
    } else { setConfig(defaultConfig); }
    setLoadingConfig(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const key = getSettingKey(selectedReportType);
    const value = JSON.stringify(config);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("id", key).single();
    let error;
    if (existing) {
      ({ error } = await supabase.from("site_settings").update({ value }).eq("id", key));
    } else {
      ({ error } = await supabase.from("site_settings").insert({ id: key, value }));
    }
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      const rt = reportTypes.find(r => r.id === selectedReportType);
      toast({ title: "تم الحفظ", description: `تم حفظ ترويسة ${rt?.label || ""}` });
    }
  };

  const handleCopyFromDefault = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("id", "print_header_config").single();
    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        normalizeConfig(parsed);
        setConfig(parsed);
        toast({ title: "تم النسخ", description: "تم نسخ الترويسة الافتراضية كقاعدة" });
      } catch {}
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
