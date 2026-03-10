/**
 * SettingsPage — الصفحة الرئيسية للإعدادات
 * تعرض بطاقات الإعدادات المختلفة وتفتح المكونات الفرعية عند النقر
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon, Plus, Trash2, Save, GraduationCap, Users, Eye, EyeOff,
  Printer, Download, FileSpreadsheet, Pencil, Check, X, Megaphone, ChevronDown,
  ArrowUp, ArrowDown, Palette, History, RotateCcw, CalendarDays, ClipboardCheck,
  Lock, LockOpen, Trophy, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ===== المكونات الفرعية المستخرجة =====
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import AcademicCalendarSettings from "@/components/dashboard/AcademicCalendarSettings";
import ClassScheduleDialog from "@/components/settings/ClassScheduleDialog";
import LessonPlanSettings from "@/components/settings/LessonPlanSettings";
import WhatsAppTemplatesSettings from "@/components/settings/WhatsAppTemplatesSettings";
import QuizColorSettings from "@/components/settings/QuizColorSettings";
import HonorRollSettings from "@/components/settings/HonorRollSettings";
import ProfileSettings from "@/components/settings/ProfileSettings";
import TeacherManagement from "@/components/settings/TeacherManagement";
import AbsenceThresholdSettings from "@/components/settings/AbsenceThresholdSettings";
import SmsProviderSettings from "@/components/settings/SmsProviderSettings";
import DataPurgeSettings from "@/components/settings/DataPurgeSettings";
import LoginPageSettings from "@/components/settings/LoginPageSettings";

import { useCalendarType } from "@/hooks/useCalendarType";

// ===== الأنواع =====
interface ClassRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  academic_year: string;
  created_at: string;
  studentCount?: number;
}

interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
  class_id: string | null;
  class_name?: string;
  category_group: string;
}

export default function SettingsPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const { calendarType: calendarTypeLocal, setCalendarType: setGlobalCalendarType } = useCalendarType();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // === إعدادات الفصول ===
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

  // === إعدادات التحضير ===
  const [attendanceOverrideLock, setAttendanceOverrideLock] = useState(false);
  const [classSchedules, setClassSchedules] = useState<Record<string, { periodsPerWeek: number; daysOfWeek: number[] }>>({});
  const [savingAttendanceSettings, setSavingAttendanceSettings] = useState(false);
  const pendingScheduleUpdates = useRef<Record<string, { periodsPerWeek: number; timeout: NodeJS.Timeout }>>({});

  const saveClassSchedule = useCallback(async (classId: string, newVal: number) => {
    if (pendingScheduleUpdates.current[classId]) clearTimeout(pendingScheduleUpdates.current[classId].timeout);
    setClassSchedules(prev => ({ ...prev, [classId]: { ...prev[classId], periodsPerWeek: newVal, daysOfWeek: prev[classId]?.daysOfWeek || [0, 1, 2, 3, 4] } }));
    pendingScheduleUpdates.current[classId] = {
      periodsPerWeek: newVal,
      timeout: setTimeout(async () => {
        const { data: existing } = await supabase.from("class_schedules").select("id").eq("class_id", classId).maybeSingle();
        if (existing) {
          await supabase.from("class_schedules").update({ periods_per_week: newVal }).eq("class_id", classId);
        } else {
          await supabase.from("class_schedules").insert({ class_id: classId, periods_per_week: newVal, days_of_week: [0, 1, 2, 3, 4] });
        }
        delete pendingScheduleUpdates.current[classId];
      }, 300),
    };
  }, []);

  // === فئات التقييم ===
  const [editingCats, setEditingCats] = useState<Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>>({});
  const [savingCats, setSavingCats] = useState(false);
  const [catClassFilter, setCatClassFilter] = useState("all");
  const [newCatClassId, setNewCatClassId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [newCatMaxScore, setNewCatMaxScore] = useState(100);
  const [newCatGroup, setNewCatGroup] = useState("classwork");

  // === العام الدراسي ===
  const [defaultAcademicYear, setDefaultAcademicYear] = useState("1446-1447");
  const [savingAcademicYear, setSavingAcademicYear] = useState(false);

  // === الظهور للطالب ===
  const [showGrades, setShowGrades] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showBehavior, setShowBehavior] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
  const [visibilityPeriod, setVisibilityPeriod] = useState<"p1" | "p2">("p1");

  // === الرسالة المنبثقة ===
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupExpiry, setPopupExpiry] = useState("");
  const [popupTargetType, setPopupTargetType] = useState<"all" | "specific">("all");
  const [popupTargetClassIds, setPopupTargetClassIds] = useState<string[]>([]);
  const [savingPopup, setSavingPopup] = useState(false);
  const [popupAction, setPopupAction] = useState("none");
  const [popupRepeat, setPopupRepeat] = useState("none");
  const [popupHistory, setPopupHistory] = useState<any[]>([]);
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [popupCountdown, setPopupCountdown] = useState("");
  const popupExpiryNotified = useRef(false);

  // === لوحة الشرف (للبطاقة فقط) ===
  const [honorRollEnabled, setHonorRollEnabled] = useState(false);

  // === عداد انتهاء الرسالة المنبثقة ===
  useEffect(() => {
    if (!popupEnabled || !popupExpiry) { setPopupCountdown(""); popupExpiryNotified.current = false; return; }
    const calc = () => {
      const diff = new Date(popupExpiry).getTime() - Date.now();
      if (diff <= 0) {
        setPopupCountdown("منتهية");
        if (!popupExpiryNotified.current) {
          popupExpiryNotified.current = true;
          toast({ title: "⏰ انتهت صلاحية الرسالة المنبثقة", description: "الرسالة المنبثقة للطلاب انتهت صلاحيتها.", variant: "destructive" });
        }
        return;
      }
      popupExpiryNotified.current = false;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setPopupCountdown(d > 0 ? `${d}ي ${h}س ${m}د` : h > 0 ? `${h}س ${m}د ${s}ث` : `${m}د ${s}ث`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [popupEnabled, popupExpiry]);

  // ===== تحميل البيانات =====
  const fetchData = async () => {
    setLoading(true);
    const [classesRes, catsRes, studentsRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("grade_categories").select("*, classes(name)").order("sort_order"),
      supabase.from("students").select("id, class_id"),
    ]);

    const classData = (classesRes.data || []) as ClassRow[];
    const studentCounts: Record<string, number> = {};
    (studentsRes.data || []).forEach((s: any) => { if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1; });
    classData.forEach((c) => (c.studentCount = studentCounts[c.id] || 0));
    setClasses(classData);

    const catData = (catsRes.data || []).map((c: any) => ({ ...c, class_name: c.classes?.name || "—" }));
    setCategories(catData);
    const edits: Record<string, { weight: number; max_score: number }> = {};
    catData.forEach((c: GradeCategory) => { edits[c.id] = { weight: c.weight, max_score: c.max_score }; });
    setEditingCats(edits);

    // إعدادات الأدمن
    if (isAdmin) {
      const { data: settingsData } = await supabase.from("site_settings").select("id, value").in("id", [
        "default_academic_year", "student_show_grades", "student_show_attendance", "student_show_behavior",
        "student_hidden_categories", "student_popup_enabled", "student_popup_title", "student_popup_message",
        "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes",
        "student_popup_action", "student_popup_repeat", "honor_roll_enabled",
      ]);
      (settingsData || []).forEach((s: any) => {
        if (s.id === "default_academic_year" && s.value) { setDefaultAcademicYear(s.value); setNewYear(s.value); }
        if (s.id === "student_show_grades") setShowGrades(s.value !== "false");
        if (s.id === "student_show_attendance") setShowAttendance(s.value !== "false");
        if (s.id === "student_show_behavior") setShowBehavior(s.value !== "false");
        if (s.id === "student_hidden_categories" && s.value) {
          try { const p = JSON.parse(s.value); setHiddenCategories(Array.isArray(p) ? { p1: p, p2: p } : { p1: p.p1 || [], p2: p.p2 || [] }); } catch { /* ignore */ }
        }
        if (s.id === "student_popup_enabled") setPopupEnabled(s.value === "true");
        if (s.id === "student_popup_title") setPopupTitle(s.value || "");
        if (s.id === "student_popup_message") setPopupMessage(s.value || "");
        if (s.id === "student_popup_expiry") setPopupExpiry(s.value || "");
        if (s.id === "student_popup_target_type") setPopupTargetType((s.value as "all" | "specific") || "all");
        if (s.id === "student_popup_target_classes" && s.value) { try { setPopupTargetClassIds(JSON.parse(s.value)); } catch { /* ignore */ } }
        if (s.id === "student_popup_action") setPopupAction(s.value || "none");
        if (s.id === "student_popup_repeat") setPopupRepeat(s.value || "none");
        if (s.id === "honor_roll_enabled") setHonorRollEnabled(s.value === "true");
      });

      const { data: historyData } = await supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20);
      if (historyData) setPopupHistory(historyData);

      const { data: overrideSetting } = await supabase.from("site_settings").select("value").eq("id", "attendance_override_lock").maybeSingle();
      setAttendanceOverrideLock(overrideSetting?.value === "true");

      const { data: schedulesData } = await supabase.from("class_schedules").select("class_id, periods_per_week, days_of_week");
      const schedulesMap: Record<string, { periodsPerWeek: number; daysOfWeek: number[] }> = {};
      (schedulesData || []).forEach((s: any) => { schedulesMap[s.class_id] = { periodsPerWeek: s.periods_per_week, daysOfWeek: s.days_of_week }; });
      setClassSchedules(schedulesMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ===== معالجات الفصول =====
  const GRADE_OPTIONS = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"];

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newSection.trim()) return;
    const { error } = await supabase.from("classes").insert({ name: newClassName, section: newSection, grade: newGrade, academic_year: newYear });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else { toast({ title: "تمت الإضافة", description: `تمت إضافة الفصل ${newClassName}` }); setNewClassName(""); setNewSection(""); fetchData(); }
  };

  const handleSaveClassEdit = async (id: string) => {
    if (!editingClassName.trim()) return;
    const { error } = await supabase.from("classes").update({ name: editingClassName, grade: editingClassGrade, section: editingClassSection, academic_year: editingClassYear }).eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else { toast({ title: "تم التعديل" }); setEditingClassId(null); fetchData(); }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  const handleClassFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      for (const key of keys) { if (row[key] !== undefined && String(row[key]).trim()) return String(row[key]).trim(); }
      return "";
    };
    const rows = json.map((row) => ({ name: find(row, columnMap.name), grade: find(row, columnMap.grade) || newGrade, section: find(row, columnMap.section) || "" })).filter((r) => r.name);
    setImportedClasses(rows);
    if (classFileRef.current) classFileRef.current.value = "";
  };

  const handleImportClasses = async () => {
    if (importedClasses.length === 0) return;
    setImportingClasses(true);
    const { error } = await supabase.from("classes").insert(importedClasses.map((c) => ({ name: c.name, grade: c.grade, section: c.section || "1", academic_year: newYear })));
    setImportingClasses(false);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else { toast({ title: "تمت الإضافة", description: `تم استيراد ${importedClasses.length} فصل` }); setImportedClasses([]); setImportClassesOpen(false); fetchData(); }
  };

  // ===== معالجات الفئات =====
  const filteredCategories = catClassFilter === "all"
    ? (() => { const firstClassId = classes[0]?.id; return firstClassId ? categories.filter((c) => c.class_id === firstClassId) : []; })()
    : categories.filter((c) => c.class_id === catClassFilter);

  const getEffectiveGroup = (cat: GradeCategory) => editingCats[cat.id]?.category_group ?? cat.category_group;
  const classworkCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "classwork");
  const examCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "exams");

  const handleSaveCategories = async () => {
    setSavingCats(true);
    if (catClassFilter === "all") {
      const firstClassId = classes[0]?.id;
      const templateCats = categories.filter((c) => c.class_id === firstClassId);
      let hasError = false;
      for (const tpl of templateCats) {
        const ev = editingCats[tpl.id]; if (!ev) continue;
        const matchingCats = categories.filter((c) => c.name === tpl.name);
        for (const mc of matchingCats) {
          const ud: Record<string, any> = { max_score: ev.max_score };
          if (ev.name && ev.name !== tpl.name) ud.name = ev.name;
          if (ev.category_group) ud.category_group = ev.category_group;
          const { error } = await supabase.from("grade_categories").update(ud).eq("id", mc.id);
          if (error) hasError = true;
        }
      }
      toast(hasError ? { title: "خطأ في الحفظ", variant: "destructive" } : { title: "تم الحفظ", description: "تم تعميم التغييرات على جميع الفصول" });
    } else {
      const filtered = categories.filter((c) => c.class_id === catClassFilter);
      const results = await Promise.all(filtered.map((cat) => {
        const ed = editingCats[cat.id];
        const ud: Record<string, any> = { max_score: ed?.max_score ?? cat.max_score };
        if (ed?.name) ud.name = ed.name;
        if (ed?.category_group) ud.category_group = ed.category_group;
        return supabase.from("grade_categories").update(ud).eq("id", cat.id);
      }));
      toast(results.some((r) => r.error) ? { title: "خطأ في الحفظ", variant: "destructive" } : { title: "تم الحفظ" });
    }
    setSavingCats(false);
    setEditingCats({});
    fetchData();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatClassId) return;
    if (newCatClassId === "all") {
      const results = await Promise.all(classes.map((cls) => {
        const maxOrder = Math.max(0, ...categories.filter((c) => c.class_id === cls.id).map((c) => c.sort_order));
        return supabase.from("grade_categories").insert({ name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: cls.id, sort_order: maxOrder + 1, category_group: newCatGroup });
      }));
      toast(results.some((r) => r.error) ? { title: "خطأ", variant: "destructive" } : { title: "تمت الإضافة", description: `تمت إضافة "${newCatName}" لجميع الفصول` });
    } else {
      const maxOrder = Math.max(0, ...categories.filter((c) => c.class_id === newCatClassId).map((c) => c.sort_order));
      const { error } = await supabase.from("grade_categories").insert({ name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: newCatClassId, sort_order: maxOrder + 1, category_group: newCatGroup });
      toast(error ? { title: "خطأ", description: error.message, variant: "destructive" } : { title: "تمت الإضافة" });
    }
    setNewCatName(""); setNewCatWeight(10); setNewCatMaxScore(100); setNewCatGroup("classwork"); fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (catClassFilter === "all" && cat) {
      const ids = categories.filter((c) => c.name === cat.name).map((c) => c.id);
      await Promise.all(ids.map((mid) => supabase.from("grade_categories").delete().eq("id", mid)));
      toast({ title: "تم الحذف", description: `تم حذف "${cat.name}" من جميع الفصول` });
    } else {
      await supabase.from("grade_categories").delete().eq("id", id);
      toast({ title: "تم الحذف" });
    }
    fetchData();
  };

  const handleReorderCategory = async (catId: string, direction: "up" | "down", groupCats: GradeCategory[]) => {
    const idx = groupCats.findIndex((c) => c.id === catId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= groupCats.length) return;
    const catA = groupCats[idx], catB = groupCats[swapIdx];
    if (catClassFilter === "all") {
      const allA = categories.filter((c) => c.name === catA.name);
      const allB = categories.filter((c) => c.name === catB.name);
      await Promise.all([
        ...allA.map((c) => supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", c.id)),
        ...allB.map((c) => supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", c.id)),
      ]);
    } else {
      await Promise.all([
        supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", catA.id),
        supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", catB.id),
      ]);
    }
    fetchData();
  };

  // ===== معالجات الرسالة المنبثقة =====
  const handleSavePopup = async () => {
    setSavingPopup(true);
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "student_popup_enabled", value: String(popupEnabled) }),
      supabase.from("site_settings").upsert({ id: "student_popup_title", value: popupTitle }),
      supabase.from("site_settings").upsert({ id: "student_popup_message", value: popupMessage }),
      supabase.from("site_settings").upsert({ id: "student_popup_expiry", value: popupExpiry }),
      supabase.from("site_settings").upsert({ id: "student_popup_target_type", value: popupTargetType }),
      supabase.from("site_settings").upsert({ id: "student_popup_target_classes", value: JSON.stringify(popupTargetClassIds) }),
      supabase.from("site_settings").upsert({ id: "student_popup_action", value: popupAction }),
      supabase.from("site_settings").upsert({ id: "student_popup_repeat", value: popupRepeat }),
    ]);
    if (popupTitle.trim() && popupMessage.trim() && user) {
      await supabase.from("popup_messages").insert({ title: popupTitle, message: popupMessage, expiry: popupExpiry || null, target_type: popupTargetType, target_class_ids: popupTargetClassIds, created_by: user.id } as any);
      const { data: hd } = await supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20);
      if (hd) setPopupHistory(hd);
    }
    setSavingPopup(false);
    toast(results.some((r) => r.error) ? { title: "خطأ", variant: "destructive" } : { title: "تم الحفظ" });
  };

  // ===== معالجات الرؤية =====
  const handleSaveVisibility = async () => {
    setSavingVisibility(true);
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "student_show_grades", value: String(showGrades) }),
      supabase.from("site_settings").upsert({ id: "student_show_attendance", value: String(showAttendance) }),
      supabase.from("site_settings").upsert({ id: "student_show_behavior", value: String(showBehavior) }),
      supabase.from("site_settings").upsert({ id: "student_hidden_categories", value: JSON.stringify(hiddenCategories) }),
    ]);
    setSavingVisibility(false);
    toast(results.some((r) => r.error) ? { title: "خطأ", variant: "destructive" } : { title: "تم الحفظ" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // ===== بطاقات الإعدادات الرئيسية =====
  const settingsCards = [
    { key: "classes", icon: Users, label: "الفصول الدراسية", desc: `${classes.length} فصل`, gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/20" },
    { key: "categories", icon: GraduationCap, label: "فئات التقييم", desc: `${categories.length} فئة`, gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
    { key: "print", icon: Printer, label: "ورقة الطباعة", desc: "ترويسة التقارير", gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20", adminOnly: true },
    { key: "colors", icon: Palette, label: "ألوان الاختبارات", desc: "تخصيص الألوان", gradient: "", shadow: "", customBg: "linear-gradient(135deg, #0ea5e9, #f59e0b, #14b8a6)", adminOnly: true },
    { key: "visibility", icon: Eye, label: "عرض الطالب", desc: "التحكم بالبيانات المعروضة", gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", adminOnly: true },
    { key: "popup", icon: Megaphone, label: "رسالة منبثقة", desc: popupEnabled ? "مفعّلة" : "معطّلة", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20", adminOnly: true },
    { key: "calendar", icon: CalendarDays, label: "نوع التقويم", desc: calendarTypeLocal === "hijri" ? "هجري" : "ميلادي", gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20", adminOnly: true },
    { key: "academic_year", icon: GraduationCap, label: "العام الدراسي", desc: defaultAcademicYear, gradient: "from-cyan-500 to-blue-600", shadow: "shadow-cyan-500/20", adminOnly: true },
    { key: "academic_calendar", icon: CalendarDays, label: "التقويم الأكاديمي", desc: "الأسابيع والاختبارات", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", adminOnly: true },
    { key: "attendance_settings", icon: ClipboardCheck, label: "إعدادات التحضير", desc: attendanceOverrideLock ? "القفل معطّل" : "قفل تلقائي", gradient: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/20", adminOnly: true },
    { key: "honor_roll", icon: Trophy, label: "لوحة الشرف", desc: honorRollEnabled ? "مفعّلة" : "معطّلة", gradient: "from-amber-500 to-yellow-500", shadow: "shadow-amber-500/20", adminOnly: true },
    { key: "lesson_plans", icon: CalendarDays, label: "خطة الدروس", desc: "تخطيط الحصص الأسبوعية", gradient: "from-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20", adminOnly: false },
  ].filter((c) => !c.adminOnly || isAdmin);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">الإعدادات</h1>
          <p className="text-muted-foreground">{isAdmin ? "إدارة الفصول وفئات التقييم" : "عرض إحصائيات الفصول والتقييمات"}</p>
        </div>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> للاطلاع فقط
          </span>
        )}
      </div>

      {/* شبكة البطاقات */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
        <h2 className="text-sm font-bold text-primary tracking-wide">⚙️ الإعدادات الأساسية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {settingsCards.map((card) => (
          <button
            key={card.key}
            onClick={() => setActiveCard(activeCard === card.key ? null : card.key)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-300 text-center group",
              activeCard === card.key
                ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                : "border-border/50 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
            )}
          >
            <div
              className={cn("flex items-center justify-center h-12 w-12 rounded-xl shadow-lg text-white transition-transform duration-300 group-hover:scale-110", !card.customBg && `bg-gradient-to-br ${card.gradient} ${card.shadow}`)}
              style={card.customBg ? { background: card.customBg } : undefined}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              {card.key === "popup" && popupCountdown && (
                <div className={cn("mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block", popupCountdown === "منتهية" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>
                  ⏱ {popupCountdown === "منتهية" ? "منتهية الصلاحية" : `متبقي: ${popupCountdown}`}
                </div>
              )}
            </div>
            {activeCard === card.key && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-b-2 border-r-2 border-primary" />}
          </button>
        ))}
      </div>

      {/* ===== محتوى البطاقة النشطة ===== */}

      {/* الفصول الدراسية */}
      {activeCard === "classes" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" /> الفصول الدراسية</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog open={importClassesOpen} onOpenChange={(v) => { setImportClassesOpen(v); if (!v) setImportedClasses([]); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> استيراد من Excel</Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> استيراد الفصول من ملف Excel</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">الأعمدة المدعومة: <strong>اسم الفصل</strong> (مطلوب)، الصف، رقم الفصل</div>
                      <div className="space-y-1.5">
                        <Label>ملف Excel أو CSV</Label>
                        <Input ref={classFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleClassFileSelect} className="cursor-pointer" />
                      </div>
                      {importedClasses.length > 0 && (
                        <div className="space-y-2">
                          <Label>معاينة ({importedClasses.length} فصل)</Label>
                          <div className="max-h-[200px] overflow-auto rounded-lg border">
                            <Table>
                              <TableHeader><TableRow><TableHead className="text-right">الفصل</TableHead><TableHead className="text-right">الصف</TableHead><TableHead className="text-right">رقم الفصل</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {importedClasses.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell><Input value={c.name} onChange={(e) => { const u = [...importedClasses]; u[i] = { ...u[i], name: e.target.value }; setImportedClasses(u); }} className="h-8" /></TableCell>
                                    <TableCell>{c.grade}</TableCell>
                                    <TableCell>{c.section || "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                      {importedClasses.length > 0 && <Button onClick={handleImportClasses} disabled={importingClasses}><Download className="h-4 w-4 ml-1.5" />{importingClasses ? "جارٍ الاستيراد..." : `استيراد ${importedClasses.length} فصل`}</Button>}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> إضافة فصل</Button></DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader><DialogTitle>إضافة فصل جديد</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5"><Label>اسم الفصل</Label><Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="مثال: 1/1" /></div>
                      <div className="space-y-1.5"><Label>الصف</Label><Select value={newGrade} onValueChange={setNewGrade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>رقم الفصل</Label><Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="1" /></div>
                        <div className="space-y-1.5"><Label>السنة</Label><Input value={newYear} onChange={(e) => setNewYear(e.target.value)} /></div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                      <Button onClick={handleAddClass}><Plus className="h-4 w-4 ml-1.5" /> إضافة</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">الفصل</TableHead><TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">رقم الفصل</TableHead><TableHead className="text-right">السنة</TableHead>
                    <TableHead className="text-right">الطلاب</TableHead>
                    {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className="group" onDoubleClick={() => { if (!isAdmin) return; setEditingClassId(cls.id); setEditingClassName(cls.name); setEditingClassGrade(cls.grade); setEditingClassSection(cls.section); setEditingClassYear(cls.academic_year); }}>
                      <TableCell className="font-medium">{isAdmin && editingClassId === cls.id ? <Input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)} className="h-8 w-28" onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} /> : cls.name}</TableCell>
                      <TableCell>{isAdmin && editingClassId === cls.id ? <Select value={editingClassGrade} onValueChange={setEditingClassGrade}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select> : cls.grade}</TableCell>
                      <TableCell>{isAdmin && editingClassId === cls.id ? <Input value={editingClassSection} onChange={(e) => setEditingClassSection(e.target.value)} className="h-8 w-16" onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} /> : cls.section}</TableCell>
                      <TableCell>{isAdmin && editingClassId === cls.id ? <Input value={editingClassYear} onChange={(e) => setEditingClassYear(e.target.value)} className="h-8 w-24" onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} /> : cls.academic_year}</TableCell>
                      <TableCell>{cls.studentCount}</TableCell>
                      {isAdmin && (
                        <TableCell className="flex items-center gap-1">
                          {editingClassId === cls.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveClassEdit(cls.id)}><Check className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingClassId(null)}><X className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingClassId(cls.id); setEditingClassName(cls.name); setEditingClassGrade(cls.grade); setEditingClassSection(cls.section); setEditingClassYear(cls.academic_year); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScheduleDialogClass({ id: cls.id, name: cls.name })}><CalendarDays className="h-3.5 w-3.5" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader><AlertDialogTitle>حذف الفصل {cls.name}؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الفصل وجميع البيانات المرتبطة به.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteClass(cls.id)}>حذف</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ClassScheduleDialog open={!!scheduleDialogClass} onOpenChange={(open) => !open && setScheduleDialogClass(null)} classId={scheduleDialogClass?.id || ""} className={scheduleDialogClass?.name || ""} />
          </CardContent>
        </Card>
      )}

      {/* المكونات الفرعية المستخرجة بالكامل */}
      {activeCard === "colors" && isAdmin && <QuizColorSettings onClose={() => setActiveCard(null)} />}
      {activeCard === "honor_roll" && isAdmin && <HonorRollSettings />}
      {activeCard === "academic_calendar" && isAdmin && <AcademicCalendarSettings onClose={() => setActiveCard(null)} />}

      {activeCard === "print" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Printer className="h-5 w-5 text-primary" /> ورقة الطباعة</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><PrintHeaderEditor /></CardContent>
        </Card>
      )}

      {activeCard === "lesson_plans" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" /> خطة الدروس الأسبوعية</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><LessonPlanSettings classes={classes.map((c) => ({ id: c.id, name: c.name }))} /></CardContent>
        </Card>
      )}

      {/* نوع التقويم */}
      {activeCard === "calendar" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" /> نوع التقويم</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <p className="text-sm text-muted-foreground">اختر نوع التقويم الافتراضي لجميع الصفحات.</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: "gregorian" as const, label: "ميلادي", sub: "Gregorian", emoji: "🌍" }, { value: "hijri" as const, label: "هجري", sub: "Hijri (أم القرى)", emoji: "🕌" }].map((opt) => (
                <button key={opt.value} onClick={() => setGlobalCalendarType(opt.value)} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200", calendarTypeLocal === opt.value ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border/50 bg-card hover:border-primary/30")}>
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm font-bold text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground">{opt.sub}</span>
                  {calendarTypeLocal === opt.value && <Badge variant="default" className="text-[10px] px-2 py-0"><Check className="h-3 w-3 ml-1" /> مُفعّل</Badge>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* العام الدراسي */}
      {activeCard === "academic_year" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" /> العام الدراسي</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <Input value={defaultAcademicYear} onChange={(e) => setDefaultAcademicYear(e.target.value)} dir="ltr" className="text-center text-lg font-bold" />
            <div className="flex flex-wrap gap-2">
              {["1445-1446", "1446-1447", "1447-1448", "1448-1449"].map((yr) => (
                <button key={yr} onClick={() => setDefaultAcademicYear(yr)} className={cn("px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all", defaultAcademicYear === yr ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30")}>{yr}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button disabled={savingAcademicYear} className="gap-1.5" onClick={async () => {
                setSavingAcademicYear(true);
                await supabase.from("site_settings").upsert({ id: "default_academic_year", value: defaultAcademicYear }, { onConflict: "id" });
                setSavingAcademicYear(false);
                setNewYear(defaultAcademicYear);
                toast({ title: "تم الحفظ" });
              }}><Save className="h-4 w-4" />{savingAcademicYear ? "جارٍ الحفظ..." : "حفظ"}</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"><RotateCcw className="h-4 w-4" /> تحديث جميع الفصول ({classes.length})</Button></AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader><AlertDialogTitle>تحديث العام الدراسي لجميع الفصول؟</AlertDialogTitle><AlertDialogDescription>سيتم تغيير العام الدراسي لجميع الفصول ({classes.length}) إلى <strong>{defaultAcademicYear}</strong>.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={async () => {
                    setSavingAcademicYear(true);
                    await supabase.from("classes").update({ academic_year: defaultAcademicYear }).neq("academic_year", "__never__");
                    await supabase.from("site_settings").upsert({ id: "default_academic_year", value: defaultAcademicYear }, { onConflict: "id" });
                    setSavingAcademicYear(false);
                    setNewYear(defaultAcademicYear);
                    setClasses((prev) => prev.map((c) => ({ ...c, academic_year: defaultAcademicYear })));
                    toast({ title: "تم التحديث" });
                  }}>تحديث الكل</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* إعدادات التحضير */}
      {activeCard === "attendance_settings" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><ClipboardCheck className="h-5 w-5 text-primary" /> إعدادات التحضير</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border-2 border-border/50 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {attendanceOverrideLock ? <LockOpen className="h-6 w-6 text-warning" /> : <Lock className="h-6 w-6 text-success" />}
                  <div>
                    <h3 className="font-semibold">تجاوز القفل التلقائي</h3>
                    <p className="text-xs text-muted-foreground">{attendanceOverrideLock ? "القفل معطّل" : "القفل مفعّل"}</p>
                  </div>
                </div>
                <Button variant={attendanceOverrideLock ? "destructive" : "outline"} size="sm" disabled={savingAttendanceSettings} onClick={async () => {
                  setSavingAttendanceSettings(true);
                  const nv = !attendanceOverrideLock;
                  const { data: ex } = await supabase.from("site_settings").select("id").eq("id", "attendance_override_lock").maybeSingle();
                  if (ex) await supabase.from("site_settings").update({ value: String(nv) }).eq("id", "attendance_override_lock");
                  else await supabase.from("site_settings").insert({ id: "attendance_override_lock", value: String(nv) });
                  setAttendanceOverrideLock(nv);
                  setSavingAttendanceSettings(false);
                  toast({ title: "تم الحفظ" });
                }}>{attendanceOverrideLock ? "إعادة تفعيل القفل" : "تعطيل القفل"}</Button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> عدد الحصص الأسبوعية لكل فصل</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {classes.map((c) => {
                  const ppw = classSchedules[c.id]?.periodsPerWeek ?? 5;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
                      <span className="font-medium text-sm truncate flex-1">{c.name}</span>
                      <div className="flex items-center gap-2 mr-2">
                        <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => saveClassSchedule(c.id, Math.max(1, ppw - 1))}>−</Button>
                        <span className="w-8 text-center font-bold text-primary">{ppw}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => saveClassSchedule(c.id, Math.min(20, ppw + 1))}>+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* فئات التقييم - مبسطة */}
      {activeCard === "categories" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" /> فئات التقييم</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> إضافة فئة</Button></DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader><DialogTitle>إضافة فئة تقييم</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5"><Label>الفصل</Label><Select value={newCatClassId} onValueChange={setNewCatClassId}><SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><Label>القسم</Label><Select value={newCatGroup} onValueChange={setNewCatGroup}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="classwork">أعمال الفصل</SelectItem><SelectItem value="exam">الاختبارات</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1.5"><Label>اسم الفئة</Label><Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="مثال: اختبار شهري" /></div>
                      <div className="space-y-1.5"><Label>الدرجة القصوى</Label><Input type="number" value={newCatMaxScore} onChange={(e) => setNewCatMaxScore(parseFloat(e.target.value) || 0)} /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose><Button onClick={handleAddCategory}><Plus className="h-4 w-4 ml-1.5" /> إضافة</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                {Object.keys(editingCats).length > 0 && <Button size="sm" onClick={handleSaveCategories} disabled={savingCats} className="gap-1.5"><Save className="h-4 w-4" /> {savingCats ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>}
              </div>
            )}
            {(() => {
              const grouped = classes.map((cls) => ({ cls, cats: categories.filter((c) => c.class_id === cls.id) })).filter((g) => g.cats.length > 0);
              const groups = grouped.flatMap((g) => [
                { label: `أعمال الفصل - ${g.cls.name}`, icon: "📝", cats: g.cats.filter((c) => c.category_group === "classwork"), otherGroupKey: "exam", otherGroupLabel: "الاختبارات" },
                { label: `الاختبارات - ${g.cls.name}`, icon: "📋", cats: g.cats.filter((c) => c.category_group === "exam"), otherGroupKey: "classwork", otherGroupLabel: "أعمال الفصل" },
              ]).filter((g) => g.cats.length > 0);
              return groups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2 px-1"><span>{group.icon}</span>{group.label}</h3>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-right">الفئة</TableHead><TableHead className="text-right">الدرجة القصوى</TableHead>{isAdmin && <TableHead className="text-right">إجراءات</TableHead>}</TableRow></TableHeader>
                      <TableBody>
                        {group.cats.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{isAdmin ? <Input value={editingCats[cat.id]?.name ?? cat.name} onChange={(e) => setEditingCats((prev) => ({ ...prev, [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: e.target.value } }))} className="h-8 w-40" /> : cat.name}</TableCell>
                            <TableCell>{isAdmin ? <Input type="number" className="w-24" value={editingCats[cat.id]?.max_score ?? cat.max_score} onChange={(e) => setEditingCats((prev) => ({ ...prev, [cat.id]: { ...prev[cat.id], name: prev[cat.id]?.name ?? cat.name, max_score: parseFloat(e.target.value) || 0 } }))} /> : cat.max_score}</TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorderCategory(cat.id, "up", group.cats)} disabled={group.cats.indexOf(cat) === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorderCategory(cat.id, "down", group.cats)} disabled={group.cats.indexOf(cat) === group.cats.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-7 w-7"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader><AlertDialogTitle>حذف "{cat.name}"؟</AlertDialogTitle></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDeleteCategory(cat.id)}>حذف</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ));
            })()}
          </CardContent>
        </Card>
      )}

      {/* الظهور + الرسالة المنبثقة - بقوا inline لأنهم يحتاجون حالة مشتركة كثيرة */}
      {activeCard === "visibility" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Eye className="h-5 w-5 text-primary" /> التحكم بعرض بيانات الطالب</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-w-md">
              {[
                { key: "grades", label: "الدرجات", icon: GraduationCap, state: showGrades, setter: setShowGrades },
                { key: "attendance", label: "الحضور والغياب", icon: Users, state: showAttendance, setter: setShowAttendance },
                { key: "behavior", label: "السلوك", icon: Eye, state: showBehavior, setter: setShowBehavior },
              ].map((item) => (
                <div key={item.key} className={cn("flex items-center justify-between p-4 rounded-xl border-2 transition-all", item.state ? "border-success/40 bg-success/5" : "border-border/50 bg-muted/30")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl", item.state ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}><item.icon className="h-5 w-5" /></div>
                    <h4 className="text-sm font-bold">{item.label}</h4>
                  </div>
                  <button onClick={() => item.setter(!item.state)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", item.state ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                    {item.state ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {item.state ? "ظاهر" : "مخفي"}
                  </button>
                </div>
              ))}
            </div>
            <Button disabled={savingVisibility} className="gap-1.5" onClick={handleSaveVisibility}>
              <Save className="h-4 w-4" />{savingVisibility ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeCard === "popup" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5 text-primary" /> رسالة منبثقة للطلاب</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <Label>تفعيل الرسالة المنبثقة</Label>
              <button type="button" onClick={() => setPopupEnabled(!popupEnabled)} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", popupEnabled ? "bg-primary" : "bg-muted")}>
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm", popupEnabled ? "translate-x-1" : "translate-x-6")} />
              </button>
            </div>
            <div className="space-y-2"><Label>عنوان الرسالة</Label><Input value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)} placeholder="تنبيه مهم" /></div>
            <div className="space-y-2"><Label>نص الرسالة</Label><textarea value={popupMessage} onChange={(e) => setPopupMessage(e.target.value)} placeholder="اكتب الرسالة..." rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
            <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input type="datetime-local" value={popupExpiry} onChange={(e) => setPopupExpiry(e.target.value)} dir="ltr" className="text-right" /></div>
            <Button disabled={savingPopup} className="gap-1.5" onClick={handleSavePopup}><Save className="h-4 w-4" />{savingPopup ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </CardContent>
        </Card>
      )}

      {/* ===== الإعدادات الإضافية (المكونات المستخرجة) ===== */}
      <div className="flex items-center gap-3 mb-2 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent" />
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide">🔧 إعدادات إضافية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      </div>
      <div className="space-y-4">
        <ProfileSettings />
        {isAdmin && (
          <>
            <TeacherManagement />
            <AbsenceThresholdSettings />
            <WhatsAppTemplatesSettings />
            <SmsProviderSettings />
            <DataPurgeSettings />
            <LoginPageSettings />
          </>
        )}
      </div>
    </div>
  );
}
