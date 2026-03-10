/**
 * LoginPageSettings — تخصيص صفحة تسجيل الدخول
 * تغيير شعار واسم المدرسة وعنوان لوحة التحكم
 */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings as SettingsIcon, Save, Upload, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function LoginPageSettings() {
  const [schoolName, setSchoolName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["school_name", "school_subtitle", "school_logo_url", "dashboard_title"])
      .then(({ data }) => {
        (data || []).forEach((s) => {
          if (s.id === "school_name") setSchoolName(s.value || "");
          if (s.id === "school_subtitle") setSubtitle(s.value || "");
          if (s.id === "school_logo_url") setLogoUrl(s.value || "");
          if (s.id === "dashboard_title") setDashboardTitle(s.value || "");
        });
      });
  }, []);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const filePath = `school-logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
    await supabase.from("site_settings").upsert({ id: "school_logo_url", value: urlData.publicUrl });
    setLogoUrl(urlData.publicUrl);
    setUploadingLogo(false);
    toast({ title: "تم رفع الشعار بنجاح" });
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "school_name", value: schoolName }),
      supabase.from("site_settings").upsert({ id: "school_subtitle", value: subtitle }),
      supabase.from("site_settings").upsert({ id: "dashboard_title", value: dashboardTitle }),
    ]);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" });
    }
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 text-white">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">إعدادات صفحة تسجيل الدخول</h3>
                <p className="text-xs text-muted-foreground">تخصيص شعار واسم المدرسة</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
            {/* شعار المدرسة */}
            <div className="space-y-2">
              <Label>شعار المدرسة</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                  {logoUrl ? (
                    <img src={logoUrl} alt="شعار المدرسة" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={async () => {
                        await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" });
                        setLogoUrl("");
                        toast({ title: "تم إزالة الشعار" });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      إزالة
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>اسم المدرسة</Label>
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="مثال: ثانوية الفيصلية" />
            </div>
            <div className="space-y-2">
              <Label>الوصف الفرعي</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="مثال: نظام إدارة المدرسة" />
            </div>
            <div className="space-y-2">
              <Label>عنوان لوحة التحكم</Label>
              <Input value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)} placeholder="لوحة التحكم" />
              <p className="text-[11px] text-muted-foreground">يظهر في أعلى لوحة التحكم الرئيسية</p>
            </div>
            <Button disabled={saving} className="gap-1.5" onClick={handleSave}>
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
