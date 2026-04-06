import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
}

export interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
  watermark?: WatermarkConfig;
  footerSignatures?: FooterSignaturesConfig;
  margins?: MarginsConfig;
}

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

export default function PrintHeaderEditor() {
  const [config, setConfig] = useState<PrintHeaderConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Report-type headers
  const [selectedReportType, setSelectedReportType] = useState<string>("__default__");
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Load config when selectedReportType changes
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
        if (!parsed.rightSection.color) parsed.rightSection.color = "#1e293b";
        if (!parsed.leftSection.color) parsed.leftSection.color = "#1e293b";
        if (!parsed.watermark) parsed.watermark = defaultWatermark;
        if (!parsed.footerSignatures) parsed.footerSignatures = defaultFooterSignatures;
        if (!parsed.margins) parsed.margins = defaultMargins;
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
          if (!parsed.rightSection.color) parsed.rightSection.color = "#1e293b";
          if (!parsed.leftSection.color) parsed.leftSection.color = "#1e293b";
          if (!parsed.watermark) parsed.watermark = defaultWatermark;
          if (!parsed.footerSignatures) parsed.footerSignatures = defaultFooterSignatures;
          if (!parsed.margins) parsed.margins = defaultMargins;
          setConfig(parsed);
        } catch {
          setConfig(defaultConfig);
        }
      } else {
        setConfig(defaultConfig);
      }
    } else {
      setConfig(defaultConfig);
    }
    setLoadingConfig(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const key = getSettingKey(selectedReportType);
    const value = JSON.stringify(config);

    // Upsert: try update first, if no rows affected, insert
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("id", key)
      .single();

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
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_header_config")
      .single();
    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (!parsed.rightSection.color) parsed.rightSection.color = "#1e293b";
        if (!parsed.leftSection.color) parsed.leftSection.color = "#1e293b";
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

  const presetColors = ["#1e293b", "#000000", "#1d4ed8", "#047857", "#7c3aed", "#b91c1c", "#92400e", "#64748b"];

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

        {/* Alignment */}
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

        {/* Font size */}
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
          <Slider min={8} max={20} step={1} value={[section.fontSize]}
            onValueChange={([v]) => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], fontSize: v } }))}
            className="flex-1" />
          <span className="text-xs font-mono w-6 text-center">{section.fontSize}</span>
        </div>

        {/* Color */}
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Palette className="h-3 w-3" />
            اللون:
          </Label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  (section.color || "#1e293b") === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], color: c } }))}
              />
            ))}
            <Input
              type="color"
              value={section.color || "#1e293b"}
              onChange={(e) => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], color: e.target.value } }))}
              className="w-7 h-7 p-0 border-0 cursor-pointer rounded"
              title="لون مخصص"
            />
          </div>
        </div>

        {/* Lines */}
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

  return (
    <div className="space-y-6">
      {/* Report type selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm font-semibold whitespace-nowrap">نوع التقرير:</Label>
        <Select value={selectedReportType} onValueChange={setSelectedReportType}>
          <SelectTrigger className="w-64">
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
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopyFromDefault}>
            <Copy className="h-3.5 w-3.5" />
            نسخ من الافتراضية
          </Button>
        )}
      </div>

      {loadingConfig ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Live Preview */}
          <Card className="border-dashed border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs text-muted-foreground">معاينة مباشرة</Label>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExportPng} disabled={exporting}>
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "جارٍ التصدير..." : "تصدير PNG"}
                </Button>
              </div>
              <div ref={previewRef} dir="rtl" className="border rounded-lg p-4 bg-white relative overflow-hidden" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                {/* Watermark preview overlay */}
                {config.watermark?.enabled && config.watermark.text && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: config.watermark.repeat ? "stretch" : "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 1,
                    overflow: "hidden",
                  }}>
                    {config.watermark.repeat ? (
                      <div style={{
                        position: "absolute",
                        inset: "-100%",
                        display: "flex",
                        flexWrap: "wrap",
                        alignContent: "center",
                        justifyContent: "center",
                        gap: "30px 60px",
                        transform: `rotate(${config.watermark.angle}deg)`,
                      }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <span key={i} style={{
                            fontSize: `${config.watermark!.fontSize * 0.4}px`,
                            color: config.watermark!.color,
                            opacity: config.watermark!.opacity,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}>{config.watermark!.text}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{
                        fontSize: `${config.watermark.fontSize * 0.5}px`,
                        color: config.watermark.color,
                        opacity: config.watermark.opacity,
                        fontWeight: 700,
                        transform: `rotate(${config.watermark.angle}deg)`,
                      }}>{config.watermark.text}</span>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", position: "relative", zIndex: 2 }}>
                  <div style={{ textAlign: config.rightSection.align, fontSize: `${config.rightSection.fontSize}px`, lineHeight: 1.8, color: config.rightSection.color || "#1e293b", flex: "0 1 auto", maxWidth: "40%" }}>
                    {config.rightSection.lines.map((line, i) => (
                      <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {config.centerSection.images.map((img, i) => (
                      <div key={i}>
                        {img ? (
                          <img src={img} alt={`شعار ${i + 1}`} style={{ width: `${(config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60}px`, height: `${config.centerSection.imagesSizes[i] || 60}px`, objectFit: "contain" }} />
                        ) : (
                          <div className="border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30" style={{ width: `${(config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60}px`, height: `${config.centerSection.imagesSizes[i] || 60}px` }}>
                            <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: config.leftSection.align, fontSize: `${config.leftSection.fontSize}px`, lineHeight: 1.8, color: config.leftSection.color || "#1e293b", flex: "0 1 auto", maxWidth: "40%" }}>
                    {config.leftSection.lines.map((line, i) => (
                      <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                    ))}
                  </div>
                </div>
                {/* Footer signatures preview */}
                {config.footerSignatures?.enabled && config.footerSignatures.signatures.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1", position: "relative", zIndex: 2 }}>
                    {config.footerSignatures.signatures.map((sig, i) => (
                      <div key={i} style={{ textAlign: "center", minWidth: "120px" }}>
                        <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>{sig.label}</p>
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#475569" }}>{sig.name || "........................"}</p>
                        <div style={{ marginTop: "20px", borderBottom: "1px solid #94a3b8", width: "100px", marginInline: "auto" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor sections */}
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

          {/* Watermark settings */}
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
                    ...prev,
                    watermark: { ...(prev.watermark || defaultWatermark), enabled: v },
                  }))}
                />
              </div>

              {config.watermark?.enabled && (
                <div className="space-y-4 pt-2 border-t">
                  {/* Text */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">نص العلامة المائية</Label>
                    <Input
                      value={config.watermark.text}
                      onChange={(e) => setConfig((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark!, text: e.target.value },
                      }))}
                      className="h-8 text-sm"
                      dir="rtl"
                      placeholder="مثال: سري، مسودة، نسخة..."
                    />
                  </div>

                  {/* Quick presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Label className="text-xs text-muted-foreground">اقتراحات:</Label>
                    {["سري", "مسودة", "نسخة أصلية", "غير رسمي", "للاطلاع فقط"].map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={config.watermark?.text === t ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setConfig((prev) => ({
                          ...prev,
                          watermark: { ...prev.watermark!, text: t },
                        }))}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>

                  {/* Font size */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
                    <Slider
                      min={20}
                      max={100}
                      step={2}
                      value={[config.watermark.fontSize]}
                      onValueChange={([v]) => setConfig((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark!, fontSize: v },
                      }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-center">{config.watermark.fontSize}</span>
                  </div>

                  {/* Opacity */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">الشفافية:</Label>
                    <Slider
                      min={0.02}
                      max={0.3}
                      step={0.01}
                      value={[config.watermark.opacity]}
                      onValueChange={([v]) => setConfig((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark!, opacity: v },
                      }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-center">{Math.round(config.watermark.opacity * 100)}%</span>
                  </div>

                  {/* Angle */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      الزاوية:
                    </Label>
                    <Slider
                      min={-90}
                      max={0}
                      step={5}
                      value={[config.watermark.angle]}
                      onValueChange={([v]) => setConfig((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark!, angle: v },
                      }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-center">{config.watermark.angle}°</span>
                  </div>

                  {/* Color */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      اللون:
                    </Label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["#94a3b8", "#64748b", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#1e293b"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            config.watermark?.color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => setConfig((prev) => ({
                            ...prev,
                            watermark: { ...prev.watermark!, color: c },
                          }))}
                        />
                      ))}
                      <Input
                        type="color"
                        value={config.watermark.color}
                        onChange={(e) => setConfig((prev) => ({
                          ...prev,
                          watermark: { ...prev.watermark!, color: e.target.value },
                        }))}
                        className="w-7 h-7 p-0 border-0 cursor-pointer rounded"
                        title="لون مخصص"
                      />
                    </div>
                  </div>

                  {/* Repeat toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">تكرار العلامة على كامل الصفحة</Label>
                    <Switch
                      checked={config.watermark.repeat}
                      onCheckedChange={(v) => setConfig((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark!, repeat: v },
                      }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Signatures settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-semibold text-sm">
                  ✍️ توقيعات نهاية الجدول
                </Label>
                <Switch
                  checked={config.footerSignatures?.enabled || false}
                  onCheckedChange={(v) => setConfig((prev) => ({
                    ...prev,
                    footerSignatures: { ...(prev.footerSignatures || defaultFooterSignatures), enabled: v },
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
                          <Input
                            value={sig.label}
                            onChange={(e) => setConfig((prev) => {
                              const sigs = [...(prev.footerSignatures?.signatures || [])];
                              sigs[i] = { ...sigs[i], label: e.target.value };
                              return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                            })}
                            className="h-8 text-sm"
                            dir="rtl"
                            placeholder="مثال: معلم المادة"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap w-14">الاسم:</Label>
                          <Input
                            value={sig.name}
                            onChange={(e) => setConfig((prev) => {
                              const sigs = [...(prev.footerSignatures?.signatures || [])];
                              sigs[i] = { ...sigs[i], name: e.target.value };
                              return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                            })}
                            className="h-8 text-sm"
                            dir="rtl"
                            placeholder="اسم الشخص (اختياري)"
                          />
                        </div>
                      </div>
                      {config.footerSignatures!.signatures.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setConfig((prev) => ({
                            ...prev,
                            footerSignatures: {
                              ...prev.footerSignatures!,
                              signatures: prev.footerSignatures!.signatures.filter((_, idx) => idx !== i),
                            },
                          }))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs w-full"
                    onClick={() => setConfig((prev) => ({
                      ...prev,
                      footerSignatures: {
                        ...prev.footerSignatures!,
                        signatures: [...prev.footerSignatures!.signatures, { label: "التوقيع", name: "" }],
                      },
                    }))}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة توقيع
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margins settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <Label className="font-semibold text-sm">هوامش الترويسة (PDF)</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">الهامش العلوي (mm)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      min={0}
                      max={30}
                      step={1}
                      value={[config.margins?.top ?? 5]}
                      onValueChange={([v]) => setConfig((prev) => ({
                        ...prev,
                        margins: { ...(prev.margins || defaultMargins), top: v },
                      }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-center">{config.margins?.top ?? 5}mm</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">الهامش الجانبي (mm)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      min={2}
                      max={40}
                      step={1}
                      value={[config.margins?.side ?? 8]}
                      onValueChange={([v]) => setConfig((prev) => ({
                        ...prev,
                        margins: { ...(prev.margins || defaultMargins), side: v },
                      }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-center">{config.margins?.side ?? 8}mm</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ إعدادات الترويسة"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
