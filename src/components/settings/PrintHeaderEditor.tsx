import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";

interface SectionConfig {
  lines: string[];
  fontSize: number;
  align: "right" | "center" | "left";
}

interface CenterSectionConfig {
  images: string[];
  imagesSizes: number[];
}

export interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
}

const defaultConfig: PrintHeaderConfig = {
  rightSection: {
    lines: ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم", "مدرسة ..."],
    fontSize: 12,
    align: "right",
  },
  centerSection: {
    images: ["", "", ""],
    imagesSizes: [60, 80, 60],
  },
  leftSection: {
    lines: ["اختبار: ...", "المادة: ...", "الصف: ...", "الزمن: ..."],
    fontSize: 12,
    align: "left",
  },
};

export default function PrintHeaderEditor() {
  const [config, setConfig] = useState<PrintHeaderConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (data?.value) {
        try {
          setConfig(JSON.parse(data.value));
        } catch {}
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: JSON.stringify(config) })
      .eq("id", "print_header_config");
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات ترويسة الطباعة" });
    }
  };

  const handleExportPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
      });
      const link = document.createElement("a");
      link.download = "print-header.png";
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
      [section]: {
        ...prev[section],
        lines: prev[section].lines.filter((_, i) => i !== index),
      },
    }));
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploading(index);
    const formData = new FormData();
    formData.append("file", file);

    const { data, error } = await supabase.functions.invoke("upload-letterhead", {
      body: formData,
    });

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

  const addImageSlot = () => {
    setConfig((prev) => ({
      ...prev,
      centerSection: {
        images: [...prev.centerSection.images, ""],
        imagesSizes: [...prev.centerSection.imagesSizes, 60],
      },
    }));
  };

  const removeImageSlot = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      centerSection: {
        images: prev.centerSection.images.filter((_, i) => i !== index),
        imagesSizes: prev.centerSection.imagesSizes.filter((_, i) => i !== index),
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

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    moveImage(dragIndex, targetIndex);
    setDragIndex(null);
  };

  const alignOptions = [
    { value: "right", icon: AlignRight, label: "يمين" },
    { value: "center", icon: AlignCenter, label: "وسط" },
    { value: "left", icon: AlignLeft, label: "يسار" },
  ];

  const renderTextSection = (
    sectionKey: "rightSection" | "leftSection",
    title: string,
    icon: React.ReactNode
  ) => {
    const section = config[sectionKey];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold text-sm">
            {icon}
            {title}
          </Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addLine(sectionKey)}>
            <Plus className="h-3 w-3" />
            سطر
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">المحاذاة:</Label>
          <div className="flex border rounded-md overflow-hidden">
            {alignOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`p-1.5 transition-colors ${
                  section.align === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    [sectionKey]: { ...prev[sectionKey], align: opt.value as any },
                  }))
                }
              >
                <opt.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
          <Slider
            min={8}
            max={20}
            step={1}
            value={[section.fontSize]}
            onValueChange={([v]) =>
              setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], fontSize: v } }))
            }
            className="flex-1"
          />
          <span className="text-xs font-mono w-6 text-center">{section.fontSize}</span>
        </div>

        <div className="space-y-2">
          {section.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={line}
                onChange={(e) => updateLine(sectionKey, i, e.target.value)}
                className="h-8 text-sm"
                placeholder={`سطر ${i + 1}`}
                dir="rtl"
              />
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
      {/* Live Preview */}
      <Card className="border-dashed border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs text-muted-foreground">معاينة مباشرة</Label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleExportPng}
              disabled={exporting}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "جارٍ التصدير..." : "تصدير PNG"}
            </Button>
          </div>
          <div
            ref={previewRef}
            dir="rtl"
            className="border rounded-lg p-4 bg-white text-foreground"
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div
                style={{
                  textAlign: config.rightSection.align,
                  fontSize: `${config.rightSection.fontSize}px`,
                  lineHeight: 1.8,
                  flex: 1,
                }}
              >
                {config.rightSection.lines.map((line, i) => (
                  <p key={i} className="m-0 text-black font-semibold">{line || "\u00A0"}</p>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {config.centerSection.images.map((img, i) => (
                  <div key={i} className="flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={`شعار ${i + 1}`}
                        style={{
                          width: `${config.centerSection.imagesSizes[i] || 60}px`,
                          height: `${config.centerSection.imagesSizes[i] || 60}px`,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30"
                        style={{
                          width: `${config.centerSection.imagesSizes[i] || 60}px`,
                          height: `${config.centerSection.imagesSizes[i] || 60}px`,
                        }}
                      >
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  textAlign: config.leftSection.align,
                  fontSize: `${config.leftSection.fontSize}px`,
                  lineHeight: 1.8,
                  flex: 1,
                }}
              >
                {config.leftSection.lines.map((line, i) => (
                  <p key={i} className="m-0 text-black font-semibold">{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            {renderTextSection("rightSection", "الجانب الأيمن", <Type className="h-4 w-4" />)}
          </CardContent>
        </Card>

        {/* Center section (images) with drag & drop */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-semibold text-sm">
                <ImageIcon className="h-4 w-4" />
                الشعارات (الوسط)
              </Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addImageSlot}>
                <Plus className="h-3 w-3" />
                شعار
              </Button>
            </div>

            {config.centerSection.images.map((img, i) => (
              <div
                key={i}
                className={`space-y-2 border rounded-lg p-2.5 transition-colors ${
                  dragIndex === i ? "border-primary bg-primary/5" : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragIndex(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <span className="text-xs text-muted-foreground">شعار {i + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Move arrows */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => moveImage(i, i - 1)}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === config.centerSection.images.length - 1}
                      onClick={() => moveImage(i, i + 1)}
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    {config.centerSection.images.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeImageSlot(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {img ? (
                  <div className="flex items-center gap-2">
                    <img src={img} alt="" className="h-10 w-10 object-contain rounded border" />
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => removeImage(i)}>
                      <Trash2 className="h-3 w-3" />
                      إزالة
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      className="h-8 text-xs cursor-pointer"
                      disabled={uploading === i}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(i, file);
                        e.target.value = "";
                      }}
                    />
                    {uploading === i && <p className="text-xs text-muted-foreground mt-1">جارٍ الرفع...</p>}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">الحجم:</Label>
                  <Slider
                    min={30}
                    max={120}
                    step={5}
                    value={[config.centerSection.imagesSizes[i] || 60]}
                    onValueChange={([v]) => updateImageSize(i, v)}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-center">{config.centerSection.imagesSizes[i] || 60}px</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {renderTextSection("leftSection", "الجانب الأيسر", <Type className="h-4 w-4" />)}
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ إعدادات الترويسة"}
        </Button>
      </div>
    </div>
  );
}
