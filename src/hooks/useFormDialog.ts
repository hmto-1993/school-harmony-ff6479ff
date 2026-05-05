import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FormTemplate } from "@/components/forms/form-templates";
import { exportFormPdf } from "@/components/forms/form-pdf-export";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerArabicFont } from "@/lib/arabic-pdf";

export interface StudentOption {
  id: string;
  full_name: string;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  className: string;
  grade: string;
  section: string;
}

export interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section: string;
}

interface UseFormDialogProps {
  form: FormTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudentIds?: string[];
  initialFieldValues?: Record<string, string>;
}

export function useFormDialog({ form, open, onOpenChange, preSelectedStudentIds, initialFieldValues }: UseFormDialogProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [witnessFilterClassId, setWitnessFilterClassId] = useState("all");
  const [adminPhone, setAdminPhone] = useState("");
  const [sharing, setSharing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [useLiveSignature, setUseLiveSignature] = useState(true);
  const [customBodyText, setCustomBodyText] = useState<string | null>(null);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("all");
  const [showStudentList, setShowStudentList] = useState(true);
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

      if (preSelectedStudentIds && preSelectedStudentIds.length === 1) {
        setSelectedStudentId(preSelectedStudentIds[0]);
        setShowStudentList(false);
      }
    })();
  }, [open, user, form.adminAlertEnabled, preSelectedStudentIds]);

  // Reset state when form changes
  useEffect(() => {
    setSelectedStudentId(preSelectedStudentIds?.length === 1 ? preSelectedStudentIds[0] : "");
    setFieldValues(initialFieldValues || {});
    setSelectedWitnesses([]);
    setSearchQuery("");
    setFilterClassId("all");
    setShowStudentList(!(preSelectedStudentIds?.length === 1));
    setSignatureDataUrl(null);
    setCustomBodyText(null);
    setIsEditingBody(false);
  }, [form.id, preSelectedStudentIds, initialFieldValues]);

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
      // Smart auto-fill: derive stage from grade so MOE forms (commitment, behavior_grades…)
      // get pre-populated when the user picks a student
      stage: prev.stage || s.grade || "",
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

      doc.setFontSize(16); doc.setFont("Amiri", "bold"); doc.setTextColor(0, 102, 153);
      doc.text(form.title, pageW / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10); doc.setFont("Amiri", "normal"); doc.setTextColor(100, 100, 100);
      doc.text(`التاريخ: ${dateStr} — عدد الطلاب: ${selectedStudents.length}`, pageW / 2, y, { align: "center" });
      y += 12;

      const tableBody = selectedStudents.map((s, i) => [
        s.national_id || "—", s.className, s.full_name, String(i + 1),
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

  const witnessOptions = useMemo(() => {
    const base = students.filter(s => s.id !== selectedStudentId);
    if (witnessFilterClassId === "all") return base;
    return base.filter(s => s.class_id === witnessFilterClassId);
  }, [students, selectedStudentId, witnessFilterClassId]);

  const toggleWitness = (studentId: string) => {
    setSelectedWitnesses(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const defaultBodyText = form.bodyTemplate
    ? form.bodyTemplate.replace(/\{(\w+)\}/g, (_, key) => fieldValues[key] || `{${key}}`)
    : null;
  const finalBodyText = customBodyText !== null ? customBodyText : defaultBodyText;
  const isBodyEdited = customBodyText !== null;

  const multiStudents = isMultiMode
    ? preSelectedStudentIds!.map(id => students.find(s => s.id === id)).filter(Boolean) as StudentOption[]
    : [];

  return {
    students, classes, selectedStudentId, fieldValues, exporting, selectedWitnesses,
    sharing, signatureDataUrl, useLiveSignature, customBodyText, isEditingBody,
    searchQuery, filterClassId, showStudentList, bulkExporting, isMultiMode,
    filteredStudents, selectedStudent, witnessOptions, defaultBodyText, finalBodyText,
    isBodyEdited, multiStudents, witnessFilterClassId,
    setSignatureDataUrl, setCustomBodyText, setIsEditingBody, setSearchQuery,
    setFilterClassId, setShowStudentList, setWitnessFilterClassId,
    handleSelectStudent, handleFieldChange, handleExport, handleBulkSeparate,
    handleBulkMerged, handleWhatsApp, handleAdminAlert, handleSharePdf, toggleWitness,
  };
}
