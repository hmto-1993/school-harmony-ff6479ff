import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ClassRow, GradeCategory } from "./useSettingsData";

export function useSettingsProfile(user: any) {
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNationalId, setProfileNationalId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newOwnPassword, setNewOwnPassword] = useState("");
  const [confirmOwnPassword, setConfirmOwnPassword] = useState("");
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);

  const loadProfile = (data: any) => {
    if (data) {
      setProfileName(data.full_name || "");
      setProfilePhone(data.phone || "");
      setProfileNationalId(data.national_id || "");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: profileName, phone: profilePhone, national_id: profileNationalId || null }).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي بنجاح" });
  };

  const handleChangeOwnPassword = async () => {
    if (!newOwnPassword.trim() || !currentPassword.trim()) return;
    if (newOwnPassword !== confirmOwnPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" }); return;
    }
    setChangingOwnPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || "", password: currentPassword });
    if (signInError) { toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" }); setChangingOwnPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newOwnPassword });
    setChangingOwnPassword(false);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" }); setCurrentPassword(""); setNewOwnPassword(""); setConfirmOwnPassword(""); }
  };

  return {
    profileName, setProfileName, profilePhone, setProfilePhone, profileNationalId, setProfileNationalId,
    savingProfile, handleSaveProfile, loadProfile,
    currentPassword, setCurrentPassword, newOwnPassword, setNewOwnPassword, confirmOwnPassword, setConfirmOwnPassword,
    changingOwnPassword, handleChangeOwnPassword,
  };
}

export function useSettingsClasses(fetchData: () => void) {
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newGrade, setNewGrade] = useState("الأول الثانوي");
  const [newYear, setNewYear] = useState("1446-1447");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [editingClassGrade, setEditingClassGrade] = useState("");
  const [editingClassSection, setEditingClassSection] = useState("");
  const [editingClassYear, setEditingClassYear] = useState("");
  const [importClassesOpen, setImportClassesOpen] = useState(false);
  const [importedClasses, setImportedClasses] = useState<{ name: string; grade: string; section: string }[]>([]);
  const [importingClasses, setImportingClasses] = useState(false);
  const classFileRef = useRef<HTMLInputElement>(null);
  const [scheduleDialogClass, setScheduleDialogClass] = useState<{ id: string; name: string } | null>(null);

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newSection.trim()) return;
    const { error } = await supabase.from("classes").insert({ name: newClassName, section: newSection, grade: newGrade, academic_year: newYear });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تمت الإضافة", description: `تمت إضافة الفصل ${newClassName}` }); setNewClassName(""); setNewSection(""); fetchData(); }
  };

  const handleSaveClassEdit = async (id: string) => {
    if (!editingClassName.trim()) return;
    const { error } = await supabase.from("classes").update({ name: editingClassName, grade: editingClassGrade, section: editingClassSection, academic_year: editingClassYear }).eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم التعديل", description: "تم تعديل بيانات الفصل" }); setEditingClassId(null); fetchData(); }
  };

  const startEditingClass = (cls: ClassRow) => {
    setEditingClassId(cls.id); setEditingClassName(cls.name); setEditingClassGrade(cls.grade); setEditingClassSection(cls.section); setEditingClassYear(cls.academic_year);
  };

  const handleClassFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    const columnMap: Record<string, string[]> = {
      name: ["الفصل", "اسم الفصل", "Class", "Name", "name"],
      grade: ["الصف", "المرحلة", "Grade", "grade"],
      section: ["رقم الفصل", "Section", "section"],
    };
    const find = (row: Record<string, any>, keys: string[]): string => {
      for (const key of keys) { if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return String(row[key]).trim(); }
      return "";
    };
    const rows = json.map(row => ({ name: find(row, columnMap.name), grade: find(row, columnMap.grade) || newGrade, section: find(row, columnMap.section) || "" })).filter(r => r.name);
    setImportedClasses(rows);
    if (classFileRef.current) classFileRef.current.value = "";
  };

  const handleImportClasses = async () => {
    if (importedClasses.length === 0) return;
    setImportingClasses(true);
    const inserts = importedClasses.map(c => ({ name: c.name, grade: c.grade, section: c.section || "1", academic_year: newYear }));
    const { error } = await supabase.from("classes").insert(inserts);
    setImportingClasses(false);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تمت الإضافة", description: `تم استيراد ${inserts.length} فصل` }); setImportedClasses([]); setImportClassesOpen(false); fetchData(); }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم الحذف", description: "تم حذف الفصل. فئات التقييم محفوظة ويمكن إعادة ربطها." }); fetchData(); }
  };

  return {
    newClassName, setNewClassName, newSection, setNewSection, newGrade, setNewGrade, newYear, setNewYear,
    editingClassId, setEditingClassId, editingClassName, setEditingClassName, editingClassGrade, setEditingClassGrade,
    editingClassSection, setEditingClassSection, editingClassYear, setEditingClassYear,
    importClassesOpen, setImportClassesOpen, importedClasses, setImportedClasses, importingClasses, classFileRef,
    scheduleDialogClass, setScheduleDialogClass,
    handleAddClass, handleSaveClassEdit, startEditingClass, handleClassFileSelect, handleImportClasses, handleDeleteClass,
  };
}

export function useSettingsCategories(
  classes: ClassRow[],
  categories: GradeCategory[],
  fetchData: () => void,
  refreshCategoriesOnly?: () => Promise<void>,
  setCategoriesDirect?: React.Dispatch<React.SetStateAction<GradeCategory[]>>,
) {
  const refresh = refreshCategoriesOnly || (async () => fetchData());
  const [editingCats, setEditingCats] = useState<Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>>({});
  const [savingCats, setSavingCats] = useState(false);
  const [catClassFilter, setCatClassFilter] = useState("all");
  const [newCatClassId, setNewCatClassId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [newCatMaxScore, setNewCatMaxScore] = useState(100);
  const [newCatGroup, setNewCatGroup] = useState("classwork");
  const [newCatIsDeduction, setNewCatIsDeduction] = useState(false);

  const initEditingCats = (cats: GradeCategory[]) => {
    const edits: Record<string, { weight: number; max_score: number }> = {};
    cats.forEach(c => { edits[c.id] = { weight: c.weight, max_score: c.max_score }; });
    setEditingCats(edits);
  };

  const handleSaveCategories = async () => {
    setSavingCats(true);
    let hasError = false;
    if (catClassFilter === "all") {
      const classCats = categories.filter(c => c.class_id !== null);
      const seen = new Map<string, GradeCategory>();
      classCats.forEach(c => { if (!seen.has(c.name)) seen.set(c.name, c); });
      const templateCats = Array.from(seen.values());
      for (const tpl of templateCats) {
        const editedVals = editingCats[tpl.id];
        const finalName = editedVals?.name || tpl.name;
        const finalMaxScore = editedVals?.max_score ?? tpl.max_score;
        const finalGroup = editedVals?.category_group || tpl.category_group;
        const originalName = tpl.name;
        const matchingCats = categories.filter(c => c.name === originalName && c.class_id !== null);
        for (const mc of matchingCats) {
          const updateData: Record<string, any> = { max_score: finalMaxScore };
          if (finalName !== originalName) updateData.name = finalName;
          if (finalGroup) updateData.category_group = finalGroup;
          const { error } = await supabase.from("grade_categories").update(updateData).eq("id", mc.id);
          if (error) hasError = true;
        }
        const classIdsWithCat = new Set(matchingCats.map(c => c.class_id));
        const missingClasses = classes.filter(cls => !classIdsWithCat.has(cls.id));
        if (missingClasses.length > 0) {
          const inserts = missingClasses.map(cls => ({ name: finalName, weight: tpl.weight, max_score: finalMaxScore, class_id: cls.id, sort_order: tpl.sort_order, category_group: finalGroup }));
          const { error: insertErr } = await supabase.from("grade_categories").insert(inserts);
          if (insertErr) hasError = true;
        }
      }
      if (hasError) toast({ title: "خطأ في الحفظ", variant: "destructive" });
      else { toast({ title: "تم الحفظ", description: "تم تعميم التغييرات على جميع الفصول" }); await refresh(); }
    } else {
      const filtered = categories.filter(c => c.class_id === catClassFilter);
      const updates = filtered.map(cat => {
        const edited = editingCats[cat.id];
        const updateData: Record<string, any> = { max_score: edited?.max_score ?? cat.max_score };
        if (edited?.name) updateData.name = edited.name;
        if (edited?.category_group) updateData.category_group = edited.category_group;
        return supabase.from("grade_categories").update(updateData).eq("id", cat.id);
      });
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) toast({ title: "خطأ في الحفظ", variant: "destructive" });
      else { toast({ title: "تم الحفظ", description: "تم تحديث فئات التقييم بنجاح" }); await refresh(); }
    }
    setSavingCats(false); setEditingCats({});
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    // عند تفعيل فلتر "جميع الفصول" يتم تعميم الإضافة على كل الفصول تلقائياً
    const effectiveClassId = catClassFilter === "all" ? "all" : (newCatClassId || catClassFilter);
    if (!effectiveClassId) return;
    if (effectiveClassId === "all") {
      const inserts = classes.map(cls => {
        const classCats = categories.filter(c => c.class_id === cls.id);
        const maxOrder = classCats.length > 0 ? Math.max(...classCats.map(c => c.sort_order)) : 0;
        return supabase.from("grade_categories").insert({ name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: cls.id, sort_order: maxOrder + 1, category_group: newCatGroup, is_deduction: newCatIsDeduction });
      });
      const results = await Promise.all(inserts);
      if (results.some(r => r.error)) toast({ title: "خطأ", description: "فشل في الإضافة لبعض الفصول", variant: "destructive" });
      else toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}" لجميع الفصول` });
    } else {
      const classCats = categories.filter(c => c.class_id === newCatClassId);
      const maxOrder = classCats.length > 0 ? Math.max(...classCats.map(c => c.sort_order)) : 0;
      const { error } = await supabase.from("grade_categories").insert({ name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: newCatClassId, sort_order: maxOrder + 1, category_group: newCatGroup, is_deduction: newCatIsDeduction });
      if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
      else toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}"` });
    }
    setNewCatName(""); setNewCatWeight(10); setNewCatMaxScore(100); setNewCatGroup("classwork"); setNewCatIsDeduction(false); await refresh();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (catClassFilter === "all" && cat) {
      const matchingIds = categories.filter(c => c.name === cat.name).map(c => c.id);
      const deletes = matchingIds.map(mid => supabase.from("grade_categories").delete().eq("id", mid));
      const results = await Promise.all(deletes);
      if (results.some(r => r.error)) toast({ title: "خطأ", description: "فشل حذف بعض الفئات", variant: "destructive" });
      else toast({ title: "تم الحذف", description: `تم حذف "${cat.name}" من جميع الفصول` });
    } else {
      const { error } = await supabase.from("grade_categories").delete().eq("id", id);
      if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
      else toast({ title: "تم الحذف" });
    }
    await refresh();
  };

  const handleDeleteAllCategories = async () => {
    let toDelete: string[] = [];
    let scopeLabel = "";
    if (catClassFilter === "all") {
      toDelete = categories.map(c => c.id);
      scopeLabel = "جميع الفصول";
    } else if (catClassFilter === "orphaned") {
      toDelete = categories.filter(c => c.class_id === null).map(c => c.id);
      scopeLabel = "الفئات غير المرتبطة";
    } else {
      toDelete = categories.filter(c => c.class_id === catClassFilter).map(c => c.id);
      const cls = classes.find(c => c.id === catClassFilter);
      scopeLabel = cls?.name || "الفصل";
    }
    if (toDelete.length === 0) { toast({ title: "لا توجد فئات للحذف" }); return; }
    const { error } = await supabase.from("grade_categories").delete().in("id", toDelete);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else toast({ title: "تم الحذف", description: `تم حذف ${toDelete.length} فئة من ${scopeLabel}` });
    await refresh();
  };

  const handleReassignOrphanedCategories = async (targetClassId: string) => {
    const orphaned = categories.filter(c => c.class_id === null);
    if (!targetClassId || orphaned.length === 0) return;
    if (targetClassId === "all_classes") {
      const inserts = classes.flatMap(cls => orphaned.map(cat => ({ name: cat.name, weight: cat.weight, max_score: cat.max_score, class_id: cls.id, sort_order: cat.sort_order, category_group: cat.category_group })));
      const { error: insertError } = await supabase.from("grade_categories").insert(inserts);
      if (insertError) { toast({ title: "خطأ", description: insertError.message, variant: "destructive" }); return; }
      const ids = orphaned.map(c => c.id);
      await supabase.from("grade_categories").delete().in("id", ids);
      toast({ title: "تم الربط", description: `تم ربط ${orphaned.length} فئة بجميع الفصول` });
    } else {
      const updates = orphaned.map(cat => supabase.from("grade_categories").update({ class_id: targetClassId }).eq("id", cat.id));
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) toast({ title: "خطأ", description: "فشل ربط بعض الفئات", variant: "destructive" });
      else { const className = classes.find(c => c.id === targetClassId)?.name || ""; toast({ title: "تم الربط", description: `تم ربط ${orphaned.length} فئة بفصل ${className}` }); }
    }
    await refresh();
  };

  const handleReorderCategory = async (catId: string, direction: "up" | "down", groupCats: GradeCategory[]) => {
    const idx = groupCats.findIndex(c => c.id === catId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;
    const catA = groupCats[idx]; const catB = groupCats[swapIdx];
    if (catClassFilter === "all") {
      const allCatsA = categories.filter(c => c.name === catA.name);
      const allCatsB = categories.filter(c => c.name === catB.name);
      await Promise.all([
        ...allCatsA.map(c => supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", c.id)),
        ...allCatsB.map(c => supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", c.id)),
      ]);
    } else {
      await Promise.all([
        supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", catA.id),
        supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", catB.id),
      ]);
    }
    await refresh();
  };

  // Computed
  const orphanedCategories = categories.filter(c => c.class_id === null);
  const filteredCategories = catClassFilter === "all"
    ? (() => {
        const classCats = categories.filter(c => c.class_id !== null);
        const seen = new Map<string, GradeCategory>();
        classCats.forEach(c => { if (!seen.has(c.name)) seen.set(c.name, c); });
        const uniqueCats = Array.from(seen.values()).sort((a, b) => a.sort_order - b.sort_order);
        const classNames = new Set(uniqueCats.map(c => c.name));
        const uniqueOrphaned = orphanedCategories.filter(c => !classNames.has(c.name));
        return [...uniqueCats, ...uniqueOrphaned];
      })()
    : catClassFilter === "orphaned" ? orphanedCategories : categories.filter(c => c.class_id === catClassFilter);

  const getEffectiveGroup = (cat: GradeCategory) => editingCats[cat.id]?.category_group ?? cat.category_group;
  const classworkCategories = filteredCategories.filter(c => getEffectiveGroup(c) === "classwork");
  const examCategories = filteredCategories.filter(c => getEffectiveGroup(c) === "exam");

  return {
    editingCats, setEditingCats, savingCats, catClassFilter, setCatClassFilter,
    newCatClassId, setNewCatClassId, newCatName, setNewCatName, newCatWeight, setNewCatWeight,
    newCatMaxScore, setNewCatMaxScore, newCatGroup, setNewCatGroup,
    newCatIsDeduction, setNewCatIsDeduction,
    orphanedCategories, filteredCategories, classworkCategories, examCategories,
    handleSaveCategories, handleAddCategory, handleDeleteCategory, handleDeleteAllCategories,
    handleReassignOrphanedCategories, handleReorderCategory,
    initEditingCats,
  };
}

export function useSettingsSms() {
  const [smsProvider, setSmsProvider] = useState("msegat");
  const [providerUsername, setProviderUsername] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerSender, setProviderSender] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  const loadSms = (data: any[]) => {
    (data || []).forEach((s: any) => {
      if (s.id === "sms_provider") setSmsProvider(s.value || "msegat");
      if (s.id === "sms_provider_username") setProviderUsername(s.value || "");
      if (s.id === "sms_provider_api_key") setProviderApiKey(s.value || "");
      if (s.id === "sms_provider_sender") setProviderSender(s.value || "");
    });
  };

  const handleSaveProvider = async () => {
    setSavingProvider(true);
    const updates = [
      supabase.from("site_settings").upsert({ id: "sms_provider", value: smsProvider }),
      supabase.from("site_settings").upsert({ id: "sms_provider_username", value: providerUsername }),
      supabase.from("site_settings").upsert({ id: "sms_provider_api_key", value: providerApiKey }),
      supabase.from("site_settings").upsert({ id: "sms_provider_sender", value: providerSender }),
    ];
    const results = await Promise.all(updates);
    setSavingProvider(false);
    if (results.some(r => r.error)) toast({ title: "خطأ", description: "فشل حفظ إعدادات SMS", variant: "destructive" });
    else toast({ title: "تم الحفظ", description: "تم تحديث إعدادات SMS بنجاح" });
  };

  return {
    smsProvider, setSmsProvider, providerUsername, setProviderUsername, providerApiKey, setProviderApiKey,
    providerSender, setProviderSender, savingProvider, testingSms, setTestingSms, handleSaveProvider, loadSms,
  };
}
