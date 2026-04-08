import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FormTemplate, FormField } from "@/components/forms/form-templates";

export interface CustomSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by: string;
}

export interface CustomFormTemplate {
  id: string;
  section_id: string;
  title: string;
  description: string;
  icon: string;
  body_template: string;
  fields: any[];
  signature_enabled: boolean;
  signature_labels: string[];
  include_auto_fields: boolean;
  sort_order: number;
  created_by: string;
}

const commonAutoFields: FormField[] = [
  { id: "student_name", label: "اسم الطالب", type: "auto", autoKey: "student_name" },
  { id: "class_name", label: "الفصل", type: "auto", autoKey: "class_name" },
  { id: "national_id", label: "السجل المدني", type: "auto", autoKey: "national_id" },
  { id: "date", label: "التاريخ", type: "auto", autoKey: "date" },
];

export function convertToFormTemplate(custom: CustomFormTemplate, section: CustomSection): FormTemplate {
  const customFields: FormField[] = (custom.fields || []).map((f: any) => ({
    id: f.id || `field_${Math.random().toString(36).slice(2, 8)}`,
    label: f.label || "",
    type: f.type === "static" ? "textarea" : (f.type || "text"),
    placeholder: f.placeholder || "",
    required: f.required || false,
  }));

  const fields = custom.include_auto_fields
    ? [...commonAutoFields, ...customFields]
    : customFields;

  return {
    id: `custom_${custom.id}`,
    title: custom.title,
    category: "general" as const,
    icon: custom.icon,
    description: custom.description,
    fields,
    bodyTemplate: custom.body_template || undefined,
    signatureLabels: custom.signature_enabled ? custom.signature_labels : undefined,
    whatsappEnabled: false,
  };
}

export function useCustomForms() {
  const { user } = useAuth();
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [templates, setTemplates] = useState<CustomFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: secs }, { data: tmps }] = await Promise.all([
      supabase.from("custom_form_sections").select("*").order("sort_order"),
      supabase.from("custom_form_templates").select("*").order("sort_order"),
    ]);
    setSections((secs as any[]) || []);
    setTemplates((tmps as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addSection = async (title: string, icon: string, color: string) => {
    if (!user) return;
    await supabase.from("custom_form_sections").insert({
      title, icon, color, created_by: user.id,
      sort_order: sections.length,
    } as any);
    await fetchAll();
  };

  const deleteSection = async (id: string) => {
    await supabase.from("custom_form_sections").delete().eq("id", id);
    await fetchAll();
  };

  const addTemplate = async (sectionId: string, data: Omit<CustomFormTemplate, "id" | "section_id" | "created_by" | "sort_order">) => {
    if (!user) return;
    await supabase.from("custom_form_templates").insert({
      section_id: sectionId,
      created_by: user.id,
      sort_order: templates.filter(t => t.section_id === sectionId).length,
      ...data,
    } as any);
    await fetchAll();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("custom_form_templates").delete().eq("id", id);
    await fetchAll();
  };

  return { sections, templates, loading, addSection, deleteSection, addTemplate, deleteTemplate, refetch: fetchAll };
}
