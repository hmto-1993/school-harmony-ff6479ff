import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { MessageCircle, Send, Pencil, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TemplateType = "absence" | "full_mark" | "honor_roll" | "custom";

interface TemplateData {
  student_name: string;
  absence_count?: number;
  last_date?: string;
  teacher_name?: string;
  test_name?: string;
}

interface WhatsAppMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  parentPhone: string | null;
  templateType?: TemplateType;
  templateData?: TemplateData;
}

const DEFAULT_TEMPLATES: Record<Exclude<TemplateType, "custom">, string> = {
  absence:
    "المكرم ولي أمر الطالب: {student_name}.. نفيدكم بأن ابننا غاب {absence_count} أيام، آخرها {last_date}. نأمل حثه على الانضباط لتفادي الحرمان. معلم المادة: {teacher_name}.",
  full_mark:
    "المكرم ولي أمر الطالب: {student_name}.. يسعدني إبلاغكم بحصول ابننا على (الدرجة الكاملة) في اختبار الفيزياء 1. نفخر بتفوقه المستمر! المعلم: {teacher_name}.",
  honor_roll:
    "بشرى سارة لولي أمر الطالب: {student_name}.. نبارك لكم دخول ابنكم (لوحة الشرف) لهذا الشهر لتحقيقه العلامة الكاملة مع انضباط تام بنسبة حضور 100%. المعلم: {teacher_name}.",
};

const TEMPLATE_LABELS: Record<Exclude<TemplateType, "custom">, string> = {
  absence: "إنذار غياب",
  full_mark: "درجة كاملة",
  honor_roll: "لوحة الشرف",
};

export default function WhatsAppMessageDialog({
  open,
  onOpenChange,
  studentName,
  parentPhone,
  templateType = "absence",
  templateData,
}: WhatsAppMessageDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(templateType);
  const [templates, setTemplates] = useState<Record<string, string>>(DEFAULT_TEMPLATES);
  const [message, setMessage] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch templates from site_settings
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["whatsapp_template_absence", "whatsapp_template_full_mark", "whatsapp_template_honor_roll"]);

      if (data) {
        const loaded: Record<string, string> = { ...DEFAULT_TEMPLATES };
        data.forEach((s) => {
          const key = s.id.replace("whatsapp_template_", "");
          if (s.value) loaded[key] = s.value;
        });
        setTemplates(loaded);
      }
    };

    // Fetch teacher name from profile
    const fetchTeacher = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile?.full_name) setTeacherName(profile.full_name);
      }
    };

    if (open) {
      fetchTemplates();
      fetchTeacher();
    }
  }, [open]);

  // Apply template with variable replacement
  useEffect(() => {
    if (selectedTemplate === "custom") {
      setMessage("");
      return;
    }

    let text = templates[selectedTemplate] || DEFAULT_TEMPLATES[selectedTemplate];
    const data: TemplateData = {
      student_name: studentName,
      teacher_name: teacherName || templateData?.teacher_name || "المعلم",
      absence_count: templateData?.absence_count || 0,
      last_date: templateData?.last_date || new Date().toLocaleDateString("ar-SA"),
      test_name: templateData?.test_name || "اختبار الفيزياء 1",
    };

    text = text
      .replace(/{student_name}/g, data.student_name)
      .replace(/{teacher_name}/g, data.teacher_name || "")
      .replace(/{absence_count}/g, String(data.absence_count || 0))
      .replace(/{last_date}/g, data.last_date || "")
      .replace(/{test_name}/g, data.test_name || "");

    setMessage(text);
  }, [selectedTemplate, templates, studentName, teacherName, templateData]);

  const handleSend = () => {
    if (!parentPhone) {
      toast({
        title: "لا يوجد رقم جوال",
        description: "يرجى إضافة رقم جوال ولي الأمر أولاً",
        variant: "destructive",
      });
      return;
    }

    // Clean phone number
    let phone = parentPhone.replace(/\s+/g, "").replace(/-/g, "");
    if (phone.startsWith("0")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("+") && !phone.startsWith("966")) phone = "966" + phone;

    // Encode message for URL
    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

    window.open(waUrl, "_blank");
    onOpenChange(false);
    toast({ title: "تم فتح واتساب", description: "سيتم فتح المحادثة مع ولي الأمر" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            إرسال رسالة واتساب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold">{studentName}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {parentPhone || "لا يوجد رقم"}
              </div>
            </div>
            {parentPhone && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                متاح للإرسال
              </Badge>
            )}
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>نوع الرسالة</Label>
            <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as TemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="absence">🔴 إنذار غياب</SelectItem>
                <SelectItem value="full_mark">⭐ درجة كاملة</SelectItem>
                <SelectItem value="honor_roll">🏆 لوحة الشرف</SelectItem>
                <SelectItem value="custom">✏️ رسالة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Preview / Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>نص الرسالة</Label>
              <Badge variant="outline" className="gap-1 text-xs">
                <Pencil className="h-3 w-3" />
                يمكنك التعديل
              </Badge>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none text-sm leading-relaxed"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>

          {/* Variable hints */}
          {selectedTemplate !== "custom" && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              💡 المتغيرات المتاحة: <code className="text-primary">{"{student_name}"}</code>,{" "}
              <code className="text-primary">{"{teacher_name}"}</code>,{" "}
              <code className="text-primary">{"{absence_count}"}</code>,{" "}
              <code className="text-primary">{"{last_date}"}</code>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !parentPhone}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4" />
            إرسال عبر واتساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
