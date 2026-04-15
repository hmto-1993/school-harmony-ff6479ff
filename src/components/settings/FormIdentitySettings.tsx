import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Upload, Save, RotateCcw, Image, PenTool, Type, FileText,
  X, Loader2, Eye, Trash2, ShieldAlert,
} from "lucide-react";

interface FormIdentityConfig {
  headerRightLines: string[];
  headerLeftLines: string[];
  headerFontSize: number;
  ministryLogoUrl: string;
  schoolLogoUrl: string;
  signatureImageUrl: string;
  useLiveSignature: boolean;
  footerText: string;
  confidentialWatermarkOpacity: number;
}

const DEFAULT_CONFIG: FormIdentityConfig = {
  headerRightLines: ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم", "ثانوية الفيصلية"],
  headerLeftLines: ["ألفا فيزياء", "Alpha Physics"],
  headerFontSize: 9,
  ministryLogoUrl: "",
  schoolLogoUrl: "",
  signatureImageUrl: "",
  useLiveSignature: true,
  footerText: "",
  confidentialWatermarkOpacity: 0.08,
};

interface Props {
  onClose?: () => void;
}

export default function FormIdentitySettings({ onClose }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<FormIdentityConfig>({ ...DEFAULT_CONFIG });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingMinistry, setUploadingMinistry] = useState(false);
  const [uploadingSchool, setUploadingSchool] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const ministryRef = useRef<HTMLInputElement>(null);
  const schoolRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .like("id", "form_identity_%");
      if (data) {
        const map = new Map(data.map((r) => [r.id, r.value]));
        setConfig({
          headerRightLines: map.has("form_identity_right_lines")
            ? JSON.parse(map.get("form_identity_right_lines")!)
            : DEFAULT_CONFIG.headerRightLines,
          headerLeftLines: map.has("form_identity_left_lines")
            ? JSON.parse(map.get("form_identity_left_lines")!)
            : DEFAULT_CONFIG.headerLeftLines,
          headerFontSize: map.has("form_identity_font_size")
            ? Number(map.get("form_identity_font_size"))
            : DEFAULT_CONFIG.headerFontSize,
          ministryLogoUrl: map.get("form_identity_ministry_logo") || "",
          schoolLogoUrl: map.get("form_identity_school_logo") || "",
          signatureImageUrl: map.get("form_identity_signature_img") || "",
          useLiveSignature: map.has("form_identity_live_sig")
            ? map.get("form_identity_live_sig") === "true"
            : true,
          footerText: map.get("form_identity_footer") || "",
          confidentialWatermarkOpacity: map.has("form_identity_conf_opacity")
            ? Number(map.get("form_identity_conf_opacity"))
            : DEFAULT_CONFIG.confidentialWatermarkOpacity,
        });
      }
      setLoading(false);
    })();
  }, []);

  const uploadImage = async (
    file: File,
    prefix: string,
    setUploading: (v: boolean) => void,
  ): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user?.id}/${prefix}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("print-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("print-assets")
        .getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      console.error(err);
      toast.error("فشل رفع الصورة");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FormIdentityConfig,
    prefix: string,
    setUploading: (v: boolean) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, prefix, setUploading);
    if (url) {
      setConfig((prev) => ({ ...prev, [field]: url }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [
        { id: "form_identity_right_lines", value: JSON.stringify(config.headerRightLines) },
        { id: "form_identity_left_lines", value: JSON.stringify(config.headerLeftLines) },
        { id: "form_identity_font_size", value: String(config.headerFontSize) },
        { id: "form_identity_ministry_logo", value: config.ministryLogoUrl },
        { id: "form_identity_school_logo", value: config.schoolLogoUrl },
        { id: "form_identity_signature_img", value: config.signatureImageUrl },
        { id: "form_identity_live_sig", value: String(config.useLiveSignature) },
        { id: "form_identity_footer", value: config.footerText },
        { id: "form_identity_conf_opacity", value: String(config.confidentialWatermarkOpacity) },
      ];
      for (const entry of entries) {
        await supabase.from("site_settings").upsert(entry);
      }
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
    toast.success("تمت استعادة الإعدادات الافتراضية — اضغط حفظ للتأكيد");
  };

  const updateRightLine = (index: number, value: string) => {
    setConfig((prev) => {
      const lines = [...prev.headerRightLines];
      lines[index] = value;
      return { ...prev, headerRightLines: lines };
    });
  };

  const updateLeftLine = (index: number, value: string) => {
    setConfig((prev) => {
      const lines = [...prev.headerLeftLines];
      lines[index] = value;
      return { ...prev, headerLeftLines: lines };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== 1. Header Customization ===== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          تخصيص الترويسة
        </h3>

        {/* Logos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ministry Logo */}
          <div className="space-y-2">
            <Label className="text-xs">شعار الوزارة (يمين)</Label>
            {config.ministryLogoUrl ? (
              <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-muted">
                <img src={config.ministryLogoUrl} alt="شعار الوزارة" className="w-full h-full object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-0.5 left-0.5 h-5 w-5"
                  onClick={() => setConfig((p) => ({ ...p, ministryLogoUrl: "" }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => ministryRef.current?.click()}
                disabled={uploadingMinistry}
              >
                {uploadingMinistry ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                رفع صورة
              </Button>
            )}
            <input
              ref={ministryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "ministryLogoUrl", "ministry", setUploadingMinistry)}
            />
          </div>

          {/* School Logo */}
          <div className="space-y-2">
            <Label className="text-xs">شعار المدرسة / ألفا فيزياء (يسار)</Label>
            {config.schoolLogoUrl ? (
              <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-muted">
                <img src={config.schoolLogoUrl} alt="شعار المدرسة" className="w-full h-full object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-0.5 left-0.5 h-5 w-5"
                  onClick={() => setConfig((p) => ({ ...p, schoolLogoUrl: "" }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => schoolRef.current?.click()}
                disabled={uploadingSchool}
              >
                {uploadingSchool ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                رفع صورة
              </Button>
            )}
            <input
              ref={schoolRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "schoolLogoUrl", "school", setUploadingSchool)}
            />
          </div>
        </div>

        {/* Header text lines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">نصوص الترويسة (يمين)</Label>
            {config.headerRightLines.map((line, i) => (
              <Input
                key={i}
                value={line}
                onChange={(e) => updateRightLine(i, e.target.value)}
                className="text-xs h-8"
                placeholder={`السطر ${i + 1}`}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6"
              onClick={() => setConfig((p) => ({ ...p, headerRightLines: [...p.headerRightLines, ""] }))}
            >
              + إضافة سطر
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">نصوص الترويسة (يسار)</Label>
            {config.headerLeftLines.map((line, i) => (
              <Input
                key={i}
                value={line}
                onChange={(e) => updateLeftLine(i, e.target.value)}
                className="text-xs h-8"
                placeholder={`السطر ${i + 1}`}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6"
              onClick={() => setConfig((p) => ({ ...p, headerLeftLines: [...p.headerLeftLines, ""] }))}
            >
              + إضافة سطر
            </Button>
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-3 max-w-xs">
          <Label className="text-xs shrink-0">حجم خط الترويسة</Label>
          <Select
            value={String(config.headerFontSize)}
            onValueChange={(v) => setConfig((p) => ({ ...p, headerFontSize: Number(v) }))}
          >
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[7, 8, 9, 10, 11, 12].map((s) => (
                <SelectItem key={s} value={String(s)}>{s}pt</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* ===== 2. Signature Management ===== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <PenTool className="h-4 w-4 text-primary" />
          إدارة التوقيع
        </h3>

        {/* Upload signature image */}
        <div className="space-y-2">
          <Label className="text-xs">صورة التوقيع الرسمي (بخلفية شفافة)</Label>
          <div className="flex items-center gap-3">
            {config.signatureImageUrl ? (
              <div className="relative h-16 w-40 border rounded-lg bg-muted/50 p-1">
                <img src={config.signatureImageUrl} alt="التوقيع" className="w-full h-full object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -left-1 h-5 w-5"
                  onClick={() => setConfig((p) => ({ ...p, signatureImageUrl: "" }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => signatureRef.current?.click()}
                disabled={uploadingSignature}
              >
                {uploadingSignature ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3 w-3" />}
                رفع صورة التوقيع
              </Button>
            )}
            <input
              ref={signatureRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => handleFileChange(e, "signatureImageUrl", "signature", setUploadingSignature)}
            />
          </div>
        </div>

        {/* Toggle live signature */}
        <div className="flex items-center justify-between max-w-md">
          <div>
            <Label className="text-xs font-semibold">التوقيع الحي (الرسم اليدوي)</Label>
            <p className="text-[10px] text-muted-foreground">تفعيل مساحة الرسم (Canvas) عند إصدار النماذج</p>
          </div>
          <Switch
            checked={config.useLiveSignature}
            onCheckedChange={(v) => setConfig((p) => ({ ...p, useLiveSignature: v }))}
          />
        </div>
      </div>

      <Separator />

      {/* ===== 3. Footer Settings ===== */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          التذييل الثابت
        </h3>
        <Textarea
          value={config.footerText}
          onChange={(e) => setConfig((p) => ({ ...p, footerText: e.target.value }))}
          placeholder="نص ثابت يظهر أسفل كل صفحة PDF (مثل: ملاحظات هامة، رابط المنصة...)"
          className="text-xs min-h-[60px]"
        />
      </div>

      <Separator />

      {/* ===== 4. Confidential Watermark Opacity ===== */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          العلامة المائية السرية
        </h3>
        <p className="text-[11px] text-muted-foreground">التحكم في وضوح نص "سري للغاية" الذي يظهر على النماذج السرية</p>
        <div className="flex items-center gap-3 max-w-sm">
          <Label className="text-xs shrink-0 whitespace-nowrap">الوضوح:</Label>
          <Slider
            min={0.02}
            max={0.25}
            step={0.01}
            value={[config.confidentialWatermarkOpacity]}
            onValueChange={([v]) => setConfig((p) => ({ ...p, confidentialWatermarkOpacity: v }))}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-center">{Math.round(config.confidentialWatermarkOpacity * 100)}%</span>
        </div>
        {/* Mini preview */}
        <div className="relative border rounded-lg bg-white dark:bg-slate-950 p-4 h-20 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-2xl font-bold"
              style={{
                color: `rgba(220, 38, 38, ${config.confidentialWatermarkOpacity})`,
                transform: "rotate(-30deg)",
              }}
            >
              سري للغاية
            </span>
          </div>
          <div className="relative z-10 space-y-1">
            <div className="h-1.5 rounded-full bg-muted w-3/4" />
            <div className="h-1.5 rounded-full bg-muted w-1/2" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ===== 5. Live Preview ===== */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          معاينة فورية
        </h3>
        <div className="border rounded-xl bg-white dark:bg-slate-950 p-4 shadow-inner" dir="rtl">
          {/* Mini Preview */}
          <div className="max-w-xs mx-auto space-y-2">
            {/* Top border */}
            <div className="h-[2px] bg-[hsl(var(--primary))]" />
            <div className="h-[0.5px] bg-[hsl(var(--primary))] opacity-50" />

            {/* Header row */}
            <div className="flex items-start justify-between pt-1">
              {/* Right: Ministry logo + text */}
              <div className="flex items-start gap-1.5">
                {config.ministryLogoUrl && (
                  <img src={config.ministryLogoUrl} alt="" className="w-6 h-6 object-contain rounded" />
                )}
                <div className="text-[7px] leading-[10px] text-foreground">
                  {config.headerRightLines.map((l, i) => (
                    <div key={i}>{l || "..."}</div>
                  ))}
                </div>
              </div>

              {/* Center logo placeholder */}
              <div className="w-8 h-8 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center shrink-0">
                <span className="text-[6px] text-muted-foreground">شعار</span>
              </div>

              {/* Left: school logo + text */}
              <div className="flex items-start gap-1.5 flex-row-reverse">
                {config.schoolLogoUrl && (
                  <img src={config.schoolLogoUrl} alt="" className="w-6 h-6 object-contain rounded" />
                )}
                <div className="text-[7px] leading-[10px] text-foreground text-left">
                  {config.headerLeftLines.map((l, i) => (
                    <div key={i}>{l || "..."}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <div className="text-[9px] font-bold text-primary">عنوان النموذج</div>
              <div className="h-[1px] w-16 mx-auto bg-primary/40 mt-0.5" />
            </div>

            {/* Body placeholder */}
            <div className="space-y-1 py-1">
              <div className="h-1.5 rounded-full bg-muted w-full" />
              <div className="h-1.5 rounded-full bg-muted w-4/5" />
              <div className="h-1.5 rounded-full bg-muted w-11/12" />
              <div className="h-1.5 rounded-full bg-muted w-3/5" />
            </div>

            {/* Signature area */}
            <div className="flex items-center justify-between pt-2 border-t border-muted">
              <div className="text-center">
                <div className="text-[6px] text-muted-foreground">توقيع الطالب</div>
                <div className="h-4 w-12 border-b border-muted-foreground/30 mt-1" />
              </div>
              <div className="text-center">
                <div className="text-[6px] text-muted-foreground">توقيع المعلم</div>
                {config.signatureImageUrl ? (
                  <img src={config.signatureImageUrl} alt="" className="h-4 w-12 object-contain mt-1" />
                ) : (
                  <div className="h-4 w-12 border-b border-muted-foreground/30 mt-1" />
                )}
              </div>
            </div>

            {/* Footer */}
            {config.footerText && (
              <div className="text-[6px] text-muted-foreground text-center pt-1 border-t border-dashed border-muted">
                {config.footerText}
              </div>
            )}

            {/* Bottom border */}
            <div className="h-[0.5px] bg-primary/50" />
            <div className="h-[2px] bg-[hsl(var(--primary))]" />
          </div>
        </div>
      </div>

      <Separator />

      {/* ===== Actions ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
          <RotateCcw className="h-4 w-4" />
          استعادة الإعدادات الافتراضية
        </Button>
      </div>
    </div>
  );
}
