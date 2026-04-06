import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
import {
  Save,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Type,
  GripVertical,
  Download,
  ArrowLeft,
  ArrowRight,
  Palette,
  Copy,
  Droplets,
  RotateCcw,
  Ruler,
  RectangleVertical,
  RectangleHorizontal,
  FileText,
  Settings2,
  Sparkles,
  Wrench,
  FileDigit,
  Hash,
  CalendarDays,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getPrintOrientation, setPrintOrientation } from "@/lib/print-utils";

// ─── Types ────────────────────────────────────────────────────

interface SectionConfig {
  lines: string[];
  fontSize: number;
  align: "right" | "center" | "left";
  color?: string;
}

interface CenterSectionConfig {
  images: string[];
  imagesSizes: number[];
  imagesWidths?: number[];
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
  repeat: boolean;
}

export interface FooterSignature {
  label: string;
  name: string;
}

export interface FooterSignaturesConfig {
  enabled: boolean;
  signatures: FooterSignature[];
}

export interface MarginsConfig {
  top: number;
  side: number;
  borderWidth?: number;
  borderColor?: string;
  borderBottomMargin?: number;
}

export interface AdvancedConfig {
  paperSize: "A4" | "A5" | "Letter" | "Legal";
  exportQuality: "standard" | "high" | "max";
  pdfFontSize: number;
  tableRowHeight: number;
  showPageNumbers: boolean;
  showDate: boolean;
  showReportTitle: boolean;
  headerOnEveryPage: boolean;
  tableHeaderBg: string;
  tableHeaderText: string;
}

export interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
  watermark?: WatermarkConfig;
  footerSignatures?: FooterSignaturesConfig;
  margins?: MarginsConfig;
  advanced?: AdvancedConfig;
}

// ─── Defaults ─────────────────────────────────────────────────

const defaultWatermark: WatermarkConfig = {
  enabled: false,
  text: "سري",
  fontSize: 48,
  color: "#94a3b8",
  opacity: 0.08,
  angle: -30,
  repeat: true,
};

const defaultFooterSignatures: FooterSignaturesConfig = {
  enabled: false,
  signatures: [
    { label: "معلم المادة", name: "" },
    { label: "مدير المدرسة", name: "" },
  ],
};

const defaultMargins: MarginsConfig = {
  top: 5,
  side: 8,
  borderWidth: 3,
  borderColor: "#3b82f6",
};

const defaultAdvanced: AdvancedConfig = {
  paperSize: "A4",
  exportQuality: "high",
  pdfFontSize: 12,
  tableRowHeight: 28,
  showPageNumbers: true,
  showDate: true,
  showReportTitle: true,
  headerOnEveryPage: true,
  tableHeaderBg: "#eff6ff",
  tableHeaderText: "#1e40af",
};

const defaultConfig: PrintHeaderConfig = {
  rightSection: {
    lines: ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم", "مدرسة ..."],
    fontSize: 12,
    align: "right",
    color: "#1e293b",
  },
  centerSection: {
    images: ["", "", ""],
    imagesSizes: [60, 80, 60],
  },
  leftSection: {
    lines: ["اختبار: ...", "المادة: ...", "الصف: ...", "الزمن: ..."],
    fontSize: 12,
    align: "left",
    color: "#1e293b",
  },
  watermark: defaultWatermark,
  footerSignatures: defaultFooterSignatures,
  margins: defaultMargins,
  advanced: defaultAdvanced,
};

interface ReportTypeOption {
  id: string;
  label: string;
  icon: string;
}

const reportTypes: ReportTypeOption[] = [
  { id: "__default__", label: "الترويسة الافتراضية (عامة)", icon: "📄" },
  { id: "attendance", label: "تقرير الحضور والغياب", icon: "📋" },
  { id: "grades", label: "تقرير الدرجات", icon: "📊" },
  { id: "behavior", label: "تقرير السلوك", icon: "⭐" },
];

const presetColors = ["#1e293b", "#000000", "#1d4ed8", "#047857", "#7c3aed", "#b91c1c", "#92400e", "#64748b"];
const borderColors = ["#3b82f6", "#1d4ed8", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#1e293b", "#64748b"];

// ─── Component ────────────────────────────────────────────────

export default function PrintHeaderEditor() {
  const [config, setConfig] = useState<PrintHeaderConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", key)
      .single();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        normalizeConfig(parsed);
        setConfig(parsed);
      } catch {
        setConfig(defaultConfig);
      }
    } else if (reportType !== "__default__") {
      const { data: defData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
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

  const normalizeConfig = (parsed: any) => {
    if (!parsed.rightSection.color) parsed.rightSection.color = "#1e293b";
    if (!parsed.leftSection.color) parsed.leftSection.color = "#1e293b";
    if (!parsed.watermark) parsed.watermark = defaultWatermark;
    if (!parsed.footerSignatures) parsed.footerSignatures = defaultFooterSignatures;
    if (!parsed.margins) parsed.margins = defaultMargins;
    if (!parsed.advanced) parsed.advanced = defaultAdvanced;
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

  // ─── Section helpers ──────────────────────────────────────

  const updateLine = (section: "rightSection" | "leftSection", index: number, value: string) => {
    setConfig((prev) => {
      const lines = [...prev[section].lines];
      lines[index] = value;
      return { ...prev, [section]: { ...prev[section], lines } };
    });
  };

  const addLine = (section: "rightSection" | "leftSection") => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], lines: [...prev[section].lines, ""] },
    }));
  };

  const removeLine = (section: "rightSection" | "leftSection", index: number) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], lines: prev[section].lines.filter((_, i) => i !== index) },
    }));
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploading(index);
    const formData = new FormData();
    formData.append("file", file);
    const { data, error } = await supabase.functions.invoke("upload-letterhead", { body: formData });
    setUploading(null);
    if (error || data?.error) {
      toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
      return;
    }
    if (data?.url) {
      setConfig((prev) => {
        const images = [...prev.centerSection.images];
        images[index] = data.url;
        return { ...prev, centerSection: { ...prev.centerSection, images } };
      });
    }
  };

  const removeImage = (index: number) => {
    setConfig((prev) => {
      const images = [...prev.centerSection.images];
      images[index] = "";
      return { ...prev, centerSection: { ...prev.centerSection, images } };
    });
  };

  const updateImageSize = (index: number, size: number) => {
    setConfig((prev) => {
      const imagesSizes = [...prev.centerSection.imagesSizes];
      imagesSizes[index] = size;
      return { ...prev, centerSection: { ...prev.centerSection, imagesSizes } };
    });
  };

  const updateImageWidth = (index: number, width: number) => {
    setConfig((prev) => {
      const imagesWidths = [...(prev.centerSection.imagesWidths || prev.centerSection.imagesSizes)];
      imagesWidths[index] = width;
      return { ...prev, centerSection: { ...prev.centerSection, imagesWidths } };
    });
  };

  const addImageSlot = () => {
    setConfig((prev) => ({
      ...prev,
      centerSection: {
        images: [...prev.centerSection.images, ""],
        imagesSizes: [...prev.centerSection.imagesSizes, 60],
        imagesWidths: [...(prev.centerSection.imagesWidths || prev.centerSection.imagesSizes), 60],
      },
    }));
  };

  const removeImageSlot = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      centerSection: {
        images: prev.centerSection.images.filter((_, i) => i !== index),
        imagesSizes: prev.centerSection.imagesSizes.filter((_, i) => i !== index),
        imagesWidths: (prev.centerSection.imagesWidths || prev.centerSection.imagesSizes).filter((_, i) => i !== index),
      },
    }));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= config.centerSection.images.length) return;
    setConfig((prev) => {
      const images = [...prev.centerSection.images];
      const sizes = [...prev.centerSection.imagesSizes];
      [images[from], images[to]] = [images[to], images[from]];
      [sizes[from], sizes[to]] = [sizes[to], sizes[from]];
      return { ...prev, centerSection: { images, imagesSizes: sizes } };
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) moveImage(dragIndex, targetIndex);
    setDragIndex(null);
  };

  const alignOptions = [
    { value: "right", icon: AlignRight },
    { value: "center", icon: AlignCenter },
    { value: "left", icon: AlignLeft },
  ];

  // ─── Render helpers ───────────────────────────────────────

  const renderTextSection = (
    sectionKey: "rightSection" | "leftSection",
    title: string,
    icon: React.ReactNode
  ) => {
    const section = config[sectionKey];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold text-sm">{icon}{title}</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addLine(sectionKey)}>
            <Plus className="h-3 w-3" />سطر
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">المحاذاة:</Label>
          <div className="flex border rounded-md overflow-hidden">
            {alignOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`p-1.5 transition-colors ${section.align === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], align: opt.value as any } }))}
              >
                <opt.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
          <Slider min={8} max={20} step={1} value={[section.fontSize]}
            onValueChange={([v]) => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], fontSize: v } }))}
            className="flex-1" />
          <span className="text-xs font-mono w-6 text-center">{section.fontSize}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />اللون:</Label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-5 h-5 rounded-full border-2 transition-all ${(section.color || "#1e293b") === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"}`}
                style={{ backgroundColor: c }}
                onClick={() => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], color: c } }))}
              />
            ))}
            <Input type="color" value={section.color || "#1e293b"}
              onChange={(e) => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], color: e.target.value } }))}
              className="w-7 h-7 p-0 border-0 cursor-pointer rounded" title="لون مخصص" />
          </div>
        </div>
        <div className="space-y-2">
          {section.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input value={line} onChange={(e) => updateLine(sectionKey, i, e.target.value)} className="h-8 text-sm" placeholder={`سطر ${i + 1}`} dir="rtl" />
              {section.lines.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => removeLine(sectionKey, i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Top bar: Report type + orientation + actions ── */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Label className="text-sm font-semibold whitespace-nowrap">نوع التقرير:</Label>
          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="اختر نوع التقرير" />
            </SelectTrigger>
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
              <Copy className="h-3.5 w-3.5" />
              نسخ الافتراضية
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 border-r pr-3 mr-auto">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">الاتجاه:</Label>
          <div className="flex border rounded-md overflow-hidden">
            <button
              type="button"
              className={cn("p-1.5 px-2 flex items-center gap-1 text-xs transition-colors", orientation === "portrait" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => handleOrientationChange("portrait")}
            >
              <RectangleVertical className="h-3.5 w-3.5" />
              عمودي
            </button>
            <button
              type="button"
              className={cn("p-1.5 px-2 flex items-center gap-1 text-xs transition-colors", orientation === "landscape" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => handleOrientationChange("landscape")}
            >
              <RectangleHorizontal className="h-3.5 w-3.5" />
              أفقي
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
          {/* ── Live Preview (compact) ── */}
          <Card className="border-dashed border-2">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">معاينة مباشرة (مشتركة للطباعة والتصدير)</Label>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExportPng} disabled={exporting}>
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "جارٍ..." : "تصدير PNG"}
                </Button>
              </div>
              <div
                ref={previewRef}
                dir="rtl"
                className="border rounded-lg bg-white relative overflow-hidden mx-auto shadow-sm"
                style={{
                  fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                  width: "100%",
                  maxWidth: "480px",
                  minHeight: "300px",
                  aspectRatio: "210 / 297",
                  paddingTop: `${(config.margins?.top ?? 5) * 2}px`,
                  paddingLeft: `${(config.margins?.side ?? 8) * 2}px`,
                  paddingRight: `${(config.margins?.side ?? 8) * 2}px`,
                  paddingBottom: "16px",
                }}
              >
                {config.watermark?.enabled && config.watermark.text && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: config.watermark.repeat ? "stretch" : "center", justifyContent: "center", pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
                    {config.watermark.repeat ? (
                      <div style={{ position: "absolute", inset: "-100%", display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "30px 60px", transform: `rotate(${config.watermark.angle}deg)` }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <span key={i} style={{ fontSize: `${config.watermark!.fontSize * 0.35}px`, color: config.watermark!.color, opacity: config.watermark!.opacity, fontWeight: 700, whiteSpace: "nowrap" }}>{config.watermark!.text}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: `${config.watermark.fontSize * 0.4}px`, color: config.watermark.color, opacity: config.watermark.opacity, fontWeight: 700, transform: `rotate(${config.watermark.angle}deg)` }}>{config.watermark.text}</span>
                    )}
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px",
                  position: "relative", zIndex: 2, paddingBottom: "6px",
                  borderBottom: `${config.margins?.borderWidth ?? 3}px solid ${config.margins?.borderColor ?? "#3b82f6"}`,
                  marginBottom: `${(config.margins?.borderBottomMargin ?? 8) * 2}px`,
                }}>
                  <div style={{ textAlign: "right", fontSize: `${config.rightSection.fontSize * 0.8}px`, lineHeight: 1.8, color: config.rightSection.color || "#1e293b", flex: "1 1 0%" }}>
                    {config.rightSection.lines.map((line, i) => (
                      <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" style={{ margin: "0 auto" }}>
                    {config.centerSection.images.map((img, i) => (
                      <div key={i}>
                        {img ? (
                          <img src={img} alt={`شعار ${i + 1}`} style={{ width: `${((config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60) * 0.7}px`, height: `${(config.centerSection.imagesSizes[i] || 60) * 0.7}px`, objectFit: "contain" }} />
                        ) : (
                          <div className="border-2 border-dashed rounded flex items-center justify-center bg-muted/30" style={{ width: `${((config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60) * 0.7}px`, height: `${(config.centerSection.imagesSizes[i] || 60) * 0.7}px` }}>
                            <ImageIcon className="h-3 w-3 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "left", fontSize: `${config.leftSection.fontSize * 0.8}px`, lineHeight: 1.8, color: config.leftSection.color || "#1e293b", flex: "1 1 0%" }}>
                    {config.leftSection.lines.map((line, i) => (
                      <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                    ))}
                  </div>
                </div>
                <div style={{ position: "relative", zIndex: 2, marginTop: "12px" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ height: "8px", background: "#f1f5f9", borderRadius: "3px", marginBottom: "6px", width: `${90 - i * 5}%` }} />
                  ))}
                </div>
                {config.footerSignatures?.enabled && config.footerSignatures.signatures.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", marginTop: "auto", paddingTop: "12px", borderTop: "1px dashed #cbd5e1", position: "absolute", bottom: "16px", left: `${(config.margins?.side ?? 8) * 2}px`, right: `${(config.margins?.side ?? 8) * 2}px`, zIndex: 2 }}>
                    {config.footerSignatures.signatures.map((sig, i) => (
                      <div key={i} style={{ textAlign: "center", minWidth: "80px" }}>
                        <p style={{ margin: 0, fontSize: "9px", fontWeight: 600, color: "#1e293b" }}>{sig.label}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#475569" }}>{sig.name || "............"}</p>
                        <div style={{ marginTop: "14px", borderBottom: "1px solid #94a3b8", width: "70px", marginInline: "auto" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Settings Tabs ── */}
          <Tabs defaultValue="header" dir="rtl" className="space-y-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="header" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                الترويسة
              </TabsTrigger>
              <TabsTrigger value="formatting" className="gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                التنسيق
              </TabsTrigger>
              <TabsTrigger value="extras" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                الإضافات
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5 text-xs">
                <Wrench className="h-3.5 w-3.5" />
                متقدم
              </TabsTrigger>
            </TabsList>

            {/* ─ Tab 1: Header content ─ */}
            <TabsContent value="header" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="p-4">{renderTextSection("rightSection", "الجانب الأيمن", <Type className="h-4 w-4" />)}</CardContent></Card>

                {/* Center images */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 font-semibold text-sm"><ImageIcon className="h-4 w-4" />الشعارات (الوسط)</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addImageSlot}><Plus className="h-3 w-3" />شعار</Button>
                    </div>
                    {config.centerSection.images.map((img, i) => (
                      <div key={i} className={`space-y-2 border rounded-lg p-2.5 transition-colors ${dragIndex === i ? "border-primary bg-primary/5" : ""}`}
                        draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)} onDragEnd={() => setDragIndex(null)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            <span className="text-xs text-muted-foreground">شعار {i + 1}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => moveImage(i, i - 1)}><ArrowRight className="h-3 w-3" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === config.centerSection.images.length - 1} onClick={() => moveImage(i, i + 1)}><ArrowLeft className="h-3 w-3" /></Button>
                            {config.centerSection.images.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeImageSlot(i)}><Trash2 className="h-3 w-3" /></Button>
                            )}
                          </div>
                        </div>
                        {img ? (
                          <div className="flex items-center gap-2">
                            <img src={img} alt="" className="h-10 w-10 object-contain rounded border" />
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => removeImage(i)}><Trash2 className="h-3 w-3" />إزالة</Button>
                          </div>
                        ) : (
                          <div>
                            <Input type="file" accept="image/*" className="h-8 text-xs cursor-pointer" disabled={uploading === i}
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(i, file); e.target.value = ""; }} />
                            {uploading === i && <p className="text-xs text-muted-foreground mt-1">جارٍ الرفع...</p>}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">العرض:</Label>
                            <Slider min={30} max={150} step={5} value={[(config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60]} onValueChange={([v]) => updateImageWidth(i, v)} className="flex-1" />
                            <span className="text-xs font-mono w-8 text-center">{(config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60}px</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">الارتفاع:</Label>
                            <Slider min={30} max={150} step={5} value={[config.centerSection.imagesSizes[i] || 60]} onValueChange={([v]) => updateImageSize(i, v)} className="flex-1" />
                            <span className="text-xs font-mono w-8 text-center">{config.centerSection.imagesSizes[i] || 60}px</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card><CardContent className="p-4">{renderTextSection("leftSection", "الجانب الأيسر", <Type className="h-4 w-4" />)}</CardContent></Card>
              </div>
            </TabsContent>

            {/* ─ Tab 2: Formatting ─ */}
            <TabsContent value="formatting" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    <Label className="font-semibold text-sm">الهوامش والخط الفاصل</Label>
                    <span className="text-xs text-muted-foreground">(مشترك بين الطباعة والتصدير)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">الهامش العلوي (mm)</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={0} max={30} step={1} value={[config.margins?.top ?? 5]}
                          onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), top: v } }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.margins?.top ?? 5}mm</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">الهامش الجانبي (mm)</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={2} max={40} step={1} value={[config.margins?.side ?? 8]}
                          onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), side: v } }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.margins?.side ?? 8}mm</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">سمك الخط الفاصل (px)</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={0} max={8} step={0.5} value={[config.margins?.borderWidth ?? 3]}
                          onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderWidth: v } }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.margins?.borderWidth ?? 3}px</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">مسافة أسفل الخط (mm)</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={0} max={20} step={1} value={[config.margins?.borderBottomMargin ?? 8]}
                          onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderBottomMargin: v } }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.margins?.borderBottomMargin ?? 8}mm</span>
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">لون الخط الفاصل</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {borderColors.map((color) => (
                          <button key={color} type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderColor: color } }))}
                            className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                              (config.margins?.borderColor ?? "#3b82f6") === color ? "border-foreground scale-110 ring-2 ring-primary/30" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input type="color" value={config.margins?.borderColor ?? "#3b82f6"}
                          onChange={(e) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderColor: e.target.value } }))}
                          className="w-7 h-7 rounded cursor-pointer border-0 p-0" title="لون مخصص" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─ Tab 3: Extras ─ */}
            <TabsContent value="extras" className="space-y-4">
              {/* Watermark */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 font-semibold text-sm">
                      <Droplets className="h-4 w-4" />
                      العلامة المائية
                    </Label>
                    <Switch
                      checked={config.watermark?.enabled || false}
                      onCheckedChange={(v) => setConfig((prev) => ({
                        ...prev, watermark: { ...(prev.watermark || defaultWatermark), enabled: v },
                      }))}
                    />
                  </div>
                  {config.watermark?.enabled && (
                    <div className="space-y-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">نص العلامة المائية</Label>
                        <Input value={config.watermark.text}
                          onChange={(e) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, text: e.target.value } }))}
                          className="h-8 text-sm" dir="rtl" placeholder="مثال: سري، مسودة، نسخة..." />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Label className="text-xs text-muted-foreground">اقتراحات:</Label>
                        {["سري", "مسودة", "نسخة أصلية", "غير رسمي", "للاطلاع فقط"].map((t) => (
                          <Button key={t} type="button" variant={config.watermark?.text === t ? "default" : "outline"}
                            size="sm" className="h-6 text-[10px] px-2"
                            onClick={() => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, text: t } }))}
                          >{t}</Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
                          <Slider min={20} max={100} step={2} value={[config.watermark.fontSize]}
                            onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, fontSize: v } }))}
                            className="flex-1" />
                          <span className="text-xs font-mono w-8 text-center">{config.watermark.fontSize}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">الشفافية:</Label>
                          <Slider min={0.02} max={0.3} step={0.01} value={[config.watermark.opacity]}
                            onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, opacity: v } }))}
                            className="flex-1" />
                          <span className="text-xs font-mono w-8 text-center">{Math.round(config.watermark.opacity * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />الزاوية:
                          </Label>
                          <Slider min={-90} max={0} step={5} value={[config.watermark.angle]}
                            onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, angle: v } }))}
                            className="flex-1" />
                          <span className="text-xs font-mono w-8 text-center">{config.watermark.angle}°</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">تكرار على كامل الصفحة</Label>
                          <Switch checked={config.watermark.repeat}
                            onCheckedChange={(v) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, repeat: v } }))} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />اللون:</Label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {["#94a3b8", "#64748b", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#1e293b"].map((c) => (
                            <button key={c} type="button"
                              className={`w-5 h-5 rounded-full border-2 transition-all ${config.watermark?.color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"}`}
                              style={{ backgroundColor: c }}
                              onClick={() => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, color: c } }))}
                            />
                          ))}
                          <Input type="color" value={config.watermark.color}
                            onChange={(e) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, color: e.target.value } }))}
                            className="w-7 h-7 p-0 border-0 cursor-pointer rounded" title="لون مخصص" />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Footer Signatures */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 font-semibold text-sm">✍️ توقيعات نهاية الجدول</Label>
                    <Switch
                      checked={config.footerSignatures?.enabled || false}
                      onCheckedChange={(v) => setConfig((prev) => ({
                        ...prev, footerSignatures: { ...(prev.footerSignatures || defaultFooterSignatures), enabled: v },
                      }))}
                    />
                  </div>
                  {config.footerSignatures?.enabled && (
                    <div className="space-y-3 pt-2 border-t">
                      {config.footerSignatures.signatures.map((sig, i) => (
                        <div key={i} className="flex items-center gap-2 border rounded-lg p-2.5">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap w-14">المسمى:</Label>
                              <Input value={sig.label}
                                onChange={(e) => setConfig((prev) => {
                                  const sigs = [...(prev.footerSignatures?.signatures || [])];
                                  sigs[i] = { ...sigs[i], label: e.target.value };
                                  return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                                })}
                                className="h-8 text-sm" dir="rtl" placeholder="مثال: معلم المادة" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap w-14">الاسم:</Label>
                              <Input value={sig.name}
                                onChange={(e) => setConfig((prev) => {
                                  const sigs = [...(prev.footerSignatures?.signatures || [])];
                                  sigs[i] = { ...sigs[i], name: e.target.value };
                                  return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                                })}
                                className="h-8 text-sm" dir="rtl" placeholder="اسم الشخص (اختياري)" />
                            </div>
                          </div>
                          {config.footerSignatures!.signatures.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => setConfig((prev) => ({
                                ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: prev.footerSignatures!.signatures.filter((_, idx) => idx !== i) },
                              }))}
                            ><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs w-full"
                        onClick={() => setConfig((prev) => ({
                          ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: [...prev.footerSignatures!.signatures, { label: "التوقيع", name: "" }] },
                        }))}
                      ><Plus className="h-3 w-3" />إضافة توقيع</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─ Tab 4: Advanced ─ */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      <Label className="font-semibold text-sm">إعدادات متقدمة</Label>
                      <span className="text-xs text-muted-foreground">(تُطبق على الطباعة والتصدير)</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, advanced: { ...defaultAdvanced } }));
                        toast({ title: "تم", description: "تمت استعادة الإعدادات المتقدمة الافتراضية" });
                      }}>
                      <RotateCcw className="h-3 w-3" />
                      استعادة الافتراضي
                    </Button>
                  </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Paper Size */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileDigit className="h-3 w-3" />
                        حجم الورقة
                      </Label>
                      <Select
                        value={config.advanced?.paperSize ?? "A4"}
                        onValueChange={(v) => setConfig((prev) => ({
                          ...prev, advanced: { ...(prev.advanced || defaultAdvanced), paperSize: v as any },
                        }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                          <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                          <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
                          <SelectItem value="Legal">Legal (216 × 356 mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Export Quality */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">جودة التصدير (PNG / PDF)</Label>
                      <Select
                        value={config.advanced?.exportQuality ?? "high"}
                        onValueChange={(v) => setConfig((prev) => ({
                          ...prev, advanced: { ...(prev.advanced || defaultAdvanced), exportQuality: v as any },
                        }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">عادية — أصغر حجم</SelectItem>
                          <SelectItem value="high">عالية — متوازنة (افتراضي)</SelectItem>
                          <SelectItem value="max">قصوى — أعلى دقة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* PDF Font Size */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">حجم خط الجدول في PDF</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={8} max={18} step={1}
                          value={[config.advanced?.pdfFontSize ?? 12]}
                          onValueChange={([v]) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), pdfFontSize: v },
                          }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.advanced?.pdfFontSize ?? 12}px</span>
                      </div>
                    </div>

                    {/* Table Row Height */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ارتفاع صف الجدول</Label>
                      <div className="flex items-center gap-3">
                        <Slider min={18} max={50} step={2}
                          value={[config.advanced?.tableRowHeight ?? 28]}
                          onValueChange={([v]) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableRowHeight: v },
                          }))}
                          className="flex-1" />
                        <span className="text-xs font-mono w-10 text-center">{config.advanced?.tableRowHeight ?? 28}px</span>
                      </div>
                    </div>

                    {/* Table Header Colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          لون خلفية رأس الجدول
                        </Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={config.advanced?.tableHeaderBg ?? "#eff6ff"}
                            onChange={(e) => setConfig((prev) => ({
                              ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableHeaderBg: e.target.value },
                            }))}
                            className="h-8 w-10 rounded border cursor-pointer" />
                          <span className="text-xs font-mono text-muted-foreground">{config.advanced?.tableHeaderBg ?? "#eff6ff"}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Type className="h-3 w-3" />
                          لون نص رأس الجدول
                        </Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={config.advanced?.tableHeaderText ?? "#1e40af"}
                            onChange={(e) => setConfig((prev) => ({
                              ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableHeaderText: e.target.value },
                            }))}
                            className="h-8 w-10 rounded border cursor-pointer" />
                          <span className="text-xs font-mono text-muted-foreground">{config.advanced?.tableHeaderText ?? "#1e40af"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Table Preview */}
                  <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold">معاينة حية للجدول</Label>
                    <div className="overflow-hidden rounded border bg-background" dir="rtl">
                      <table className="w-full border-collapse" style={{ fontSize: `${Math.round((config.advanced?.pdfFontSize ?? 12) * 0.85)}px` }}>
                        <thead>
                          <tr style={{ height: `${config.advanced?.tableRowHeight ?? 28}px` }}>
                            {["#", "اسم الطالب", "الفصل", "الدرجة", "الحالة"].map((h, i) => (
                              <th key={i} className={cn("border px-2 font-bold", i === 1 ? "text-right" : "text-center")}
                                style={{ backgroundColor: config.advanced?.tableHeaderBg ?? "#eff6ff", color: config.advanced?.tableHeaderText ?? "#1e40af" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { n: 1, name: "أحمد محمد العتيبي", cls: "١/أ", grade: "95", status: "ممتاز" },
                            { n: 2, name: "عبدالله سعد الشمري", cls: "١/أ", grade: "88", status: "جيد جداً" },
                            { n: 3, name: "فيصل خالد القحطاني", cls: "١/ب", grade: "76", status: "جيد" },
                          ].map((row, i) => (
                            <tr key={i} style={{ height: `${config.advanced?.tableRowHeight ?? 28}px`, backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                              <td className="border px-2 text-center">{row.n}</td>
                              <td className="border px-2 text-right font-medium">{row.name}</td>
                              <td className="border px-2 text-center">{row.cls}</td>
                              <td className="border px-2 text-center">{row.grade}</td>
                              <td className="border px-2 text-center">{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">هذه معاينة تقريبية — النتيجة الفعلية في PDF قد تختلف قليلاً</p>
                  </div>

                  {/* Toggle options */}
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-xs text-muted-foreground font-semibold">خيارات إضافية</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <Label className="text-sm flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          أرقام الصفحات
                        </Label>
                        <Switch checked={config.advanced?.showPageNumbers ?? true}
                          onCheckedChange={(v) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), showPageNumbers: v },
                          }))} />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <Label className="text-sm flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          تاريخ التقرير
                        </Label>
                        <Switch checked={config.advanced?.showDate ?? true}
                          onCheckedChange={(v) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), showDate: v },
                          }))} />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <Label className="text-sm flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          عنوان التقرير
                        </Label>
                        <Switch checked={config.advanced?.showReportTitle ?? true}
                          onCheckedChange={(v) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), showReportTitle: v },
                          }))} />
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border">
                        <Label className="text-sm flex items-center gap-2">
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          الترويسة في كل صفحة
                        </Label>
                        <Switch checked={config.advanced?.headerOnEveryPage ?? true}
                          onCheckedChange={(v) => setConfig((prev) => ({
                            ...prev, advanced: { ...(prev.advanced || defaultAdvanced), headerOnEveryPage: v },
                          }))} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ── Save button ── */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ إعدادات الطباعة والتصدير"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
