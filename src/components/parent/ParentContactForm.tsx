import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Send, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ParentContactFormProps {
  studentId: string;
  studentName: string;
  classId: string | null;
}

export default function ParentContactForm({ studentId, studentName, classId }: ParentContactFormProps) {
  const [messageType, setMessageType] = useState<"message" | "appointment">("message");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim() || !parentName.trim()) {
      toast({ title: "تنبيه", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSending(true);

    // Get session info from sessionStorage
    const raw = sessionStorage.getItem("student_session");
    const session = raw ? JSON.parse(raw) : {};

    const { data, error } = await supabase.functions.invoke("submit-parent-message", {
      body: {
        student_id: studentId,
        class_id: classId,
        message_type: messageType,
        subject: subject.trim(),
        body: body.trim(),
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        session_token: session.session_token,
        session_issued_at: session.session_issued_at,
      },
    });

    setSending(false);
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل إرسال الرسالة، يرجى المحاولة مرة أخرى", variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "تم الإرسال ✓", description: "تم إرسال رسالتك للمعلم بنجاح" });
      setSubject("");
      setBody("");
      setParentName("");
      setParentPhone("");
    }
  };

  if (sent) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 overflow-hidden">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-foreground">تم إرسال رسالتك بنجاح</h3>
          <p className="text-sm text-muted-foreground">سيقوم المعلم بالاطلاع على رسالتك والرد عليها في أقرب وقت</p>
          <Button
            variant="outline"
            onClick={() => setSent(false)}
            className="gap-2 rounded-xl"
          >
            <MessageCircle className="h-4 w-4" />
            إرسال رسالة أخرى
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <MessageCircle className="h-4.5 w-4.5 text-white" />
          </div>
          تواصل مع المعلم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">نوع الطلب</Label>
          <Select value={messageType} onValueChange={(v) => setMessageType(v as "message" | "appointment")}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  رسالة للمعلم
                </span>
              </SelectItem>
              <SelectItem value="appointment">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-purple-500" />
                  طلب موعد
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Parent Name */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">اسم ولي الأمر <span className="text-destructive">*</span></Label>
          <Input
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="الاسم الكامل"
            className="rounded-xl"
            maxLength={100}
          />
        </div>

        {/* Parent Phone */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">رقم الجوال (اختياري)</Label>
          <Input
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            placeholder="05xxxxxxxx"
            className="rounded-xl"
            dir="ltr"
            maxLength={15}
          />
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            {messageType === "appointment" ? "سبب الموعد" : "الموضوع"} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={messageType === "appointment" ? "مناقشة مستوى الطالب الدراسي..." : "استفسار عن درجات الطالب..."}
            className="rounded-xl"
            maxLength={200}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            {messageType === "appointment" ? "تفاصيل إضافية" : "نص الرسالة"} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={messageType === "appointment" ? "الأوقات المناسبة والموضوع المراد مناقشته..." : "اكتب رسالتك هنا..."}
            className="rounded-xl min-h-[100px] resize-none"
            maxLength={1000}
          />
          <p className="text-[11px] text-muted-foreground text-left" dir="ltr">{body.length}/1000</p>
        </div>

        {/* Info badge */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {studentName}
          </Badge>
          <p className="text-[11px] text-muted-foreground">سيتم إرسال الرسالة باسم الطالب المسجل</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={sending || !subject.trim() || !body.trim() || !parentName.trim()}
          className={cn(
            "w-full h-12 text-base font-bold rounded-xl gap-2 shadow-lg",
            messageType === "appointment"
              ? "bg-gradient-to-l from-purple-600 to-indigo-600 hover:opacity-90 shadow-purple-500/20"
              : "bg-gradient-to-l from-blue-600 to-indigo-600 hover:opacity-90 shadow-blue-500/20"
          )}
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {sending ? "جارٍ الإرسال..." : messageType === "appointment" ? "إرسال طلب الموعد" : "إرسال الرسالة"}
        </Button>
      </CardContent>
    </Card>
  );
}
