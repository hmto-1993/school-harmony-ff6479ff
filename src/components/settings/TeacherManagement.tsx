/**
 * TeacherManagement — إنشاء حسابات المعلمين وتغيير كلمات مرورهم
 * مكون مخصص للمدير فقط
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, KeyRound, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function TeacherManagement() {
  // Teachers list
  const [teachers, setTeachers] = useState<{ user_id: string; email: string; full_name: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // New teacher form
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherNationalId, setNewTeacherNationalId] = useState("");
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [newTeacherRole, setNewTeacherRole] = useState<"admin" | "teacher">("teacher");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_teachers" },
    });
    if (data?.teachers) setTeachers(data.teachers);
  };

  const handleChangePassword = async () => {
    if (!selectedTeacher || !newPassword.trim()) return;
    const teacher = teachers.find((t) => t.user_id === selectedTeacher);
    if (!teacher) return;
    setChangingPassword(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "change_password", email: teacher.email, password: newPassword },
    });
    setChangingPassword(false);
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في تغيير كلمة المرور", variant: "destructive" });
    } else {
      toast({ title: "تم التغيير", description: `تم تغيير كلمة المرور لـ ${teacher.full_name}` });
      setNewPassword("");
      setSelectedTeacher("");
    }
  };

  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()) return;
    setCreatingTeacher(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create_user", email: newTeacherEmail, password: newTeacherPassword, full_name: newTeacherName, role: newTeacherRole },
    });
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في إنشاء الحساب", variant: "destructive" });
      setCreatingTeacher(false);
      return;
    }
    if (newTeacherNationalId.trim() && data?.user_id) {
      await supabase.from("profiles").update({ national_id: newTeacherNationalId }).eq("user_id", data.user_id);
    }
    toast({ title: "تم الإنشاء", description: `تم إنشاء حساب ${newTeacherName} بنجاح` });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherNationalId("");
    setCreatingTeacher(false);
    fetchTeachers();
  };

  return (
    <>
      {/* إضافة معلم */}
      <Collapsible>
        <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <h3 className="text-base font-bold text-foreground">إضافة معلم</h3>
                  <p className="text-xs text-muted-foreground">إنشاء حساب جديد للمعلمين</p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="اسم المعلم" />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} placeholder="teacher@school.edu.sa" dir="ltr" className="text-right" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهوية الوطنية</Label>
                <Input value={newTeacherNationalId} onChange={(e) => setNewTeacherNationalId(e.target.value)} placeholder="1XXXXXXXXX" dir="ltr" className="text-right" inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)} placeholder="كلمة مرور قوية" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select value={newTeacherRole} onValueChange={(v: "admin" | "teacher") => setNewTeacherRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">معلم</SelectItem>
                    <SelectItem value="admin">مدير (صلاحيات كاملة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTeacher} disabled={creatingTeacher || !newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()} className="gap-1.5">
                <Plus className="h-4 w-4" />
                {creatingTeacher ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* تغيير كلمة مرور المعلم */}
      <Collapsible>
        <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20 text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <h3 className="text-base font-bold text-foreground">تغيير كلمة مرور المعلم</h3>
                  <p className="text-xs text-muted-foreground">إعادة تعيين كلمات مرور المعلمين</p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>اختر المعلم</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" dir="ltr" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword || !selectedTeacher || !newPassword.trim()} className="gap-1.5">
                <KeyRound className="h-4 w-4" />
                {changingPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
}
