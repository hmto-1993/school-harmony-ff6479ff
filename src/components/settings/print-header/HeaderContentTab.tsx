import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Type, GripVertical, ArrowLeft, ArrowRight, Palette, RotateCcw, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PrintHeaderConfig, defaultConfig, presetColors } from "../print-header-types";
import { fetchDynamicRightLines, fetchDynamicLeftLines } from "@/lib/dynamic-header-lines";

interface HeaderContentTabProps {
  config: PrintHeaderConfig;
  setConfig: Dispatch<SetStateAction<PrintHeaderConfig>>;
}

const alignOptions = [
  { value: "right", icon: AlignRight },
  { value: "center", icon: AlignCenter },
  { value: "left", icon: AlignLeft },
];

export default function HeaderContentTab({ config, setConfig }: HeaderContentTabProps) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dynamicRightLines, setDynamicRightLines] = useState<string[] | null>(null);
  const [dynamicLeftLines, setDynamicLeftLines] = useState<string[] | null>(null);

  useEffect(() => {
    fetchDynamicRightLines().then(setDynamicRightLines);
    fetchDynamicLeftLines().then(setDynamicLeftLines);
  }, []);

  const updateLine = (section: "rightSection" | "leftSection", index: number, value: string) => {
    setConfig((prev) => {
      const lines = [...prev[section].lines];
      lines[index] = value;
      return { ...prev, [section]: { ...prev[section], lines } };
    });
  };

  const addLine = (section: "rightSection" | "leftSection") => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], lines: [...prev[section].lines, ""] } }));
  };

  const removeLine = (section: "rightSection" | "leftSection", index: number) => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], lines: prev[section].lines.filter((_, i) => i !== index) } }));
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

  const renderTextSection = (
    sectionKey: "rightSection" | "leftSection",
    title: string,
    icon: React.ReactNode,
    options?: { readOnly?: boolean }
  ) => {
    const section = config[sectionKey];
    const readOnly = !!options?.readOnly;
    // Read-only sections render dynamic values pulled from settings.
    // Right = subscriber identity; Left = academic context (year/term/class/subject).
    const fallbackRight = [
      "المملكة العربية السعودية",
      "وزارة التعليم",
      "الإدارة العامة للتعليم بمنطقة: ............",
      "............",
    ];
    const fallbackLeft = [
      "السنة الدراسية: ............",
      "الفصل الدراسي: ............",
      "الصف: ............",
      "المادة: ............",
    ];
    const displayLines = readOnly
      ? sectionKey === "rightSection"
        ? (dynamicRightLines ?? fallbackRight)
        : (dynamicLeftLines ?? fallbackLeft)
      : section.lines;
    const readOnlyAlign: "right" | "left" = sectionKey === "rightSection" ? "right" : "left";
    const readOnlyDir: "rtl" | "ltr" = sectionKey === "rightSection" ? "rtl" : "rtl"; // keep RTL doc flow
    const readOnlyHint =
      sectionKey === "rightSection"
        ? "🔒 يُجلب تلقائياً من إعدادات المشترك (المنطقة + اسم المدرسة) — غير قابل للتعديل."
        : "🔒 يُجلب تلقائياً (السنة الدراسية + الفصل + الصف + المادة) — غير قابل للتعديل.";
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-semibold text-sm">{icon}{title}</Label>
          {readOnly ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Lock className="h-3 w-3" />للقراءة فقط
            </span>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addLine(sectionKey)}>
              <Plus className="h-3 w-3" />سطر
            </Button>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">المحاذاة:</Label>
            <div className="flex border rounded-md overflow-hidden">
              {alignOptions.map((opt) => (
                <button key={opt.value} type="button"
                  className={`p-1.5 transition-colors ${section.align === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setConfig((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], align: opt.value as any } }))}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        )}
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
              <button key={c} type="button"
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
          {readOnly ? (
            <div
              className="rounded-md border bg-muted/40 px-3 py-2 space-y-1"
              style={{ textAlign: "right", direction: "rtl" }}
            >
              {displayLines.map((line, i) => (
                <p key={i} className="text-sm font-medium text-foreground/90 select-text" style={{ margin: 0 }}>
                  {line}
                </p>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
                🔒 يُجلب تلقائياً من إعدادات المشترك (المنطقة + اسم المدرسة) — غير قابل للتعديل اليدوي.
              </p>
            </div>
          ) : (
            section.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input value={line} onChange={(e) => updateLine(sectionKey, i, e.target.value)} className="h-8 text-sm" placeholder={`سطر ${i + 1}`} dir="rtl" />
                {section.lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => removeLine(sectionKey, i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7"
          onClick={() => {
            setConfig((prev) => ({
              ...prev,
              rightSection: { ...defaultConfig.rightSection },
              centerSection: { ...defaultConfig.centerSection },
              leftSection: { ...defaultConfig.leftSection },
            }));
            toast({ title: "تم", description: "تمت استعادة الترويسة الافتراضية" });
          }}>
          <RotateCcw className="h-3 w-3" />
          استعادة الافتراضي
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">{renderTextSection("rightSection", "الجانب الأيمن", <Type className="h-4 w-4" />, { readOnly: true })}</CardContent></Card>

        {/* Center images */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-semibold text-sm"><ImageIcon className="h-4 w-4" />الشعارات (الوسط)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addImageSlot}><Plus className="h-3 w-3" />شعار</Button>
            </div>
            {config.centerSection.images.map((img, i) => (
              <div key={i} className={`space-y-2 border rounded-lg p-2.5 transition-colors ${dragIndex === i ? "border-primary bg-primary/5" : ""}`}
                draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null && dragIndex !== i) moveImage(dragIndex, i); setDragIndex(null); }} onDragEnd={() => setDragIndex(null)}>
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
    </div>
  );
}
