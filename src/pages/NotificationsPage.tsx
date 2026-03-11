import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, MessageSquare, Send, Users, GraduationCap, UserX, Megaphone, FileImage, Check, X as XIcon, Clock } from "lucide-react";
import AnnouncementsTab from "@/components/announcements/AnnouncementsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignedUrl } from "@/hooks/use-signed-url";

function ExcuseFileLink({ fileUrl, label }: { fileUrl: string; label: string }) {
  const signed = useSignedUrl("school-assets", fileUrl);
  return (
    <a href={signed || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
      <FileImage className="h-3 w-3" />
      {label}
    </a>
  );
}

function ExcuseImage({ fileUrl }: { fileUrl: string }) {
  const signed = useSignedUrl("school-assets", fileUrl);
  return (
    <a href={signed || "#"} target="_blank" rel="noopener noreferrer">
      <img src={signed || ""} alt="ملف العذر" className="w-full max-h-[300px] object-contain bg-muted" />
    </a>
  );
}

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  status?: string;
  students: { full_name: string } | null;
}

interface ExcuseSubmission {
  id: string;
  notification_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  reason: string;
  status: string;
  review_note: string;
  created_at: string;
  students?: { full_name: string; class_id: string | null; classes?: { name: string } | null } | null;
  notifications?: { message: string; created_at: string } | null;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  students: { full_name: string } | null;
}

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
  grades: "ولي أمر الطالب {name}، نود إبلاغكم بأن تقييم ابنكم/ابنتكم متاح الآن. يرجى متابعة المستوى الدراسي. ثانوية الفيصلية",
  absence: "ولي أمر الطالب {name}، نود إبلاغكم بتغيب ابنكم/ابنتكم عن المدرسة اليوم. يرجى التواصل مع الإدارة. ثانوية الفيصلية",
  summon: "ولي أمر الطالب {name}، نرجو حضوركم إلى المدرسة في أقرب وقت ممكن لمناقشة أمر يخص ابنكم/ابنتكم. ثانوية الفيصلية",
};

const SMS_TYPE_LABELS: Record<SMSType, string> = {
  grades: "تقييم الطالب",
  absence: "غياب الطالب",
  summon: "استدعاء ولي الأمر",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // SMS state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<StudentWithPhone[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [smsType, setSmsType] = useState<SMSType>("grades");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [smsLog, setSmsLog] = useState<{ name: string; phone: string; success: boolean; error?: string }[]>([]);
  // Excuse review state
  const [excuses, setExcuses] = useState<ExcuseSubmission[]>([]);
  const [reviewingExcuse, setReviewingExcuse] = useState<ExcuseSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);


  useEffect(() => {
    fetchNotifications();
    fetchClasses();
    fetchExcuses();
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, message, is_read, created_at, students(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications((data as Notification[]) || []);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  // Fetch excuses for review
  const fetchExcuses = async () => {
    const { data } = await supabase
      .from("excuse_submissions")
      .select("*, students(full_name, class_id, classes(name)), notifications(message, created_at)")
      .order("created_at", { ascending: false });
    setExcuses((data as ExcuseSubmission[]) || []);
  };

  // Handle excuse review (accept/reject)
  const handleReviewExcuse = async (action: "accepted" | "rejected") => {
    if (!reviewingExcuse) return;
    setReviewLoading(true);
    try {
      // Update excuse status
      await supabase.from("excuse_submissions").update({
        status: action,
        review_note: reviewNote,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", reviewingExcuse.id);

      // Update notification status
      await supabase.from("notifications").update({
        status: action === "accepted" ? "excuse_accepted" : "excuse_rejected",
      }).eq("id", reviewingExcuse.notification_id);

      // If accepted, remove absence record
      if (action === "accepted") {
        // Get the date from the notification message or find the latest absence
        const { data: absences } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("student_id", reviewingExcuse.student_id)
          .eq("status", "absent")
          .order("date", { ascending: false })
          .limit(1);
        if (absences && absences.length > 0) {
          await supabase.from("attendance_records").update({ status: "sick_leave" }).eq("id", absences[0].id);
        }
      }

      toast({ title: action === "accepted" ? "تم القبول" : "تم الرفض", description: action === "accepted" ? "تم قبول العذر وتحديث سجل الحضور" : "تم رفض العذر" });
      fetchExcuses();
      setReviewingExcuse(null);
      setReviewNote("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setReviewLoading(false);
  };


  // Fetch classes
  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, name").order("name");
    setClasses(data || []);
  };

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedStudents([]);
      return;
    }
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, parent_phone, class_id, classes(name)")
        .eq("class_id", selectedClass)
        .order("full_name");
      setStudents((data as StudentWithPhone[]) || []);
      setSelectedStudents([]);
    };
    fetchStudents();
  }, [selectedClass]);

  // Update message template when type changes
  useEffect(() => {
    setCustomMessage(SMS_TEMPLATES[smsType]);
  }, [smsType]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const withPhone = students.filter((s) => s.parent_phone);
    if (selectedStudents.length === withPhone.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(withPhone.map((s) => s.id));
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
          // Save notification record
          await supabase.from("notifications").insert({
            student_id: studentId,
            type: smsType,
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
    fetchNotifications();

    const successCount = log.filter((l) => l.success).length;
    const failCount = log.filter((l) => !l.success).length;
    toast({
      title: "نتيجة الإرسال",
      description: `تم إرسال ${successCount} رسالة بنجاح${failCount > 0 ? `، فشل ${failCount}` : ""}`,
      variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
    });
  };

  const studentsWithPhone = students.filter((s) => s.parent_phone);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground">إشعارات النظام وإرسال رسائل SMS لأولياء الأمور</p>
      </div>

      <Tabs defaultValue="announcements" dir="rtl">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            الإعلانات العامة
          </TabsTrigger>
          <TabsTrigger value="excuses" className="gap-1.5 relative">
            <FileImage className="h-4 w-4" />
            مراجعة الأعذار
            {excuses.filter(e => e.status === "pending").length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -left-1 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px]">
                {excuses.filter(e => e.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="send-sms" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            إرسال رسالة SMS
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Bell className="h-4 w-4" />
            سجل الإشعارات
          </TabsTrigger>
        </TabsList>

        {/* ===== Announcements ===== */}
        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>

        {/* ===== Excuses Review ===== */}
        <TabsContent value="excuses" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                أعذار الغياب المقدمة من الطلاب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {excuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileImage className="h-12 w-12 mb-3 opacity-30" />
                  <p>لا توجد أعذار مقدمة</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">الفصل</TableHead>
                        <TableHead className="text-right">سبب العذر</TableHead>
                        <TableHead className="text-right">الملف</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-center">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excuses.map((excuse) => (
                        <TableRow key={excuse.id} className={excuse.status === "pending" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                          <TableCell className="font-medium">{excuse.students?.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{excuse.students?.classes?.name || "—"}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{excuse.reason || "—"}</TableCell>
                          <TableCell>
                            <ExcuseFileLink fileUrl={excuse.file_url} label="عرض" />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(excuse.created_at).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              excuse.status === "pending" ? "secondary" :
                              excuse.status === "accepted" ? "default" : "destructive"
                            } className="text-xs">
                              {excuse.status === "pending" && <Clock className="h-3 w-3 ml-1" />}
                              {excuse.status === "accepted" && <Check className="h-3 w-3 ml-1" />}
                              {excuse.status === "rejected" && <XIcon className="h-3 w-3 ml-1" />}
                              {excuse.status === "pending" ? "قيد المراجعة" :
                               excuse.status === "accepted" ? "مقبول" : "مرفوض"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {excuse.status === "pending" ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                                  onClick={() => { setReviewingExcuse(excuse); setReviewNote(""); }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Send SMS ===== */}
        <TabsContent value="send-sms" className="space-y-4">
          {/* Type & Class Selection */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">إرسال رسالة لولي الأمر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الرسالة</Label>
                  <Select value={smsType} onValueChange={(v) => setSmsType(v as SMSType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grades">
                        <span className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" /> تقييم الطالب
                        </span>
                      </SelectItem>
                      <SelectItem value="absence">
                        <span className="flex items-center gap-2">
                          <UserX className="h-4 w-4" /> غياب الطالب
                        </span>
                      </SelectItem>
                      <SelectItem value="summon">
                        <span className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" /> استدعاء ولي الأمر
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                   <Label className="text-xs">الفصل</Label>
                   <Select value={selectedClass} onValueChange={setSelectedClass}>
                     <SelectTrigger>
                       <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
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

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs">نص الرسالة (استخدم {"{name}"} لاسم الطالب)</Label>
                <Textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Student Selection */}
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
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={sendSMS}
                    disabled={sending || selectedStudents.length === 0}
                  >
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
                          <TableRow
                            key={student.id}
                            className={!hasPhone ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}
                            onClick={() => hasPhone && toggleStudent(student.id)}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                disabled={!hasPhone}
                                onCheckedChange={() => hasPhone && toggleStudent(student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell dir="ltr" className="text-right">
                              {student.parent_phone || "—"}
                            </TableCell>
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

          {/* SMS Log */}
          {smsLog.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">نتيجة الإرسال</CardTitle>
              </CardHeader>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {log.error || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== History ===== */}
        <TabsContent value="history">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-3 opacity-30" />
                  <p>لا توجد إشعارات</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`shadow-card transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          n.type === "absent"
                            ? "bg-destructive/10 text-destructive"
                            : n.type === "summon"
                            ? "bg-orange-100 text-orange-600"
                            : n.type === "grades"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {n.type === "summon" ? (
                          <Megaphone className="h-4 w-4" />
                        ) : n.type === "grades" ? (
                          <GraduationCap className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{n.students?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleDateString("ar-SA")} -{" "}
                          {new Date(n.created_at).toLocaleTimeString("ar-SA")}
                        </p>
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* ===== Excuse Review Dialog ===== */}
      <Dialog open={!!reviewingExcuse} onOpenChange={(open) => { if (!open) setReviewingExcuse(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              مراجعة العذر
            </DialogTitle>
          </DialogHeader>
          {reviewingExcuse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">الطالب:</span>
                  <p className="font-medium">{reviewingExcuse.students?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الفصل:</span>
                  <p className="font-medium">{reviewingExcuse.students?.classes?.name}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">سبب العذر:</span>
                <p className="text-sm mt-1">{reviewingExcuse.reason || "لم يُذكر سبب"}</p>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <ExcuseImage fileUrl={reviewingExcuse.file_url} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ملاحظة المعلم (اختياري)</Label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="مثال: العذر مقبول، تم تحديث سجل الحضور"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setReviewingExcuse(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewExcuse("rejected")}
              disabled={reviewLoading}
              className="gap-1.5"
            >
              <XIcon className="h-4 w-4" />
              رفض العذر
            </Button>
            <Button
              onClick={() => handleReviewExcuse("accepted")}
              disabled={reviewLoading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="h-4 w-4" />
              قبول العذر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
