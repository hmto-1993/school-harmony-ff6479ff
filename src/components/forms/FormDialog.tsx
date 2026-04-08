import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FormTemplate, FormField } from "./form-templates";
import { exportFormPdf } from "./form-pdf-export";
import { toast } from "sonner";

interface Props {
  form: FormTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentOption {
  id: string;
  full_name: string;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  className: string;
  grade: string;
  section: string;
}

export default function FormDialog({ form, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  // Load students
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: classes } = await supabase.from("classes").select("id, name, grade, section");
      const classMap = new Map((classes || []).map((c) => [c.id, c]));

      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, national_id, class_id, parent_phone")
        .order("full_name");

      const mapped: StudentOption[] = (studs || []).map((s) => {
        const cls = s.class_id ? classMap.get(s.class_id) : null;
        return {
          ...s,
          className: cls ? cls.name : "",
          grade: cls ? cls.grade : "",
          section: cls ? cls.section : "",
        };
      });
      setStudents(mapped);
    })();
  }, [open, user]);

  // Reset state when form changes
  useEffect(() => {
    setSelectedStudentId("");
    setFieldValues({});
  }, [form.id]);

  // Auto-fill when student changes
  useEffect(() => {
    if (!selectedStudentId) return;
    const s = students.find((st) => st.id === selectedStudentId);
    if (!s) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

    setFieldValues((prev) => ({
      ...prev,
      student_name: s.full_name,
      class_name: `${s.className} - ${s.grade} (${s.section})`,
      national_id: s.national_id || "",
      date: dateStr,
    }));
  }, [selectedStudentId, students]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleExport = async () => {
    if (!selectedStudentId) {
      toast.error("يرجى اختيار الطالب أولاً");
      return;
    }
    setExporting(true);
    try {
      const student = students.find((s) => s.id === selectedStudentId)!;
      await exportFormPdf(form, fieldValues, student);
      toast.success("تم تصدير النموذج بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تصدير النموذج");
    } finally {
      setExporting(false);
    }
  };

  const handleWhatsApp = () => {
    if (!form.whatsappTemplate || !selectedStudentId) {
      toast.error("يرجى اختيار الطالب أولاً");
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    // Fill template with values
    let message = form.whatsappTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || "............");

    // Build WhatsApp URL
    let phone = student.parent_phone || "";
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("05")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("966")) phone = "966" + phone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const renderField = (field: FormField) => {
    if (field.hidden) return null;
    const value = fieldValues[field.id] || "";
    const isAuto = field.type === "auto";

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-1">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[80px] text-sm"
          />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1">
        <Label className="text-xs font-medium">{field.label}</Label>
        <Input
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          readOnly={isAuto}
          className={isAuto ? "bg-muted" : ""}
          type={field.type === "date" ? "date" : "text"}
        />
      </div>
    );
  };

  // Show body preview if template exists
  const bodyPreview = form.bodyTemplate
    ? form.bodyTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || `{${key}}`)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{form.icon}</span>
            {form.title}
          </DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Student selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">اختيار الطالب</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الطالب..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} — {s.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form fields (non-hidden) */}
            {form.fields.filter(f => f.type !== "auto").map(renderField)}

            {/* Body preview */}
            {bodyPreview && selectedStudentId && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">معاينة النموذج</Label>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {bodyPreview}
                </div>
              </div>
            )}

            {/* Auto-filled fields display */}
            {selectedStudentId && (
              <div className="grid grid-cols-2 gap-2">
                {form.fields.filter(f => f.type === "auto").map(f => (
                  <div key={f.id} className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <div className="text-xs font-medium bg-muted rounded px-2 py-1.5 truncate">
                      {fieldValues[f.id] || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>

          {form.whatsappEnabled && (
            <Button
              variant="outline"
              className="text-success border-success/30 hover:bg-success/10"
              onClick={handleWhatsApp}
              disabled={!selectedStudentId}
            >
              <MessageCircle className="h-4 w-4 ml-2" />
              إرسال عبر واتساب
            </Button>
          )}

          <Button onClick={handleExport} disabled={exporting || !selectedStudentId}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
            تصدير PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
