import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CollapsibleSettingsCard from "@/components/settings/CollapsibleSettingsCard";

interface LoginSettingsCardProps {
  schoolLogoUrl: string;
  setSchoolLogoUrl: (v: string) => void;
  uploadingLogo: boolean;
  setUploadingLogo: (v: boolean) => void;
  logoInputRef: React.RefObject<HTMLInputElement>;
  loginSchoolName: string;
  setLoginSchoolName: (v: string) => void;
  loginSubtitle: string;
  setLoginSubtitle: (v: string) => void;
  dashboardTitle: string;
  setDashboardTitle: (v: string) => void;
  // Kept for backward-compatibility with SettingsPage props but no longer rendered
  educationDepartment?: string;
  setEducationDepartment?: (v: string) => void;
  savingLogin: boolean;
  setSavingLogin: (v: boolean) => void;
}

export function LoginSettingsCard(props: LoginSettingsCardProps) {
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    props.setUploadingLogo(true);
    const filePath = `school-logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" });
      props.setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
    await supabase.from("site_settings").upsert({ id: "school_logo_url", value: urlData.publicUrl });
    props.setSchoolLogoUrl(urlData.publicUrl);
    props.setUploadingLogo(false);
    toast({ title: "تم رفع الشعار بنجاح" });
    e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" });
    props.setSchoolLogoUrl("");
    toast({ title: "تم إزالة الشعار" });
  };

  const handleSave = async () => {
    props.setSavingLogin(true);
    // ملاحظة: هذه الإعدادات مستقلة تماماً عن ترويسة الطباعة.
    // نحفظ فقط الوصف الفرعي وعنوان لوحة التحكم، ولا نلمس اسم المدرسة/المنطقة التعليمية هنا.
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "school_subtitle", value: props.loginSubtitle }),
      supabase.from("site_settings").upsert({ id: "dashboard_title", value: props.dashboardTitle }),
    ]);
    props.setSavingLogin(false);
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" });
    }
  };

  return (
    <CollapsibleSettingsCard
      icon={SettingsIcon}
      iconGradient="from-indigo-500 to-violet-600"
      iconShadow="shadow-lg shadow-indigo-500/20"
      title="إعدادات صفحة تسجيل الدخول"
      description="تخصيص شعار واسم المنصة (مستقلة عن ترويسة الطباعة)"
    >
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>شعار المنصة</Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
              {props.schoolLogoUrl ? (
                <img src={props.schoolLogoUrl} alt="شعار المنصة" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={props.logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button type="button" variant="outline" size="sm" disabled={props.uploadingLogo} onClick={() => props.logoInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" />{props.uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
              </Button>
              {props.schoolLogoUrl && (
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                  <Trash2 className="h-4 w-4" />إزالة
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">يظهر في صفحة تسجيل الدخول فقط، ولا علاقة له بترويسة الطباعة.</p>
        </div>

        <div className="space-y-2">
          <Label>اسم المنصة</Label>
          <Input value="منصة المتميز الرقمية" disabled readOnly className="bg-muted/40" />
          <p className="text-[11px] text-muted-foreground">اسم ثابت لا يمكن تعديله.</p>
        </div>

        <div className="space-y-2">
          <Label>الوصف الفرعي</Label>
          <Input value={props.loginSubtitle} onChange={(e) => props.setLoginSubtitle(e.target.value)} placeholder="مثال: نظام إدارة المدرسة" />
        </div>

        <div className="space-y-2">
          <Label>عنوان لوحة التحكم</Label>
          <Input value={props.dashboardTitle} onChange={(e) => props.setDashboardTitle(e.target.value)} placeholder="لوحة التحكم" />
          <p className="text-[11px] text-muted-foreground">يظهر في أعلى لوحة التحكم الرئيسية</p>
        </div>

        <Button disabled={props.savingLogin} className="gap-1.5" onClick={handleSave}>
          <Save className="h-4 w-4" />{props.savingLogin ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>
    </CollapsibleSettingsCard>
  );
}
