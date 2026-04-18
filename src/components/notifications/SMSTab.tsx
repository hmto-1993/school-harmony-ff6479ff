import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GraduationCap, Megaphone, MessageSquare, Send, UserX, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface StudentWithPhone {
  id: string;
  full_name: string;
  parent_phone: string | null;
  class_id: string | null;
  classes?: { name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
}

type SMSType = "grades" | "absence" | "summon";

const SMS_TEMPLATES: Record<SMSType, string> = {
  grades: "ولي أمر الطالب {name}، نود إبلاغكم بأن تقييم ابنكم/ابنتكم متاح الآن. يرجى متابعة المستوى الدراسي.",
  absence: "ولي أمر الطالب {name}، نود إبلاغكم بتغيب ابنكم/ابنتكم عن المدرسة اليوم. يرجى التواصل مع الإدارة.",
  summon: "ولي أمر الطالب {name}، نرجو حضوركم إلى المدرسة في أقرب وقت ممكن لمناقشة أمر يخص ابنكم/ابنتكم.",
};

const SMS_TYPE_LABELS: Record<SMSType, string> = {
  grades: "تقييم الطالب",
  absence: "غياب الطالب",
  summon: "استدعاء ولي الأمر",
};

interface SMSTabProps {
  isReadOnly: boolean;
  onNotificationSent?: () => void;
}

export default function SMSTab({ isReadOnly, onNotificationSent }: SMSTabProps) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<StudentWithPhone[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [smsType, setSmsType] = useState<SMSType>("grades");
  const [customMessage, setCustomMessage] = useState(SMS_TEMPLATES.grades);
  const [sending, setSending] = useState(false);
  const [smsLog, setSmsLog] = useState<{ name: string; phone: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSelectedStudents([]); return; }
    supabase
      .from("students")
      .select("id, full_name, parent_phone, class_id, classes(name)")
      .eq("class_id", selectedClass)
      .order("full_name")
      .then(({ data }) => {
        setStudents((data as StudentWithPhone[]) || []);
        setSelectedStudents([]);
      });
  }, [selectedClass]);

  useEffect(() => { setCustomMessage(SMS_TEMPLATES[smsType]); }, [smsType]);

  const studentsWithPhone = students.filter((s) => s.parent_phone);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedStudents.length === studentsWithPhone.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentsWithPhone.map((s) => s.id));
    }
  };

  const sendSMS = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "تنبيه", description: "اختر طالبًا واحدًا على الأقل", variant: "destructive" });
      return;
    }
    setSending(true);
    const log: typeof smsLog = [];

    for (const studentId of selectedStudents) {
      const student = students.find((s) => s.id === studentId);
      if (!student || !student.parent_phone) {
        log.push({ name: student?.full_name || "—", phone: "—", success: false, error: "لا يوجد رقم هاتف" });
        continue;
      }
      const message = customMessage.replace("{name}", student.full_name);
      try {
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { phone: student.parent_phone, message },
        });
        if (error) {
          log.push({ name: student.full_name, phone: student.parent_phone, success: false, error: error.message });
        } else if (data?.success) {
          log.push({ name: student.full_name, phone: student.parent_phone, success: true });
          await supabase.from("notifications").insert({
            student_id: studentId, type: smsType,
            message: `تم إرسال رسالة ${SMS_TYPE_LABELS[smsType]} لولي الأمر`,
            created_by: user?.id || null,
          });
        } else {
          log.push({ name: student.full_name, phone: student.parent_phone, success: false, error: data?.error || "فشل الإرسال" });
        }
      } catch (e: any) {
        log.push({ name: student.full_name, phone: student.parent_phone, success: false, error: e.message });
      }
    }

    setSmsLog(log);
    setSending(false);
    onNotificationSent?.();

    const successCount = log.filter((l) => l.success).length;
    const failCount = log.filter((l) => !l.success).length;
    toast({
      title: "نتيجة الإرسال",
      description: `تم إرسال ${successCount} رسالة بنجاح${failCount > 0 ? `، فشل ${failCount}` : ""}`,
      variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">إرسال رسالة لولي الأمر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">نوع الرسالة</Label>
              <Select value={smsType} onValueChange={(v) => setSmsType(v as SMSType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grades">
                    <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> تقييم الطالب</span>
                  </SelectItem>
                  <SelectItem value="absence">
                    <span className="flex items-center gap-2"><UserX className="h-4 w-4" /> غياب الطالب</span>
                  </SelectItem>
                  <SelectItem value="summon">
                    <span className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> استدعاء ولي الأمر</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفصل</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="h-10 px-4 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {selectedStudents.length} طالب محدد
              </Badge>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">نص الرسالة (استخدم {"{name}"} لاسم الطالب)</Label>
            <Textarea rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="resize-none" />
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              اختر الطلاب ({studentsWithPhone.length} لديهم رقم هاتف من أصل {students.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedStudents.length === studentsWithPhone.length ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={sendSMS}
                disabled={sending || selectedStudents.length === 0 || isReadOnly}>
                <Send className="h-4 w-4" />
                {sending ? "جارٍ الإرسال..." : `إرسال (${selectedStudents.length})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[350px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">رقم ولي الأمر</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const hasPhone = !!student.parent_phone;
                    return (
                      <TableRow key={student.id} className={!hasPhone ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}
                        onClick={() => hasPhone && toggleStudent(student.id)}>
                        <TableCell className="text-center">
                          <Checkbox checked={selectedStudents.includes(student.id)} disabled={!hasPhone}
                            onCheckedChange={() => hasPhone && toggleStudent(student.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell dir="ltr" className="text-right">{student.parent_phone || "—"}</TableCell>
                        <TableCell>
                          {hasPhone ? (
                            <Badge variant="default" className="text-xs">متاح</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">بدون رقم</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {smsLog.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">نتيجة الإرسال</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الطالب</TableHead>
                  <TableHead className="text-right">الرقم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {smsLog.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{log.name}</TableCell>
                    <TableCell dir="ltr" className="text-right">{log.phone}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge variant="default" className="text-xs">تم الإرسال</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">فشل</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.error || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
