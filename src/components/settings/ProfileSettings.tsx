/**
 * ProfileSettings — الملف الشخصي وتغيير كلمة المرور
 * يتيح للمستخدم تعديل بياناته الشخصية وتغيير كلمة مروره
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserCircle, Save, KeyRound, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNationalId, setProfileNationalId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newOwnPassword, setNewOwnPassword] = useState("");
  const [confirmOwnPassword, setConfirmOwnPassword] = useState("");
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, national_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.full_name || "");
          setProfilePhone(data.phone || "");
          setProfileNationalId(data.national_id || "");
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileName, phone: profilePhone, national_id: profileNationalId || null })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي بنجاح" });
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!newOwnPassword.trim() || !currentPassword.trim()) return;
    if (newOwnPassword !== confirmOwnPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" });
      return;
    }
    setChangingOwnPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" });
      setChangingOwnPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newOwnPassword });
    setChangingOwnPassword(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewOwnPassword("");
      setConfirmOwnPassword("");
    }
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20 text-white">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">الملف الشخصي</h3>
                <p className="text-xs text-muted-foreground">تعديل بياناتك الشخصية وكلمة المرور</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية الوطنية</Label>
              <Input value={profileNationalId} onChange={(e) => setProfileNationalId(e.target.value)} placeholder="1XXXXXXXXX" dir="ltr" className="text-right" inputMode="numeric" />
              <p className="text-xs text-muted-foreground">يُستخدم لتسجيل الدخول بدلاً من البريد الإلكتروني</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />
              {savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-base font-semibold">تغيير كلمة المرور</h3>
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="أدخل كلمة المرور الحالية" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={newOwnPassword} onChange={(e) => setNewOwnPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور الجديدة</Label>
                <Input type="password" value={confirmOwnPassword} onChange={(e) => setConfirmOwnPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور الجديدة" dir="ltr" />
              </div>
              <Button onClick={handleChangeOwnPassword} disabled={changingOwnPassword || !currentPassword.trim() || !newOwnPassword.trim() || !confirmOwnPassword.trim()} className="gap-1.5">
                <KeyRound className="h-4 w-4" />
                {changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
