import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, UserCircle, Plus, KeyRound, Eye, EyeOff, ChevronDown } from "lucide-react";
import TeacherPermissionRow from "./TeacherPermissionRow";

interface Teacher {
  user_id: string;
  email: string;
  full_name: string;
  national_id?: string;
}

interface TeacherManagementCardProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

export default function TeacherManagementCard({ teachers, setTeachers }: TeacherManagementCardProps) {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);

  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherNationalId, setNewTeacherNationalId] = useState("");
  const [newTeacherRole, setNewTeacherRole] = useState<"admin" | "teacher">("teacher");
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [showNewTeacherPass, setShowNewTeacherPass] = useState(false);

  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherPassword.trim()) return;
    const email = newTeacherEmail.trim() || `teacher_${Date.now()}@auto.local`;
    setCreatingTeacher(true);

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "create_user",
        email,
        password: newTeacherPassword,
        full_name: newTeacherName,
        role: newTeacherRole,
        national_id: newTeacherNationalId.trim() || null,
      },
    });

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في إنشاء الحساب", variant: "destructive" });
      setCreatingTeacher(false);
      return;
    }

    toast({ title: "تم الإنشاء", description: `تم إنشاء حساب ${newTeacherName} بنجاح` });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherNationalId("");
    setCreatingTeacher(false);

    const { data: teachersData } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_teachers" },
    });
    if (teachersData?.teachers) {
      setTeachers(teachersData.teachers);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedTeacher || !newPassword.trim()) return;
    if (newPassword.trim().length < 8) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    const teacher = teachers.find((t) => t.user_id === selectedTeacher);
    if (!teacher) return;

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "change_password", user_id: teacher.user_id, password: newPassword },
      });
      setChangingPassword(false);

      const errMsg = data?.error || (error as any)?.message || (typeof error === "string" ? error : null);
      if (errMsg) {
        toast({ title: "خطأ", description: errMsg, variant: "destructive" });
      } else {
        toast({ title: "تم التغيير", description: `تم تغيير كلمة المرور لـ ${teacher.full_name}` });
        setNewPassword("");
        setSelectedTeacher("");
      }
    } catch {
      setChangingPassword(false);
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    }
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">إدارة المعلمين</h3>
                <p className="text-xs text-muted-foreground">إنشاء حسابات وإدارة كلمات المرور والصلاحيات</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{teachers.length} معلم</Badge>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-6">
            {/* قائمة المعلمين مع الصلاحيات */}
            {teachers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-primary" />
                  المعلمون الحاليون
                </h4>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">المعلم</TableHead>
                        <TableHead className="text-right">رقم الهوية</TableHead>
                        <TableHead className="text-center text-xs font-bold text-primary">عرض فقط</TableHead>
                        <TableHead className="text-center text-xs">الطباعة</TableHead>
                        <TableHead className="text-center text-xs">التصدير</TableHead>
                        <TableHead className="text-center text-xs">الإشعارات</TableHead>
                        <TableHead className="text-center text-xs">الحذف</TableHead>
                        <TableHead className="text-center text-xs">الدرجات</TableHead>
                        <TableHead className="text-center text-xs">التحضير</TableHead>
                        <TableHead className="text-center text-xs">عرض الدرجات</TableHead>
                        <TableHead className="text-center text-xs">عرض التقارير</TableHead>
                        <TableHead className="text-center text-xs">عرض الحضور</TableHead>
                        <TableHead className="text-center text-xs">عرض الأنشطة</TableHead>
                        <TableHead className="text-center text-xs">عرض لوحة التحكم</TableHead>
                        <TableHead className="text-center text-xs">عرض الطلاب</TableHead>
                        <TableHead className="text-center text-xs">حفظ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((t) => (
                        <TeacherPermissionRow
                          key={t.user_id}
                          teacher={t}
                          onDeleted={() => setTeachers(prev => prev.filter(tr => tr.user_id !== t.user_id))}
                          onUpdated={(userId, newName, newNationalId) => setTeachers(prev => prev.map(tr => tr.user_id === userId ? { ...tr, full_name: newName, national_id: newNationalId } : tr))}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* إضافة معلم جديد */}
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                إضافة معلم جديد
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">الاسم الكامل</Label>
                  <Input value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="اسم المعلم" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">رقم الهوية الوطنية</Label>
                  <Input value={newTeacherNationalId} onChange={(e) => setNewTeacherNationalId(e.target.value)}
                    placeholder="1XXXXXXXXX" dir="ltr" className="text-right h-9" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">البريد الإلكتروني <span className="text-muted-foreground">(اختياري)</span></Label>
                  <Input type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)}
                    placeholder="teacher@school.edu.sa" dir="ltr" className="text-right h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمة المرور</Label>
                  <div className="relative">
                    <Input type={showNewTeacherPass ? "text" : "password"} value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)}
                      placeholder="كلمة مرور قوية" dir="ltr" className="h-9 pl-9" />
                    <button type="button" onClick={() => setShowNewTeacherPass(!showNewTeacherPass)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showNewTeacherPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الصلاحية</Label>
                  <Select value={newTeacherRole} onValueChange={(v: "admin" | "teacher") => setNewTeacherRole(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">معلم</SelectItem>
                      <SelectItem value="admin">مدير (صلاحيات كاملة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateTeacher}
                    disabled={creatingTeacher || !newTeacherName.trim() || !newTeacherPassword.trim()}
                    className="gap-1.5 h-9 w-full" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    {creatingTeacher ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
                  </Button>
                </div>
              </div>
            </div>

            {/* تغيير كلمة مرور معلم */}
            <div className="space-y-3 rounded-xl border border-border/30 bg-muted/20 p-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-destructive" />
                تغيير كلمة مرور معلم
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">اختر المعلم</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input type={showChangePass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة مرور جديدة" dir="ltr" className="h-9 pl-9" />
                    <button type="button" onClick={() => setShowChangePass(!showChangePass)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showChangePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleChangePassword}
                  disabled={changingPassword || !selectedTeacher || !newPassword.trim()} className="gap-1.5 h-9" size="sm">
                  <KeyRound className="h-3.5 w-3.5" />
                  {changingPassword ? "جارٍ التغيير..." : "تغيير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
