import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useCalendarType } from "@/hooks/useCalendarType";

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
}

export function useSettingsData() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const { calendarType: calendarTypeLocal, setCalendarType: setGlobalCalendarType } = useCalendarType();

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNationalId, setProfileNationalId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [teachers, setTeachers] = useState<{ user_id: string; email: string; full_name: string; national_id?: string }[]>([]);

  // Letterhead
  const [letterheadUrl, setLetterheadUrl] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

  // Change own password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newOwnPassword, setNewOwnPassword] = useState("");
  const [confirmOwnPassword, setConfirmOwnPassword] = useState("");
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Academic year
  const [defaultAcademicYear, setDefaultAcademicYear] = useState("1446-1447");
  const [savingAcademicYear, setSavingAcademicYear] = useState(false);

  // New class form
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newGrade, setNewGrade] = useState("الأول الثانوي");
  const [newYear, setNewYear] = useState("1446-1447");

  // Edit class inline
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [editingClassGrade, setEditingClassGrade] = useState("");
  const [editingClassSection, setEditingClassSection] = useState("");
  const [editingClassYear, setEditingClassYear] = useState("");

  // Import classes from Excel
  const [importClassesOpen, setImportClassesOpen] = useState(false);
  const [importedClasses, setImportedClasses] = useState<{ name: string; grade: string; section: string }[]>([]);
  const [importingClasses, setImportingClasses] = useState(false);
  const classFileRef = useRef<HTMLInputElement>(null);
  const [scheduleDialogClass, setScheduleDialogClass] = useState<{ id: string; name: string } | null>(null);

  // Attendance settings
  const [attendanceOverrideLock, setAttendanceOverrideLock] = useState(false);
  const [classSchedules, setClassSchedules] = useState<Record<string, { periodsPerWeek: number; daysOfWeek: number[] }>>({});
  const [savingAttendanceSettings, setSavingAttendanceSettings] = useState(false);
  const pendingScheduleUpdates = useRef<Record<string, { periodsPerWeek: number; timeout: NodeJS.Timeout }>>({});

  // Admin read-only setting
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const [savingAdminReadOnly, setSavingAdminReadOnly] = useState(false);

  // Debounced save for class schedules
  const saveClassSchedule = useCallback(async (classId: string, newVal: number) => {
    if (pendingScheduleUpdates.current[classId]) {
      clearTimeout(pendingScheduleUpdates.current[classId].timeout);
    }
    setClassSchedules(prev => ({
      ...prev,
      [classId]: { ...prev[classId], periodsPerWeek: newVal, daysOfWeek: prev[classId]?.daysOfWeek || [0, 1, 2, 3, 4] }
    }));
    pendingScheduleUpdates.current[classId] = {
      periodsPerWeek: newVal,
      timeout: setTimeout(async () => {
        const { data: existing } = await supabase
          .from("class_schedules")
          .select("id")
          .eq("class_id", classId)
          .maybeSingle();
        if (existing) {
          await supabase.from("class_schedules").update({ periods_per_week: newVal }).eq("class_id", classId);
        } else {
          await supabase.from("class_schedules").insert({ class_id: classId, periods_per_week: newVal, days_of_week: [0, 1, 2, 3, 4] });
        }
        delete pendingScheduleUpdates.current[classId];
      }, 300)
    };
  }, []);

  // Edit category
  const [editingCats, setEditingCats] = useState<Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>>({});
  const [savingCats, setSavingCats] = useState(false);

  // SMS Provider settings
  const [smsProvider, setSmsProvider] = useState("msegat");
  const [providerUsername, setProviderUsername] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerSender, setProviderSender] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  // Login page settings
  const [loginSchoolName, setLoginSchoolName] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Quiz color settings
  const [quizColorMcq, setQuizColorMcq] = useState("#0ea5e9");
  const [quizColorTf, setQuizColorTf] = useState("#f59e0b");
  const [quizColorSelected, setQuizColorSelected] = useState("#14b8a6");
  const [savingQuizColors, setSavingQuizColors] = useState(false);

  // Student visibility settings
  const [showGrades, setShowGrades] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);
  const [showBehavior, setShowBehavior] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
  const [visibilityPeriod, setVisibilityPeriod] = useState<"p1" | "p2">("p1");
  const [studentShowDailyGrades, setStudentShowDailyGrades] = useState(true);
  const [studentShowClassworkIcons, setStudentShowClassworkIcons] = useState(true);
  const [studentClassworkIconsCount, setStudentClassworkIconsCount] = useState(10);

  // Student popup message
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupExpiry, setPopupExpiry] = useState("");
  const [popupTargetType, setPopupTargetType] = useState<"all" | "specific">("all");
  const [popupTargetClassIds, setPopupTargetClassIds] = useState<string[]>([]);
  const [savingPopup, setSavingPopup] = useState(false);
  const [popupAction, setPopupAction] = useState<string>("none");
  const [popupRepeat, setPopupRepeat] = useState<string>("none");
  const [popupHistory, setPopupHistory] = useState<{ id: string; title: string; message: string; expiry: string | null; target_type: string; target_class_ids: string[]; created_at: string }[]>([]);
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [popupCountdown, setPopupCountdown] = useState("");
  const popupExpiryNotified = useRef(false);

  // Honor Roll settings
  const [honorRollEnabled, setHonorRollEnabled] = useState(false);
  const [savingHonorRoll, setSavingHonorRoll] = useState(false);

  // Daily extra slots
  const [dailyExtraSlotsEnabled, setDailyExtraSlotsEnabled] = useState(true);
  const [dailyExtraSlotsDisabledCats, setDailyExtraSlotsDisabledCats] = useState<string[]>([]);
  const [dailyMaxSlots, setDailyMaxSlots] = useState(3);
  const [dailyMaxSlotsPerCat, setDailyMaxSlotsPerCat] = useState<Record<string, number>>({});

  // Parent portal welcome message
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
  const [parentPdfHeader, setParentPdfHeader] = useState({
    line1: "",
    line2: "",
    line3: "",
    showLogo: true,
  });

  const [absenceThreshold, setAbsenceThreshold] = useState(20);
  const [absenceAllowedSessions, setAbsenceAllowedSessions] = useState(0);
  const [absenceMode, setAbsenceMode] = useState<"percentage" | "sessions">("percentage");
  const [totalTermSessions, setTotalTermSessions] = useState(0);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // New category form
  const [newCatClassId, setNewCatClassId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [newCatMaxScore, setNewCatMaxScore] = useState(100);
  const [newCatGroup, setNewCatGroup] = useState("classwork");

  // Category class filter
  const [catClassFilter, setCatClassFilter] = useState("all");

  // Countdown timer for popup expiry
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

    const profileQuery = user
      ? supabase.from("profiles").select("full_name, phone, national_id").eq("user_id", user.id).single()
      : Promise.resolve({ data: null });

    const teachersQuery = user && isAdmin
      ? supabase.functions.invoke("manage-users", { body: { action: "list_teachers" } })
      : Promise.resolve({ data: null });

    const letterheadQuery = supabase.from("site_settings").select("value").eq("id", "print_letterhead_url").single();

    const smsQuery = isAdmin
      ? supabase.from("site_settings").select("id, value").in("id", ["sms_provider", "sms_provider_username", "sms_provider_api_key", "sms_provider_sender"])
      : Promise.resolve({ data: null });

    const loginQuery = isAdmin
      ? supabase.from("site_settings").select("id, value").in("id", ["school_name", "school_subtitle", "school_logo_url", "default_academic_year", "dashboard_title"])
      : Promise.resolve({ data: null });

    const settingsQuery = isAdmin
      ? supabase.from("site_settings").select("id, value").in("id", ["quiz_color_mcq", "quiz_color_tf", "quiz_color_selected", "student_show_grades", "student_show_attendance", "student_show_behavior", "student_hidden_categories", "student_show_daily_grades", "student_show_classwork_icons", "student_classwork_icons_count", "student_popup_enabled", "student_popup_title", "student_popup_message", "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes", "student_popup_action", "student_popup_repeat", "honor_roll_enabled", "absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions", "parent_welcome_enabled", "parent_welcome_message", "parent_show_national_id", "parent_show_grades", "parent_show_attendance", "parent_show_behavior", "parent_show_honor_roll", "parent_show_absence_warning", "parent_show_contact_teacher", "parent_grades_default_view", "parent_grades_show_percentage", "parent_grades_show_eval", "parent_grades_visible_periods", "parent_grades_hidden_categories", "parent_show_daily_grades", "parent_show_classwork_icons", "parent_classwork_icons_count", "parent_show_library", "parent_show_activities", "daily_extra_slots_enabled", "daily_extra_slots_disabled_cats", "daily_max_slots", "daily_max_slots_per_cat", "parent_pdf_header"])
      : Promise.resolve({ data: null });

    const popupHistoryQuery = isAdmin
      ? supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: null });

    const overrideQuery = isAdmin
      ? supabase.from("site_settings").select("value").eq("id", "attendance_override_lock").maybeSingle()
      : Promise.resolve({ data: null });

    const adminReadOnlyQuery = isAdmin
      ? supabase.from("site_settings").select("id, value").in("id", ["admin_read_only"])
      : Promise.resolve({ data: null });

    const schedulesQuery = isAdmin
      ? supabase.from("class_schedules").select("class_id, periods_per_week, days_of_week")
      : Promise.resolve({ data: null });

    const [
      [classesRes, catsRes, studentsRes],
      profileRes,
      teachersRes,
      lhRes,
      smsRes,
      loginRes,
      settingsRes,
      popupHistoryRes,
      overrideRes,
      schedulesRes,
      adminReadOnlyRes,
    ] = await Promise.all([
      coreQueries,
      profileQuery,
      teachersQuery,
      letterheadQuery,
      smsQuery,
      loginQuery,
      settingsQuery,
      popupHistoryQuery,
      overrideQuery,
      schedulesQuery,
      adminReadOnlyQuery,
    ]);

    // Process core data
    const classData = (classesRes.data || []) as ClassRow[];
    const studentCounts: Record<string, number> = {};
    (studentsRes.data || []).forEach((s: any) => {
      if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1;
    });
    classData.forEach((c) => (c.studentCount = studentCounts[c.id] || 0));
    setClasses(classData);

    const catData = (catsRes.data || []).map((c: any) => ({
      ...c,
      class_name: c.classes?.name || "—",
    }));
    setCategories(catData);

    const edits: Record<string, { weight: number; max_score: number }> = {};
    catData.forEach((c: GradeCategory) => {
      edits[c.id] = { weight: c.weight, max_score: c.max_score };
    });
    setEditingCats(edits);

    // Profile
    if (profileRes.data) {
      const profile = profileRes.data as any;
      setProfileName(profile.full_name || "");
      setProfilePhone(profile.phone || "");
      setProfileNationalId(profile.national_id || "");
    }

    // Teachers
    if (teachersRes.data?.teachers) {
      setTeachers(teachersRes.data.teachers);
    }

    // Letterhead
    if ((lhRes as any).data?.value) setLetterheadUrl((lhRes as any).data.value);

    // SMS
    ((smsRes as any).data || []).forEach((s: any) => {
      if (s.id === "sms_provider") setSmsProvider(s.value || "msegat");
      if (s.id === "sms_provider_username") setProviderUsername(s.value || "");
      if (s.id === "sms_provider_api_key") setProviderApiKey(s.value || "");
      if (s.id === "sms_provider_sender") setProviderSender(s.value || "");
    });

    // Login settings
    ((loginRes as any).data || []).forEach((s: any) => {
      if (s.id === "school_name") setLoginSchoolName(s.value || "");
      if (s.id === "school_subtitle") setLoginSubtitle(s.value || "");
      if (s.id === "school_logo_url") setSchoolLogoUrl(s.value || "");
      if (s.id === "dashboard_title") setDashboardTitle(s.value || "");
      if (s.id === "default_academic_year" && s.value) {
        setDefaultAcademicYear(s.value);
        setNewYear(s.value);
      }
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
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) {
            setHiddenCategories({ p1: parsed, p2: parsed });
          } else {
            setHiddenCategories({ p1: parsed.p1 || [], p2: parsed.p2 || [] });
          }
        } catch { setHiddenCategories({ p1: [], p2: [] }); }
      }
      if (s.id === "student_show_daily_grades") setStudentShowDailyGrades(s.value !== "false");
      if (s.id === "student_show_classwork_icons") setStudentShowClassworkIcons(s.value !== "false");
      if (s.id === "student_classwork_icons_count" && s.value) setStudentClassworkIconsCount(Number(s.value) || 10);
      if (s.id === "student_popup_enabled") setPopupEnabled(s.value === "true");
      if (s.id === "student_popup_title") setPopupTitle(s.value || "");
      if (s.id === "student_popup_message") setPopupMessage(s.value || "");
      if (s.id === "student_popup_expiry") setPopupExpiry(s.value || "");
      if (s.id === "student_popup_target_type") setPopupTargetType((s.value as "all" | "specific") || "all");
      if (s.id === "student_popup_target_classes" && s.value) {
        try { setPopupTargetClassIds(JSON.parse(s.value)); } catch { setPopupTargetClassIds([]); }
      }
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
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) {
            setParentGradesHiddenCategories({ global: parsed, classes: {} });
          } else if (parsed.global !== undefined) {
            setParentGradesHiddenCategories(parsed);
          } else {
            setParentGradesHiddenCategories({ global: [], classes: {} });
          }
        } catch { setParentGradesHiddenCategories({ global: [], classes: {} }); }
      }
      if (s.id === "parent_show_daily_grades") setParentShowDailyGrades(s.value === "true");
      if (s.id === "parent_show_classwork_icons") setParentShowClassworkIcons(s.value === "true");
      if (s.id === "parent_classwork_icons_count" && s.value) setParentClassworkIconsCount(Number(s.value) || 10);
      if (s.id === "daily_extra_slots_enabled") setDailyExtraSlotsEnabled(s.value !== "false");
      if (s.id === "daily_extra_slots_disabled_cats" && s.value) {
        try { setDailyExtraSlotsDisabledCats(JSON.parse(s.value)); } catch { setDailyExtraSlotsDisabledCats([]); }
      }
      if (s.id === "daily_max_slots" && s.value) setDailyMaxSlots(Number(s.value) || 3);
      if (s.id === "daily_max_slots_per_cat" && s.value) {
        try { setDailyMaxSlotsPerCat(JSON.parse(s.value)); } catch { setDailyMaxSlotsPerCat({}); }
      }
      if (s.id === "parent_pdf_header" && s.value) {
        try { setParentPdfHeader(JSON.parse(s.value)); } catch {}
      }
      if (s.id === "absence_threshold" && s.value) setAbsenceThreshold(Number(s.value) || 20);
      if (s.id === "absence_allowed_sessions" && s.value) setAbsenceAllowedSessions(Number(s.value) || 0);
      if (s.id === "absence_mode" && s.value) setAbsenceMode(s.value as "percentage" | "sessions");
      if (s.id === "total_term_sessions" && s.value) setTotalTermSessions(Number(s.value) || 0);
    });

    // Popup history
    if (popupHistoryRes.data) setPopupHistory(popupHistoryRes.data as any);

    // Attendance override
    if ((overrideRes as any).data?.value) setAttendanceOverrideLock((overrideRes as any).data.value === "true");

    // Admin read-only
    ((adminReadOnlyRes as any).data || []).forEach((s: any) => {
      if (s.id === "admin_read_only") setAdminReadOnly(s.value === "true");
    });

    // Class schedules
    const schedMap: Record<string, { periodsPerWeek: number; daysOfWeek: number[] }> = {};
    ((schedulesRes as any).data || []).forEach((s: any) => {
      schedMap[s.class_id] = { periodsPerWeek: s.periods_per_week || 5, daysOfWeek: s.days_of_week || [0, 1, 2, 3, 4] };
    });
    setClassSchedules(schedMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===== HANDLERS =====

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileName, phone: profilePhone, national_id: profileNationalId || null })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي بنجاح" });
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!newOwnPassword.trim() || !currentPassword.trim()) return;
    if (newOwnPassword !== confirmOwnPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" });
      return;
    }
    setChangingOwnPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" });
      setChangingOwnPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newOwnPassword });
    setChangingOwnPassword(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewOwnPassword("");
      setConfirmOwnPassword("");
    }
  };

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);
    const formData = new FormData();
    formData.append("file", file);
    const { data, error } = await supabase.functions.invoke("upload-letterhead", { body: formData });
    setUploadingLetterhead(false);
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل رفع الملف", variant: "destructive" });
    } else {
      setLetterheadUrl(data.url);
      toast({ title: "تم الرفع", description: "تم تحديث ورقة الطباعة بنجاح" });
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newSection.trim()) return;
    const { error } = await supabase.from("classes").insert({
      name: newClassName, section: newSection, grade: newGrade, academic_year: newYear,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت الإضافة", description: `تمت إضافة الفصل ${newClassName}` });
      setNewClassName("");
      setNewSection("");
      fetchData();
    }
  };

  const handleSaveClassEdit = async (id: string) => {
    if (!editingClassName.trim()) return;
    const { error } = await supabase.from("classes").update({
      name: editingClassName, grade: editingClassGrade, section: editingClassSection, academic_year: editingClassYear,
    }).eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التعديل", description: "تم تعديل بيانات الفصل" });
      setEditingClassId(null);
      fetchData();
    }
  };

  const startEditingClass = (cls: ClassRow) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
    setEditingClassGrade(cls.grade);
    setEditingClassSection(cls.section);
    setEditingClassYear(cls.academic_year);
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
      name: ["الفصل", "اسم الفصل", "اسم الفصل", "الفصل", "Class", "Name", "name"],
      grade: ["الصف", "المرحلة", "Grade", "grade"],
      section: ["رقم الفصل", "الفصل رقم", "رقم الفصل", "Section", "section"],
    };
    const find = (row: Record<string, any>, keys: string[]): string => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
          return String(row[key]).trim();
        }
      }
      return "";
    };
    const rows = json
      .map((row) => ({ name: find(row, columnMap.name), grade: find(row, columnMap.grade) || newGrade, section: find(row, columnMap.section) || "" }))
      .filter((r) => r.name);
    setImportedClasses(rows);
    if (classFileRef.current) classFileRef.current.value = "";
  };

  const handleImportClasses = async () => {
    if (importedClasses.length === 0) return;
    setImportingClasses(true);
    const inserts = importedClasses.map((c) => ({
      name: c.name, grade: c.grade, section: c.section || "1", academic_year: newYear,
    }));
    const { error } = await supabase.from("classes").insert(inserts);
    setImportingClasses(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت الإضافة", description: `تم استيراد ${inserts.length} فصل` });
      setImportedClasses([]);
      setImportClassesOpen(false);
      fetchData();
    }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف الفصل. فئات التقييم محفوظة ويمكن إعادة ربطها." });
      fetchData();
    }
  };

  const handleSaveCategories = async () => {
    setSavingCats(true);
    let hasError = false;

    if (catClassFilter === "all") {
      const classCats = categories.filter((c) => c.class_id !== null);
      const seen = new Map<string, GradeCategory>();
      classCats.forEach(c => { if (!seen.has(c.name)) seen.set(c.name, c); });
      const templateCats = Array.from(seen.values());

      for (const tpl of templateCats) {
        const editedVals = editingCats[tpl.id];
        const finalName = editedVals?.name || tpl.name;
        const finalMaxScore = editedVals?.max_score ?? tpl.max_score;
        const finalGroup = editedVals?.category_group || tpl.category_group;
        const originalName = tpl.name;

        const matchingCats = categories.filter((c) => c.name === originalName && c.class_id !== null);
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
          const inserts = missingClasses.map(cls => ({
            name: finalName, weight: tpl.weight, max_score: finalMaxScore, class_id: cls.id, sort_order: tpl.sort_order, category_group: finalGroup,
          }));
          const { error: insertErr } = await supabase.from("grade_categories").insert(inserts);
          if (insertErr) hasError = true;
        }
      }
      if (hasError) {
        toast({ title: "خطأ في الحفظ", variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: "تم تعميم التغييرات على جميع الفصول" });
        fetchData();
      }
    } else {
      const filtered = categories.filter((c) => c.class_id === catClassFilter);
      const updates = filtered.map((cat) => {
        const edited = editingCats[cat.id];
        const updateData: Record<string, any> = { max_score: edited?.max_score ?? cat.max_score };
        if (edited?.name) updateData.name = edited.name;
        if (edited?.category_group) updateData.category_group = edited.category_group;
        return supabase.from("grade_categories").update(updateData).eq("id", cat.id);
      });
      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast({ title: "خطأ في الحفظ", variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: "تم تحديث فئات التقييم بنجاح" });
        fetchData();
      }
    }
    setSavingCats(false);
    setEditingCats({});
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatClassId) return;

    if (newCatClassId === "all") {
      const inserts = classes.map((cls) => {
        const classCats = categories.filter((c) => c.class_id === cls.id);
        const maxOrder = classCats.length > 0 ? Math.max(...classCats.map((c) => c.sort_order)) : 0;
        return supabase.from("grade_categories").insert({
          name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: cls.id, sort_order: maxOrder + 1, category_group: newCatGroup,
        });
      });
      const results = await Promise.all(inserts);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast({ title: "خطأ", description: "فشل في الإضافة لبعض الفصول", variant: "destructive" });
      } else {
        toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}" لجميع الفصول` });
      }
    } else {
      const classCats = categories.filter((c) => c.class_id === newCatClassId);
      const maxOrder = classCats.length > 0 ? Math.max(...classCats.map((c) => c.sort_order)) : 0;
      const { error } = await supabase.from("grade_categories").insert({
        name: newCatName, weight: newCatWeight, max_score: newCatMaxScore, class_id: newCatClassId, sort_order: maxOrder + 1, category_group: newCatGroup,
      });
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}"` });
      }
    }
    setNewCatName("");
    setNewCatWeight(10);
    setNewCatMaxScore(100);
    setNewCatGroup("classwork");
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (catClassFilter === "all" && cat) {
      const matchingIds = categories.filter((c) => c.name === cat.name).map((c) => c.id);
      const deletes = matchingIds.map((mid) => supabase.from("grade_categories").delete().eq("id", mid));
      const results = await Promise.all(deletes);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast({ title: "خطأ", description: "فشل حذف بعض الفئات", variant: "destructive" });
      } else {
        toast({ title: "تم الحذف", description: `تم حذف "${cat.name}" من جميع الفصول` });
      }
    } else {
      const { error } = await supabase.from("grade_categories").delete().eq("id", id);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم الحذف" });
      }
    }
    fetchData();
  };

  const handleReassignOrphanedCategories = async (targetClassId: string) => {
    const orphaned = categories.filter((c) => c.class_id === null);
    if (!targetClassId || orphaned.length === 0) return;
    if (targetClassId === "all_classes") {
      const inserts = classes.flatMap(cls =>
        orphaned.map(cat => ({
          name: cat.name, weight: cat.weight, max_score: cat.max_score, class_id: cls.id, sort_order: cat.sort_order, category_group: cat.category_group,
        }))
      );
      const { error: insertError } = await supabase.from("grade_categories").insert(inserts);
      if (insertError) {
        toast({ title: "خطأ", description: insertError.message, variant: "destructive" });
        return;
      }
      const ids = orphaned.map(c => c.id);
      await supabase.from("grade_categories").delete().in("id", ids);
      toast({ title: "تم الربط", description: `تم ربط ${orphaned.length} فئة بجميع الفصول` });
    } else {
      const updates = orphaned.map(cat =>
        supabase.from("grade_categories").update({ class_id: targetClassId }).eq("id", cat.id)
      );
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) {
        toast({ title: "خطأ", description: "فشل ربط بعض الفئات", variant: "destructive" });
      } else {
        const className = classes.find(c => c.id === targetClassId)?.name || "";
        toast({ title: "تم الربط", description: `تم ربط ${orphaned.length} فئة بفصل ${className}` });
      }
    }
    fetchData();
  };

  const handleReorderCategory = async (catId: string, direction: "up" | "down", groupCats: GradeCategory[]) => {
    const idx = groupCats.findIndex(c => c.id === catId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;

    const catA = groupCats[idx];
    const catB = groupCats[swapIdx];

    if (catClassFilter === "all") {
      const allCatsA = categories.filter(c => c.name === catA.name);
      const allCatsB = categories.filter(c => c.name === catB.name);
      const updates = [
        ...allCatsA.map(c => supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", c.id)),
        ...allCatsB.map(c => supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", c.id)),
      ];
      await Promise.all(updates);
    } else {
      await Promise.all([
        supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", catA.id),
        supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", catB.id),
      ]);
    }
    fetchData();
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
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ إعدادات SMS", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات SMS بنجاح" });
    }
  };

  // Computed values
  const orphanedCategories = categories.filter((c) => c.class_id === null);

  const filteredCategories = catClassFilter === "all"
    ? (() => {
        const classCats = categories.filter((c) => c.class_id !== null);
        const seen = new Map<string, GradeCategory>();
        classCats.forEach(c => { if (!seen.has(c.name)) seen.set(c.name, c); });
        const uniqueCats = Array.from(seen.values()).sort((a, b) => a.sort_order - b.sort_order);
        const classNames = new Set(uniqueCats.map(c => c.name));
        const uniqueOrphaned = orphanedCategories.filter(c => !classNames.has(c.name));
        return [...uniqueCats, ...uniqueOrphaned];
      })()
    : catClassFilter === "orphaned"
      ? orphanedCategories
      : categories.filter((c) => c.class_id === catClassFilter);

  const getEffectiveGroup = (cat: GradeCategory) => editingCats[cat.id]?.category_group ?? cat.category_group;
  const classworkCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "classwork");
  const examCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "exams");

  return {
    // Auth
    isAdmin, user, role,
    // Loading
    loading,
    // Active card
    activeCard, setActiveCard,
    // Classes
    classes, newClassName, setNewClassName, newSection, setNewSection, newGrade, setNewGrade, newYear, setNewYear,
    editingClassId, setEditingClassId, editingClassName, setEditingClassName, editingClassGrade, setEditingClassGrade,
    editingClassSection, setEditingClassSection, editingClassYear, setEditingClassYear,
    importClassesOpen, setImportClassesOpen, importedClasses, setImportedClasses, importingClasses, classFileRef,
    scheduleDialogClass, setScheduleDialogClass,
    handleAddClass, handleSaveClassEdit, startEditingClass, handleClassFileSelect, handleImportClasses, handleDeleteClass,
    // Categories
    categories, editingCats, setEditingCats, savingCats, catClassFilter, setCatClassFilter,
    newCatClassId, setNewCatClassId, newCatName, setNewCatName, newCatWeight, setNewCatWeight,
    newCatMaxScore, setNewCatMaxScore, newCatGroup, setNewCatGroup,
    orphanedCategories, filteredCategories, classworkCategories, examCategories,
    handleSaveCategories, handleAddCategory, handleDeleteCategory, handleReassignOrphanedCategories, handleReorderCategory,
    // Daily extra slots
    dailyExtraSlotsEnabled, setDailyExtraSlotsEnabled, dailyExtraSlotsDisabledCats, setDailyExtraSlotsDisabledCats,
    dailyMaxSlots, setDailyMaxSlots, dailyMaxSlotsPerCat, setDailyMaxSlotsPerCat,
    // Quiz colors
    quizColorMcq, setQuizColorMcq, quizColorTf, setQuizColorTf, quizColorSelected, setQuizColorSelected, savingQuizColors, setSavingQuizColors,
    // Student visibility
    showGrades, setShowGrades, showAttendance, setShowAttendance, showBehavior, setShowBehavior,
    savingVisibility, setSavingVisibility, hiddenCategories, setHiddenCategories,
    visibilityPeriod, setVisibilityPeriod,
    studentShowDailyGrades, setStudentShowDailyGrades, studentShowClassworkIcons, setStudentShowClassworkIcons,
    studentClassworkIconsCount, setStudentClassworkIconsCount,
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
    // Attendance settings
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
    parentClassworkIconsCount, setParentClassworkIconsCount, parentPdfHeader, setParentPdfHeader,
    // Admin read-only
    adminReadOnly, setAdminReadOnly, savingAdminReadOnly, setSavingAdminReadOnly,
    // Profile
    profileName, setProfileName, profilePhone, setProfilePhone, profileNationalId, setProfileNationalId,
    savingProfile, handleSaveProfile,
    // Password
    currentPassword, setCurrentPassword, newOwnPassword, setNewOwnPassword, confirmOwnPassword, setConfirmOwnPassword,
    changingOwnPassword, handleChangeOwnPassword,
    // Letterhead
    letterheadUrl, handleUploadLetterhead, uploadingLetterhead,
    // Teachers
    teachers, setTeachers,
    // SMS
    smsProvider, setSmsProvider, providerUsername, setProviderUsername, providerApiKey, setProviderApiKey,
    providerSender, setProviderSender, savingProvider, testingSms, setTestingSms, handleSaveProvider,
    // Login
    loginSchoolName, setLoginSchoolName, loginSubtitle, setLoginSubtitle, dashboardTitle, setDashboardTitle,
    savingLogin, setSavingLogin, schoolLogoUrl, setSchoolLogoUrl, uploadingLogo, setUploadingLogo, logoInputRef,
    // Fetch
    fetchData,
  };
}
