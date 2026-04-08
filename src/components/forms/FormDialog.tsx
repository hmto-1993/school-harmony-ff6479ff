import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, MessageCircle, AlertTriangle, ShieldAlert, Search, X, Share2 } from "lucide-react";
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

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export default function FormDialog({ form, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [adminPhone, setAdminPhone] = useState("");
  const [sharing, setSharing] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("all");
  const [showStudentList, setShowStudentList] = useState(true);

  // Load students + admin phone
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: classesData } = await supabase.from("classes").select("id, name, grade, section");
      const classList = classesData || [];
      setClasses(classList);
      const classMap = new Map(classList.map((c) => [c.id, c]));

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

      if (form.adminAlertEnabled) {
        const { data: settings } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "admin_phone")
          .maybeSingle();
        if (settings?.value) setAdminPhone(settings.value);
      }
    })();
  }, [open, user, form.adminAlertEnabled]);

  // Reset state when form changes
  useEffect(() => {
    setSelectedStudentId("");
    setFieldValues({});
    setSelectedWitnesses([]);
    setSearchQuery("");
    setFilterClassId("all");
    setShowStudentList(true);
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

  // Sync witnesses to field values
  useEffect(() => {
    if (!form.witnessPickerEnabled) return;
    const witnessNames = selectedWitnesses
      .map((id) => students.find((s) => s.id === id)?.full_name)
      .filter(Boolean)
      .join("، ");
    setFieldValues((prev) => ({ ...prev, witnesses_names: witnessNames }));
  }, [selectedWitnesses, students, form.witnessPickerEnabled]);

  // Filtered students for the smart picker
  const filteredStudents = useMemo(() => {
    let result = students;
    if (filterClassId !== "all") {
      result = result.filter((s) => s.class_id === filterClassId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          (s.national_id && s.national_id.includes(q))
      );
    }
    return result;
  }, [students, filterClassId, searchQuery]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowStudentList(false);
    setSearchQuery("");
  };

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

    const message = form.whatsappTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || "............");

    let phone = student.parent_phone || "";
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("05")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("966")) phone = "966" + phone;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleAdminAlert = () => {
    if (!form.adminAlertTemplate || !selectedStudentId) {
      toast.error("يرجى اختيار الطالب أولاً");
      return;
    }

    const message = form.adminAlertTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || "............");

    let phone = adminPhone.replace(/\D/g, "");
    if (!phone) {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      return;
    }
    if (phone.startsWith("05")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("966")) phone = "966" + phone;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };
  const handleSharePdf = async () => {
    if (!selectedStudentId) {
      toast.error("يرجى اختيار الطالب أولاً");
      return;
    }
    setSharing(true);
    try {
      const student = students.find((s) => s.id === selectedStudentId)!;
      const { blob, fileName } = await exportFormPdf(form, fieldValues, student, { returnBlob: true });
      if (!blob) throw new Error("Failed to generate PDF");

      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل الملف — يمكنك مشاركته يدوياً عبر واتساب");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error(err);
        toast.error("فشل مشاركة الملف");
      }
    } finally {
      setSharing(false);
    }
  };


    () => students.filter((s) => s.id !== selectedStudentId),
    [students, selectedStudentId]
  );

  const toggleWitness = (studentId: string) => {
    setSelectedWitnesses((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
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

  const bodyPreview = form.bodyTemplate
    ? form.bodyTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || `{${key}}`)
    : null;

  const isConfidential = form.confidentialWatermark;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg max-h-[90vh] flex flex-col ${isConfidential ? "border-destructive/30" : ""}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{form.icon}</span>
            {form.title}
            {isConfidential && (
              <Badge variant="destructive" className="text-[10px] mr-auto">
                <ShieldAlert className="h-3 w-3 ml-1" />
                سري
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Smart Student Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">اختيار الطالب</Label>

              {selectedStudent && !showStudentList ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedStudent.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedStudent.className} — {selectedStudent.national_id || "بدون هوية"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => { setShowStudentList(true); setSearchQuery(""); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Class filter + Search */}
                  <div className="flex gap-2">
                    <Select value={filterClassId} onValueChange={setFilterClassId}>
                      <SelectTrigger className="w-[130px] shrink-0 text-xs h-9">
                        <SelectValue placeholder="كل الفصول" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الفصول</SelectItem>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم أو الهوية..."
                        className="pr-8 h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Student list */}
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        {searchQuery ? "لا توجد نتائج" : "لا يوجد طلاب"}
                      </p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-accent/50 active:bg-accent transition-colors border-b border-border/50 last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {s.national_id || "—"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                            {s.className || "بدون فصل"}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {filteredStudents.length} طالب
                  </p>
                </div>
              )}
            </div>

            {/* Witness picker */}
            {form.witnessPickerEnabled && selectedStudentId && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  👥 اختيار الشهود
                  {selectedWitnesses.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{selectedWitnesses.length}</Badge>
                  )}
                </Label>
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {witnessOptions.slice(0, 50).map((s) => {
                    const isSelected = selectedWitnesses.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleWitness(s.id)}
                        className={`w-full text-right text-xs px-2 py-1.5 rounded transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {s.full_name} — {s.className}
                        {isSelected && " ✓"}
                      </button>
                    );
                  })}
                </div>
                {selectedWitnesses.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    الشهود المختارون: {selectedWitnesses.map((id) => students.find((s) => s.id === id)?.full_name).join("، ")}
                  </p>
                )}
              </div>
            )}

            {/* Form fields */}
            {form.fields.filter((f) => f.type !== "auto" && !f.hidden).map(renderField)}

            {/* Body preview */}
            {bodyPreview && selectedStudentId && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">معاينة النموذج</Label>
                <div className={`rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground ${
                  isConfidential ? "bg-destructive/5 border-destructive/20" : "bg-muted/50"
                }`}>
                  {bodyPreview}
                </div>
              </div>
            )}

            {/* Auto-filled fields */}
            {selectedStudentId && (
              <div className="grid grid-cols-2 gap-2">
                {form.fields.filter((f) => f.type === "auto").map((f) => (
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

          {form.adminAlertEnabled && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleAdminAlert}
              disabled={!selectedStudentId}
              className="gap-1"
            >
              <AlertTriangle className="h-4 w-4" />
              بلاغ عاجل
            </Button>
          )}

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