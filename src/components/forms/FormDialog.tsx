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
import { Download, Loader2 } from "lucide-react";
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
        .select("id, full_name, national_id, class_id")
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

  const renderField = (field: FormField) => {
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

            {/* Form fields */}
            {form.fields.map(renderField)}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleExport} disabled={exporting || !selectedStudentId}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
            تصدير PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
