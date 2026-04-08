import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Download, Loader2, MessageCircle, AlertTriangle, ShieldAlert, Search, X, Share2,
  RotateCcw, FileStack, FileMerge, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FormTemplate, FormField } from "./form-templates";
import ComboboxField from "./ComboboxField";
import { exportFormPdf } from "./form-pdf-export";
import SignatureCanvas from "./SignatureCanvas";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerArabicFont } from "@/lib/arabic-pdf";
import { cn } from "@/lib/utils";

interface Props {
  form: FormTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudentIds?: string[];
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

export default function FormDialog({ form, open, onOpenChange, preSelectedStudentIds }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [adminPhone, setAdminPhone] = useState("");
  const [sharing, setSharing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [useLiveSignature, setUseLiveSignature] = useState(true);
  const [customBodyText, setCustomBodyText] = useState<string | null>(null);
  const [isEditingBody, setIsEditingBody] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("all");
  const [showStudentList, setShowStudentList] = useState(true);

  // Bulk export state
  const [bulkExporting, setBulkExporting] = useState(false);

  const isMultiMode = (preSelectedStudentIds?.length ?? 0) > 0;

  // Load students + admin phone
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: sigSetting } = await supabase
        .from("site_settings").select("value").eq("id", "form_identity_live_sig").maybeSingle();
      if (sigSetting) setUseLiveSignature(sigSetting.value === "true");

      const { data: classesData } = await supabase.from("classes").select("id, name, grade, section");
      const classList = classesData || [];
      setClasses(classList);
      const classMap = new Map(classList.map(c => [c.id, c]));

      const { data: studs } = await supabase
        .from("students").select("id, full_name, national_id, class_id, parent_phone").order("full_name");
      const mapped: StudentOption[] = (studs || []).map(s => {
        const cls = s.class_id ? classMap.get(s.class_id) : null;
        return { ...s, className: cls ? cls.name : "", grade: cls ? cls.grade : "", section: cls ? cls.section : "" };
      });
      setStudents(mapped);

      if (form.adminAlertEnabled) {
        const { data: settings } = await supabase.from("site_settings").select("value").eq("id", "admin_phone").maybeSingle();
        if (settings?.value) setAdminPhone(settings.value);
      }

      // Auto-select first pre-selected student for single-form mode
      if (preSelectedStudentIds && preSelectedStudentIds.length === 1) {
        setSelectedStudentId(preSelectedStudentIds[0]);
        setShowStudentList(false);
      }
    })();
  }, [open, user, form.adminAlertEnabled, preSelectedStudentIds]);

  // Reset state when form changes
  useEffect(() => {
    setSelectedStudentId(preSelectedStudentIds?.length === 1 ? preSelectedStudentIds[0] : "");
    setFieldValues({});
    setSelectedWitnesses([]);
    setSearchQuery("");
    setFilterClassId("all");
    setShowStudentList(!(preSelectedStudentIds?.length === 1));
    setSignatureDataUrl(null);
    setCustomBodyText(null);
    setIsEditingBody(false);
  }, [form.id, preSelectedStudentIds]);

  // Auto-fill when student changes
  useEffect(() => {
    if (!selectedStudentId) return;
    const s = students.find(st => st.id === selectedStudentId);
    if (!s) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    setFieldValues(prev => ({
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
      .map(id => students.find(s => s.id === id)?.full_name).filter(Boolean).join("، ");
    setFieldValues(prev => ({ ...prev, witnesses_names: witnessNames }));
  }, [selectedWitnesses, students, form.witnessPickerEnabled]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (filterClassId !== "all") result = result.filter(s => s.class_id === filterClassId);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q) || (s.national_id && s.national_id.includes(q)));
    }
    return result;
  }, [students, filterClassId, searchQuery]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowStudentList(false);
    setSearchQuery("");
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const archiveForm = useCallback(async (studentId: string, values: Record<string, string>) => {
    if (!user) return;
    try {
      const archiveValues = { ...values, ...(customBodyText !== null ? { _custom_body_text: customBodyText } : {}) };
      await supabase.from("form_issued_logs").insert({
        form_id: form.id, form_title: form.title, student_id: studentId,
        student_name: values.student_name || "", class_name: values.class_name || "",
        field_values: archiveValues as any, issued_by: user.id,
      });
    } catch (err) { console.error("Archive error:", err); }
  }, [user, form, customBodyText]);

  // ===== Single student export =====
  const handleExport = async () => {
    if (!selectedStudentId) { toast.error("يرجى اختيار الطالب أولاً"); return; }
    setExporting(true);
    try {
      const student = students.find(s => s.id === selectedStudentId)!;
      await exportFormPdf(form, fieldValues, student, { signatureDataUrl, customBodyText });
      await archiveForm(selectedStudentId, fieldValues);
      toast.success("تم تصدير النموذج بنجاح");
    } catch (err) { console.error(err); toast.error("فشل تصدير النموذج"); }
    finally { setExporting(false); }
  };

  // ===== Bulk export: separate PDFs =====
  const handleBulkSeparate = async () => {
    if (!preSelectedStudentIds || preSelectedStudentIds.length === 0) return;
    setBulkExporting(true);
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      let exported = 0;

      for (const sId of preSelectedStudentIds) {
        const s = students.find(st => st.id === sId);
        if (!s) continue;

        const values: Record<string, string> = {
          ...fieldValues,
          student_name: s.full_name,
          class_name: `${s.className} - ${s.grade} (${s.section})`,
          national_id: s.national_id || "",
          date: dateStr,
        };

        const { blob, fileName } = await exportFormPdf(form, values, s, { returnBlob: true, signatureDataUrl, customBodyText });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 3000);
        }
        await archiveForm(sId, values);
        exported++;
      }
      toast.success(`تم تصدير ${exported} ملف PDF منفصل`);
    } catch (err) { console.error(err); toast.error("فشل التصدير الجماعي"); }
    finally { setBulkExporting(false); }
  };

  // ===== Bulk export: merged report =====
  const handleBulkMerged = async () => {
    if (!preSelectedStudentIds || preSelectedStudentIds.length === 0) return;
    setBulkExporting(true);
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      const selectedStudents = preSelectedStudentIds
        .map(id => students.find(s => s.id === id))
        .filter(Boolean) as StudentOption[];

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await registerArabicFont(doc);
      doc.setFont("Amiri");
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(16); doc.setFont("Amiri", "bold"); doc.setTextColor(0, 102, 153);
      doc.text(form.title, pageW / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10); doc.setFont("Amiri", "normal"); doc.setTextColor(100, 100, 100);
      doc.text(`التاريخ: ${dateStr} — عدد الطلاب: ${selectedStudents.length}`, pageW / 2, y, { align: "center" });
      y += 12;

      // Table
      const tableBody = selectedStudents.map((s, i) => [
        s.national_id || "—",
        s.className,
        s.full_name,
        String(i + 1),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["الهوية", "الفصل", "اسم الطالب", "#"]],
        body: tableBody,
        theme: "grid",
        styles: { font: "Amiri", fontSize: 10, halign: "right", cellPadding: 3 },
        headStyles: { fillColor: [0, 102, 153], textColor: [255, 255, 255], halign: "center", fontStyle: "bold" },
        columnStyles: { 3: { halign: "center", cellWidth: 12 } },
        margin: { right: 15, left: 15 },
      });

      // Archive each
      for (const s of selectedStudents) {
        const values = {
          student_name: s.full_name,
          class_name: `${s.className} - ${s.grade} (${s.section})`,
          national_id: s.national_id || "",
          date: dateStr,
          _bulk_merged: "true",
        };
        await archiveForm(s.id, values);
      }

      const fileName = `${form.title} - تقرير مدمج (${selectedStudents.length} طالب).pdf`;
      const blob = doc.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل التقرير المدمج");
      }
    } catch (err) { console.error(err); toast.error("فشل إنشاء التقرير المدمج"); }
    finally { setBulkExporting(false); }
  };

  const handleWhatsApp = () => {
    if (!form.whatsappTemplate || !selectedStudentId) { toast.error("يرجى اختيار الطالب أولاً"); return; }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    const message = form.whatsappTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || "............");
    let phone = student.parent_phone || "";
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("05")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("966")) phone = "966" + phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleAdminAlert = () => {
    if (!form.adminAlertTemplate || !selectedStudentId) { toast.error("يرجى اختيار الطالب أولاً"); return; }
    const message = form.adminAlertTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || "............");
    let phone = adminPhone.replace(/\D/g, "");
    if (!phone) { window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank"); return; }
    if (phone.startsWith("05")) phone = "966" + phone.slice(1);
    if (!phone.startsWith("966")) phone = "966" + phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSharePdf = async () => {
    if (!selectedStudentId) { toast.error("يرجى اختيار الطالب أولاً"); return; }
    setSharing(true);
    try {
      const student = students.find(s => s.id === selectedStudentId)!;
      const { blob, fileName } = await exportFormPdf(form, fieldValues, student, { returnBlob: true, signatureDataUrl, customBodyText });
      if (!blob) throw new Error("Failed to generate PDF");
      await archiveForm(selectedStudentId, fieldValues);
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل الملف — يمكنك مشاركته يدوياً عبر واتساب");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") { console.error(err); toast.error("فشل مشاركة الملف"); }
    } finally { setSharing(false); }
  };

  const witnessOptions = useMemo(() => students.filter(s => s.id !== selectedStudentId), [students, selectedStudentId]);

  const toggleWitness = (studentId: string) => {
    setSelectedWitnesses(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const renderField = (field: FormField) => {
    if (field.hidden) return null;
    const value = fieldValues[field.id] || "";
    if (field.type === "combobox" && field.suggestions) {
      return <ComboboxField key={field.id} label={field.label} value={value} onChange={v => handleFieldChange(field.id, v)} suggestions={field.suggestions} placeholder={field.placeholder} />;
    }
    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-1">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Textarea value={value} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder} className="min-h-[80px] text-sm" />
        </div>
      );
    }
    const isAuto = field.type === "auto";
    return (
      <div key={field.id} className="space-y-1">
        <Label className="text-xs font-medium">{field.label}</Label>
        <Input value={value} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder} readOnly={isAuto} className={isAuto ? "bg-muted" : ""} type={field.type === "date" ? "date" : "text"} />
      </div>
    );
  };

  const defaultBodyText = form.bodyTemplate
    ? form.bodyTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || `{${key}}`)
    : null;
  const finalBodyText = customBodyText !== null ? customBodyText : defaultBodyText;
  const isBodyEdited = customBodyText !== null;
  const isConfidential = form.confidentialWatermark;

  // Multi-select students info
  const multiStudents = isMultiMode
    ? preSelectedStudentIds!.map(id => students.find(s => s.id === id)).filter(Boolean) as StudentOption[]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg max-h-[90vh] flex flex-col", isConfidential && "border-destructive/30")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{form.icon}</span>
            {form.title}
            {isConfidential && (
              <Badge variant="destructive" className="text-[10px] mr-auto">
                <ShieldAlert className="h-3 w-3 ml-1" /> سري
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{form.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* ===== Multi-Select Mode Banner ===== */}
            {isMultiMode && multiStudents.length > 1 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">{multiStudents.length} طالب محدد</p>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {multiStudents.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">
                      {s.full_name}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">يمكنك تعبئة الحقول المشتركة ثم اختيار نوع التصدير أدناه</p>
              </div>
            )}

            {/* Student Picker (single mode) */}
            {!isMultiMode && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">اختيار الطالب</Label>
                {selectedStudent && !showStudentList ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedStudent.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedStudent.className} — {selectedStudent.national_id || "بدون هوية"}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setShowStudentList(true); setSearchQuery(""); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select value={filterClassId} onValueChange={setFilterClassId}>
                        <SelectTrigger className="w-[130px] shrink-0 text-xs h-9"><SelectValue placeholder="كل الفصول" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الفصول</SelectItem>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث بالاسم أو الهوية..." className="pr-8 h-9 text-xs" />
                      </div>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-6">{searchQuery ? "لا توجد نتائج" : "لا يوجد طلاب"}</p>
                      ) : (
                        filteredStudents.map(s => (
                          <button key={s.id} type="button" onClick={() => handleSelectStudent(s.id)} className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-accent/50 active:bg-accent transition-colors border-b border-border/50 last:border-b-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{s.full_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{s.national_id || "—"}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 font-normal">{s.className || "بدون فصل"}</Badge>
                          </button>
                        ))
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">{filteredStudents.length} طالب</p>
                  </div>
                )}
              </div>
            )}

            {/* Witness picker */}
            {form.witnessPickerEnabled && (selectedStudentId || isMultiMode) && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  👥 اختيار الشهود
                  {selectedWitnesses.length > 0 && <Badge variant="secondary" className="text-[10px]">{selectedWitnesses.length}</Badge>}
                </Label>
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {witnessOptions.slice(0, 50).map(s => {
                    const isSelected = selectedWitnesses.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleWitness(s.id)} className={`w-full text-right text-xs px-2 py-1.5 rounded transition-colors ${isSelected ? "bg-primary/10 text-primary font-semibold border border-primary/20" : "hover:bg-muted text-foreground"}`}>
                        {s.full_name} — {s.className}{isSelected && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form fields */}
            {form.fields.filter(f => f.type !== "auto" && !f.hidden).map(renderField)}

            {/* Signature Canvas */}
            {(selectedStudentId || isMultiMode) && useLiveSignature && (
              <SignatureCanvas onSignatureChange={setSignatureDataUrl} />
            )}

            {/* Editable Body Text */}
            {defaultBodyText && (selectedStudentId || isMultiMode) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    نص النموذج
                    {isBodyEdited && <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/30 text-primary">معدّل</Badge>}
                  </Label>
                  {isBodyEdited && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => { setCustomBodyText(null); setIsEditingBody(false); }}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">استعادة النص الأصلي</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {isEditingBody ? (
                  <Textarea value={finalBodyText || ""} onChange={e => setCustomBodyText(e.target.value)} className={cn("min-h-[140px] text-sm leading-relaxed", isConfidential && "border-destructive/20")} dir="rtl" />
                ) : (
                  <div onClick={() => { if (!customBodyText) setCustomBodyText(defaultBodyText); setIsEditingBody(true); }} className={cn("rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30", isConfidential ? "bg-destructive/5 border-destructive/20" : "bg-muted/50")} title="انقر للتعديل">
                    {finalBodyText}
                    <p className="text-[10px] text-muted-foreground mt-2 opacity-60">📝 انقر لتعديل النص</p>
                  </div>
                )}
              </div>
            )}

            {/* Auto-filled fields */}
            {selectedStudentId && !isMultiMode && (
              <div className="grid grid-cols-2 gap-2">
                {form.fields.filter(f => f.type === "auto").map(f => (
                  <div key={f.id} className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <div className="text-xs font-medium bg-muted rounded px-2 py-1.5 truncate">{fieldValues[f.id] || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>

          {/* ===== BULK EXPORT BUTTONS (Multi-mode) ===== */}
          {isMultiMode && multiStudents.length > 1 && (
            <>
              <Button
                variant="outline"
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleBulkSeparate}
                disabled={bulkExporting}
              >
                {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileStack className="h-3.5 w-3.5" />}
                تصدير منفصل ({multiStudents.length})
              </Button>
              <Button
                className="gap-1.5 text-xs"
                onClick={handleBulkMerged}
                disabled={bulkExporting}
              >
                {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileMerge className="h-3.5 w-3.5" />}
                تقرير مدمج ({multiStudents.length})
              </Button>
            </>
          )}

          {/* ===== SINGLE EXPORT BUTTONS ===== */}
          {(!isMultiMode || multiStudents.length <= 1) && (
            <>
              {form.adminAlertEnabled && (
                <Button variant="destructive" size="sm" onClick={handleAdminAlert} disabled={!selectedStudentId} className="gap-1">
                  <AlertTriangle className="h-4 w-4" /> بلاغ عاجل
                </Button>
              )}
              {form.whatsappEnabled && (
                <Button variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={handleWhatsApp} disabled={!selectedStudentId}>
                  <MessageCircle className="h-4 w-4 ml-2" /> إرسال عبر واتساب
                </Button>
              )}
              <Button
                variant="outline"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950 gap-1"
                onClick={handleSharePdf} disabled={sharing || !selectedStudentId}
              >
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                إرسال PDF عبر واتساب
              </Button>
              <Button onClick={handleExport} disabled={exporting || !selectedStudentId}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
                تصدير PDF
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
