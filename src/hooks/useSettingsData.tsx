import { useEffect, useState, useRef, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useCalendarType } from "@/hooks/useCalendarType";
import { useSettingsProfile, useSettingsClasses, useSettingsCategories, useSettingsSms } from "./useSettingsHelpers";

export interface ClassRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  academic_year: string;
  created_at: string;
  studentCount?: number;
}

export interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
  class_id: string | null;
  class_name?: string;
  category_group: string;
  is_deduction?: boolean;
}

export function useSettingsData() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const { calendarType: calendarTypeLocal, setCalendarType: setGlobalCalendarType } = useCalendarType();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = usePersistedState<string | null>("settings_active_card", null);
  const [teachers, setTeachers] = useState<{ user_id: string; email: string; full_name: string; national_id?: string }[]>([]);

  // Letterhead
  const [letterheadUrl, setLetterheadUrl] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

  // Academic year
  const [defaultAcademicYear, setDefaultAcademicYear] = useState("1446-1447");
  const [savingAcademicYear, setSavingAcademicYear] = useState(false);

  // Attendance settings
  const [attendanceOverrideLock, setAttendanceOverrideLock] = useState(false);
  const [classSchedules, setClassSchedules] = useState<Record<string, { periodsPerWeek: number; daysOfWeek: number[] }>>({});
  const [savingAttendanceSettings, setSavingAttendanceSettings] = useState(false);
  const pendingScheduleUpdates = useRef<Record<string, { periodsPerWeek: number; timeout: NodeJS.Timeout }>>({});

  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const [savingAdminReadOnly, setSavingAdminReadOnly] = useState(false);

  const saveClassSchedule = useCallback(async (classId: string, newVal: number) => {
    if (pendingScheduleUpdates.current[classId]) clearTimeout(pendingScheduleUpdates.current[classId].timeout);
    setClassSchedules(prev => ({ ...prev, [classId]: { ...prev[classId], periodsPerWeek: newVal, daysOfWeek: prev[classId]?.daysOfWeek || [0, 1, 2, 3, 4] } }));
    pendingScheduleUpdates.current[classId] = {
      periodsPerWeek: newVal,
      timeout: setTimeout(async () => {
        const { data: existing } = await supabase.from("class_schedules").select("id").eq("class_id", classId).maybeSingle();
        if (existing) await supabase.from("class_schedules").update({ periods_per_week: newVal }).eq("class_id", classId);
        else await supabase.from("class_schedules").insert({ class_id: classId, periods_per_week: newVal, days_of_week: [0, 1, 2, 3, 4] });
        delete pendingScheduleUpdates.current[classId];
      }, 300)
    };
  }, []);

  // Quiz colors
  const [quizColorMcq, setQuizColorMcq] = useState("#0ea5e9");
  const [quizColorTf, setQuizColorTf] = useState("#f59e0b");
  const [quizColorSelected, setQuizColorSelected] = useState("#14b8a6");
  const [savingQuizColors, setSavingQuizColors] = useState(false);

  // Student visibility
  const [showGrades, setShowGrades] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showBehavior, setShowBehavior] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
  const [visibilityPeriod, setVisibilityPeriod] = useState<"p1" | "p2">("p1");
  const [studentShowDailyGrades, setStudentShowDailyGrades] = useState(true);
  const [studentShowClassworkIcons, setStudentShowClassworkIcons] = useState(true);
  const [studentClassworkIconsCount, setStudentClassworkIconsCount] = useState(10);
  const [studentShowActivities, setStudentShowActivities] = useState(true);
  const [studentShowLibrary, setStudentShowLibrary] = useState(true);
  const [studentShowHonorRoll, setStudentShowHonorRoll] = useState(true);
  const [studentShowAbsenceWarning, setStudentShowAbsenceWarning] = useState(true);
  const [studentShowNationalId, setStudentShowNationalId] = useState(true);
  const [studentShowDeductions, setStudentShowDeductions] = useState(true);

  // Student welcome
  const [studentWelcomeEnabled, setStudentWelcomeEnabled] = useState(false);
  const [studentWelcomeMessage, setStudentWelcomeMessage] = useState("مرحباً بك {name}.. نتمنى لك يوماً دراسياً مميزاً!");
  const [savingStudentWelcome, setSavingStudentWelcome] = useState(false);

  // Student popup
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupExpiry, setPopupExpiry] = useState("");
  const [popupTargetType, setPopupTargetType] = useState<"all" | "specific">("all");
  const [popupTargetClassIds, setPopupTargetClassIds] = useState<string[]>([]);
  const [savingPopup, setSavingPopup] = useState(false);
  const [popupAction, setPopupAction] = useState<string>("none");
  const [popupRepeat, setPopupRepeat] = useState<string>("none");
  const [popupHistory, setPopupHistory] = useState<any[]>([]);
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [popupCountdown, setPopupCountdown] = useState("");
  const popupExpiryNotified = useRef(false);

  // Honor Roll
  const [honorRollEnabled, setHonorRollEnabled] = useState(false);
  const [savingHonorRoll, setSavingHonorRoll] = useState(false);

  // Daily extra slots
  const [dailyExtraSlotsEnabled, setDailyExtraSlotsEnabled] = useState(true);
  const [dailyExtraSlotsDisabledCats, setDailyExtraSlotsDisabledCats] = useState<string[]>([]);
  const [dailyMaxSlots, setDailyMaxSlots] = useState(3);
  const [dailyMaxSlotsPerCat, setDailyMaxSlotsPerCat] = useState<Record<string, number>>({});

  // Parent portal
  const [parentWelcomeEnabled, setParentWelcomeEnabled] = useState(true);
  const [parentWelcomeMessage, setParentWelcomeMessage] = useState("مرحباً بك ولي أمر الطالب / {name}.. أبناؤنا أمانة، ومتابعتكم سر نجاحهم.");
  const [savingParentWelcome, setSavingParentWelcome] = useState(false);
  const [parentShowNationalId, setParentShowNationalId] = useState(true);
  const [parentShowGrades, setParentShowGrades] = useState(true);
  const [parentShowAttendance, setParentShowAttendance] = useState(true);
  const [parentShowBehavior, setParentShowBehavior] = useState(true);
  const [parentShowHonorRoll, setParentShowHonorRoll] = useState(true);
  const [parentShowAbsenceWarning, setParentShowAbsenceWarning] = useState(true);
  const [parentShowContactTeacher, setParentShowContactTeacher] = useState(true);
  const [parentShowLibrary, setParentShowLibrary] = useState(true);
  const [parentShowActivities, setParentShowActivities] = useState(true);
  const [parentGradesDefaultView, setParentGradesDefaultView] = useState<"cards" | "table">("cards");
  const [parentGradesShowPercentage, setParentGradesShowPercentage] = useState(true);
  const [parentGradesShowEval, setParentGradesShowEval] = useState(true);
  const [parentGradesVisiblePeriods, setParentGradesVisiblePeriods] = useState<"both" | "1" | "2">("both");
  const [parentGradesHiddenCategories, setParentGradesHiddenCategories] = useState<{ global: string[]; classes: Record<string, string[]> }>({ global: [], classes: {} });
  const [hiddenCatScope, setHiddenCatScope] = useState<"global" | string>("global");
  const [parentShowDailyGrades, setParentShowDailyGrades] = useState(false);
  const [parentShowClassworkIcons, setParentShowClassworkIcons] = useState(false);
  const [parentClassworkIconsCount, setParentClassworkIconsCount] = useState(10);
  const [parentShowDeductions, setParentShowDeductions] = useState(true);
  const [parentPdfHeader, setParentPdfHeader] = useState({ line1: "", line2: "", line3: "", showLogo: true });

  const [absenceThreshold, setAbsenceThreshold] = useState(20);
  const [absenceAllowedSessions, setAbsenceAllowedSessions] = useState(0);
  const [absenceMode, setAbsenceMode] = useState<"percentage" | "sessions">("percentage");
  const [totalTermSessions, setTotalTermSessions] = useState(0);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Login page
  const [loginSchoolName, setLoginSchoolName] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!popupEnabled || !popupExpiry) { setPopupCountdown(""); popupExpiryNotified.current = false; return; }
    const calc = () => {
      const diff = new Date(popupExpiry).getTime() - Date.now();
      if (diff <= 0) {
        setPopupCountdown("منتهية");
        if (!popupExpiryNotified.current) {
          popupExpiryNotified.current = true;
          toast({ title: "⏰ انتهت صلاحية الرسالة المنبثقة", description: "الرسالة المنبثقة للطلاب انتهت صلاحيتها ولم تعد تظهر. يمكنك تعطيلها أو تحديث تاريخ الانتهاء.", variant: "destructive" });
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

  const fetchData = async () => {
    setLoading(true);

    const coreQueries = Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("grade_categories").select("*, classes(name)").order("sort_order"),
      supabase.from("students").select("id, class_id"),
    ]);

    const profileQuery = user ? supabase.from("profiles").select("full_name, phone, national_id").eq("user_id", user.id).single() : Promise.resolve({ data: null });
    const teachersQuery = user && isAdmin ? supabase.functions.invoke("manage-users", { body: { action: "list_teachers" } }) : Promise.resolve({ data: null });
    const letterheadQuery = supabase.from("site_settings").select("value").eq("id", "print_letterhead_url").single();
    const smsQuery = isAdmin ? supabase.from("site_settings").select("id, value").in("id", ["sms_provider", "sms_provider_username", "sms_provider_api_key", "sms_provider_sender"]) : Promise.resolve({ data: null });
    const loginQuery = isAdmin ? supabase.from("site_settings").select("id, value").in("id", ["school_name", "school_subtitle", "school_logo_url", "default_academic_year", "dashboard_title"]) : Promise.resolve({ data: null });
    const settingsQuery = isAdmin ? supabase.from("site_settings").select("id, value").in("id", ["quiz_color_mcq", "quiz_color_tf", "quiz_color_selected", "student_show_grades", "student_show_attendance", "student_show_behavior", "student_hidden_categories", "student_show_daily_grades", "student_show_classwork_icons", "student_classwork_icons_count", "student_show_activities", "student_show_library", "student_show_honor_roll", "student_show_absence_warning", "student_show_national_id", "student_show_deductions", "student_welcome_enabled", "student_welcome_message", "student_popup_enabled", "student_popup_title", "student_popup_message", "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes", "student_popup_action", "student_popup_repeat", "honor_roll_enabled", "absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions", "parent_welcome_enabled", "parent_welcome_message", "parent_show_national_id", "parent_show_grades", "parent_show_attendance", "parent_show_behavior", "parent_show_honor_roll", "parent_show_absence_warning", "parent_show_contact_teacher", "parent_grades_default_view", "parent_grades_show_percentage", "parent_grades_show_eval", "parent_grades_visible_periods", "parent_grades_hidden_categories", "parent_show_daily_grades", "parent_show_classwork_icons", "parent_classwork_icons_count", "parent_show_library", "parent_show_activities", "parent_show_deductions", "daily_extra_slots_enabled", "daily_extra_slots_disabled_cats", "daily_max_slots", "daily_max_slots_per_cat", "parent_pdf_header"]) : Promise.resolve({ data: null });
    const popupHistoryQuery = isAdmin ? supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: null });
    const overrideQuery = isAdmin ? supabase.from("site_settings").select("value").eq("id", "attendance_override_lock").maybeSingle() : Promise.resolve({ data: null });
    const adminReadOnlyQuery = isAdmin ? supabase.from("site_settings").select("id, value").in("id", ["admin_read_only"]) : Promise.resolve({ data: null });
    const schedulesQuery = isAdmin ? supabase.from("class_schedules").select("class_id, periods_per_week, days_of_week") : Promise.resolve({ data: null });

    const [
      [classesRes, catsRes, studentsRes], profileRes, teachersRes, lhRes, smsRes, loginRes, settingsRes,
      popupHistoryRes, overrideRes, schedulesRes, adminReadOnlyRes,
    ] = await Promise.all([
      coreQueries, profileQuery, teachersQuery, letterheadQuery, smsQuery, loginQuery, settingsQuery,
      popupHistoryQuery, overrideQuery, schedulesQuery, adminReadOnlyQuery,
    ]);

    // Core data
    const classData = (classesRes.data || []) as ClassRow[];
    const studentCounts: Record<string, number> = {};
    (studentsRes.data || []).forEach((s: any) => { if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1; });
    classData.forEach(c => (c.studentCount = studentCounts[c.id] || 0));
    setClasses(classData);

    const catData = (catsRes.data || []).map((c: any) => ({ ...c, class_name: c.classes?.name || "—" }));
    setCategories(catData);
    catHelpers.initEditingCats(catData);

    // Profile
    profileHelper.loadProfile((profileRes as any).data);

    // Teachers
    if ((teachersRes as any).data?.teachers) setTeachers((teachersRes as any).data.teachers);

    // Letterhead
    if ((lhRes as any).data?.value) setLetterheadUrl((lhRes as any).data.value);

    // SMS
    smsHelper.loadSms((smsRes as any).data);

    // Login settings
    ((loginRes as any).data || []).forEach((s: any) => {
      if (s.id === "school_name") setLoginSchoolName(s.value || "");
      if (s.id === "school_subtitle") setLoginSubtitle(s.value || "");
      if (s.id === "school_logo_url") setSchoolLogoUrl(s.value || "");
      if (s.id === "dashboard_title") setDashboardTitle(s.value || "");
      if (s.id === "default_academic_year" && s.value) { setDefaultAcademicYear(s.value); classHelper.newYear !== s.value && (() => {})(); }
    });

    // All settings
    ((settingsRes as any).data || []).forEach((s: any) => {
      if (s.id === "quiz_color_mcq" && s.value) setQuizColorMcq(s.value);
      if (s.id === "quiz_color_tf" && s.value) setQuizColorTf(s.value);
      if (s.id === "quiz_color_selected" && s.value) setQuizColorSelected(s.value);
      if (s.id === "student_show_grades") setShowGrades(s.value !== "false");
      if (s.id === "student_show_attendance") setShowAttendance(s.value !== "false");
      if (s.id === "student_show_behavior") setShowBehavior(s.value !== "false");
      if (s.id === "student_hidden_categories" && s.value) {
        try { const parsed = JSON.parse(s.value); if (Array.isArray(parsed)) setHiddenCategories({ p1: parsed, p2: parsed }); else setHiddenCategories({ p1: parsed.p1 || [], p2: parsed.p2 || [] }); } catch { setHiddenCategories({ p1: [], p2: [] }); }
      }
      if (s.id === "student_show_daily_grades") setStudentShowDailyGrades(s.value !== "false");
      if (s.id === "student_show_classwork_icons") setStudentShowClassworkIcons(s.value !== "false");
      if (s.id === "student_classwork_icons_count" && s.value) setStudentClassworkIconsCount(Number(s.value) || 10);
      if (s.id === "student_show_activities") setStudentShowActivities(s.value !== "false");
      if (s.id === "student_show_library") setStudentShowLibrary(s.value !== "false");
      if (s.id === "student_show_honor_roll") setStudentShowHonorRoll(s.value !== "false");
      if (s.id === "student_show_absence_warning") setStudentShowAbsenceWarning(s.value !== "false");
      if (s.id === "student_show_national_id") setStudentShowNationalId(s.value !== "false");
      if (s.id === "student_show_deductions") setStudentShowDeductions(s.value !== "false");
      if (s.id === "student_welcome_enabled") setStudentWelcomeEnabled(s.value === "true");
      if (s.id === "student_welcome_message" && s.value) setStudentWelcomeMessage(s.value);
      if (s.id === "student_popup_enabled") setPopupEnabled(s.value === "true");
      if (s.id === "student_popup_title") setPopupTitle(s.value || "");
      if (s.id === "student_popup_message") setPopupMessage(s.value || "");
      if (s.id === "student_popup_expiry") setPopupExpiry(s.value || "");
      if (s.id === "student_popup_target_type") setPopupTargetType((s.value as "all" | "specific") || "all");
      if (s.id === "student_popup_target_classes" && s.value) { try { setPopupTargetClassIds(JSON.parse(s.value)); } catch { setPopupTargetClassIds([]); } }
      if (s.id === "student_popup_action") setPopupAction(s.value || "none");
      if (s.id === "student_popup_repeat") setPopupRepeat(s.value || "none");
      if (s.id === "honor_roll_enabled") setHonorRollEnabled(s.value === "true");
      if (s.id === "parent_welcome_enabled") setParentWelcomeEnabled(s.value !== "false");
      if (s.id === "parent_welcome_message" && s.value) setParentWelcomeMessage(s.value);
      if (s.id === "parent_show_national_id") setParentShowNationalId(s.value !== "false");
      if (s.id === "parent_show_grades") setParentShowGrades(s.value !== "false");
      if (s.id === "parent_show_attendance") setParentShowAttendance(s.value !== "false");
      if (s.id === "parent_show_behavior") setParentShowBehavior(s.value !== "false");
      if (s.id === "parent_show_honor_roll") setParentShowHonorRoll(s.value !== "false");
      if (s.id === "parent_show_absence_warning") setParentShowAbsenceWarning(s.value !== "false");
      if (s.id === "parent_show_contact_teacher") setParentShowContactTeacher(s.value !== "false");
      if (s.id === "parent_show_library") setParentShowLibrary(s.value !== "false");
      if (s.id === "parent_show_activities") setParentShowActivities(s.value !== "false");
      if (s.id === "parent_grades_default_view") setParentGradesDefaultView(s.value === "table" ? "table" : "cards");
      if (s.id === "parent_grades_show_percentage") setParentGradesShowPercentage(s.value !== "false");
      if (s.id === "parent_grades_show_eval") setParentGradesShowEval(s.value !== "false");
      if (s.id === "parent_grades_visible_periods") setParentGradesVisiblePeriods((s.value as "both" | "1" | "2") || "both");
      if (s.id === "parent_grades_hidden_categories" && s.value) {
        try { const parsed = JSON.parse(s.value); if (Array.isArray(parsed)) setParentGradesHiddenCategories({ global: parsed, classes: {} }); else if (parsed.global !== undefined) setParentGradesHiddenCategories(parsed); else setParentGradesHiddenCategories({ global: [], classes: {} }); } catch { setParentGradesHiddenCategories({ global: [], classes: {} }); }
      }
      if (s.id === "parent_show_daily_grades") setParentShowDailyGrades(s.value === "true");
      if (s.id === "parent_show_classwork_icons") setParentShowClassworkIcons(s.value === "true");
      if (s.id === "parent_classwork_icons_count" && s.value) setParentClassworkIconsCount(Number(s.value) || 10);
      if (s.id === "parent_show_deductions") setParentShowDeductions(s.value !== "false");
      if (s.id === "daily_extra_slots_enabled") setDailyExtraSlotsEnabled(s.value !== "false");
      if (s.id === "daily_extra_slots_disabled_cats" && s.value) { try { setDailyExtraSlotsDisabledCats(JSON.parse(s.value)); } catch { setDailyExtraSlotsDisabledCats([]); } }
      if (s.id === "daily_max_slots" && s.value) setDailyMaxSlots(Number(s.value) || 3);
      if (s.id === "daily_max_slots_per_cat" && s.value) { try { setDailyMaxSlotsPerCat(JSON.parse(s.value)); } catch { setDailyMaxSlotsPerCat({}); } }
      if (s.id === "parent_pdf_header" && s.value) { try { setParentPdfHeader(JSON.parse(s.value)); } catch {} }
      if (s.id === "absence_threshold" && s.value) setAbsenceThreshold(Number(s.value) || 20);
      if (s.id === "absence_allowed_sessions" && s.value) setAbsenceAllowedSessions(Number(s.value) || 0);
      if (s.id === "absence_mode" && s.value) setAbsenceMode(s.value as "percentage" | "sessions");
      if (s.id === "total_term_sessions" && s.value) setTotalTermSessions(Number(s.value) || 0);
    });

    if (popupHistoryRes.data) setPopupHistory(popupHistoryRes.data as any);
    if ((overrideRes as any).data?.value) setAttendanceOverrideLock((overrideRes as any).data.value === "true");
    ((adminReadOnlyRes as any).data || []).forEach((s: any) => { if (s.id === "admin_read_only") setAdminReadOnly(s.value === "true"); });

    const schedMap: Record<string, { periodsPerWeek: number; daysOfWeek: number[] }> = {};
    ((schedulesRes as any).data || []).forEach((s: any) => { schedMap[s.class_id] = { periodsPerWeek: s.periods_per_week || 5, daysOfWeek: s.days_of_week || [0, 1, 2, 3, 4] }; });
    setClassSchedules(schedMap);

    setLoading(false);
  };

  // Sub-hooks
  const profileHelper = useSettingsProfile(user);
  const classHelper = useSettingsClasses(fetchData);
  const refreshCategoriesOnly = useCallback(async () => {
    const { data } = await supabase.from("grade_categories").select("*, classes(name)").order("sort_order");
    const catData = (data || []).map((c: any) => ({ ...c, class_name: c.classes?.name || "—" }));
    setCategories(catData);
  }, []);
  const catHelpers = useSettingsCategories(classes, categories, fetchData, refreshCategoriesOnly, setCategories);
  const smsHelper = useSettingsSms();

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLetterhead(true);
    const formData = new FormData(); formData.append("file", file);
    const { data, error } = await supabase.functions.invoke("upload-letterhead", { body: formData });
    setUploadingLetterhead(false);
    if (error || data?.error) toast({ title: "خطأ", description: data?.error || "فشل رفع الملف", variant: "destructive" });
    else { setLetterheadUrl(data.url); toast({ title: "تم الرفع", description: "تم تحديث ورقة الطباعة بنجاح" }); }
  };

  useEffect(() => { fetchData(); }, []);

  return {
    isAdmin, user, role, loading, activeCard, setActiveCard,
    // Classes
    classes, ...classHelper,
    // Categories
    categories, ...catHelpers,
    // Daily extra slots
    dailyExtraSlotsEnabled, setDailyExtraSlotsEnabled, dailyExtraSlotsDisabledCats, setDailyExtraSlotsDisabledCats,
    dailyMaxSlots, setDailyMaxSlots, dailyMaxSlotsPerCat, setDailyMaxSlotsPerCat,
    // Quiz colors
    quizColorMcq, setQuizColorMcq, quizColorTf, setQuizColorTf, quizColorSelected, setQuizColorSelected, savingQuizColors, setSavingQuizColors,
    // Student visibility
    showGrades, setShowGrades, showAttendance, setShowAttendance, showBehavior, setShowBehavior,
    savingVisibility, setSavingVisibility, hiddenCategories, setHiddenCategories, visibilityPeriod, setVisibilityPeriod,
    studentShowDailyGrades, setStudentShowDailyGrades, studentShowClassworkIcons, setStudentShowClassworkIcons,
    studentClassworkIconsCount, setStudentClassworkIconsCount,
    studentShowActivities, setStudentShowActivities, studentShowLibrary, setStudentShowLibrary,
    studentShowHonorRoll, setStudentShowHonorRoll, studentShowAbsenceWarning, setStudentShowAbsenceWarning,
    studentShowNationalId, setStudentShowNationalId,
    studentShowDeductions, setStudentShowDeductions,
    // Student welcome
    studentWelcomeEnabled, setStudentWelcomeEnabled, studentWelcomeMessage, setStudentWelcomeMessage,
    savingStudentWelcome, setSavingStudentWelcome,
    // Honor Roll
    honorRollEnabled, setHonorRollEnabled, savingHonorRoll, setSavingHonorRoll,
    // Popup
    popupEnabled, setPopupEnabled, popupMessage, setPopupMessage, popupTitle, setPopupTitle,
    popupExpiry, setPopupExpiry, popupTargetType, setPopupTargetType, popupTargetClassIds, setPopupTargetClassIds,
    savingPopup, setSavingPopup, popupAction, setPopupAction, popupRepeat, setPopupRepeat,
    popupHistory, setPopupHistory, popupPreviewOpen, setPopupPreviewOpen,
    previewTitle, setPreviewTitle, previewMessage, setPreviewMessage, popupCountdown,
    // Calendar & Year
    calendarTypeLocal, setGlobalCalendarType, defaultAcademicYear, setDefaultAcademicYear, savingAcademicYear, setSavingAcademicYear,
    // Attendance
    attendanceOverrideLock, setAttendanceOverrideLock, classSchedules, saveClassSchedule,
    savingAttendanceSettings, setSavingAttendanceSettings,
    absenceThreshold, setAbsenceThreshold, absenceAllowedSessions, setAbsenceAllowedSessions,
    absenceMode, setAbsenceMode, totalTermSessions, setTotalTermSessions, savingThreshold, setSavingThreshold,
    // Parent portal
    parentWelcomeEnabled, setParentWelcomeEnabled, parentWelcomeMessage, setParentWelcomeMessage,
    savingParentWelcome, setSavingParentWelcome,
    parentShowNationalId, setParentShowNationalId, parentShowGrades, setParentShowGrades,
    parentShowAttendance, setParentShowAttendance, parentShowBehavior, setParentShowBehavior,
    parentShowHonorRoll, setParentShowHonorRoll, parentShowAbsenceWarning, setParentShowAbsenceWarning,
    parentShowContactTeacher, setParentShowContactTeacher, parentShowLibrary, setParentShowLibrary,
    parentShowActivities, setParentShowActivities,
    parentGradesDefaultView, setParentGradesDefaultView, parentGradesShowPercentage, setParentGradesShowPercentage,
    parentGradesShowEval, setParentGradesShowEval, parentGradesVisiblePeriods, setParentGradesVisiblePeriods,
    parentGradesHiddenCategories, setParentGradesHiddenCategories, hiddenCatScope, setHiddenCatScope,
    parentShowDailyGrades, setParentShowDailyGrades, parentShowClassworkIcons, setParentShowClassworkIcons,
    parentClassworkIconsCount, setParentClassworkIconsCount, parentShowDeductions, setParentShowDeductions,
    parentPdfHeader, setParentPdfHeader,
    // Admin read-only
    adminReadOnly, setAdminReadOnly, savingAdminReadOnly, setSavingAdminReadOnly,
    // Profile
    ...profileHelper,
    // Letterhead
    letterheadUrl, handleUploadLetterhead, uploadingLetterhead,
    // Teachers
    teachers, setTeachers,
    // SMS
    ...smsHelper,
    // Login
    loginSchoolName, setLoginSchoolName, loginSubtitle, setLoginSubtitle, dashboardTitle, setDashboardTitle,
    savingLogin, setSavingLogin, schoolLogoUrl, setSchoolLogoUrl, uploadingLogo, setUploadingLogo, logoInputRef,
    // Fetch
    fetchData,
  };
}
