import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  GraduationCap,
  Users,
  Eye,
  EyeOff,
  UserCircle,
  KeyRound,
  Printer,
  Upload,
  Download,
  FileSpreadsheet,
  Pencil,
  Check,
  X,
  MessageSquare,
  Megaphone,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Palette,
  History,
  RotateCcw,
  CalendarDays,
  ClipboardCheck,
  Lock,
  LockOpen,
  Trophy,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import PrintOrientationToggle from "@/components/shared/PrintOrientationToggle";
import AcademicCalendarSettings from "@/components/dashboard/AcademicCalendarSettings";
import ClassScheduleDialog from "@/components/settings/ClassScheduleDialog";
import LessonPlanSettings from "@/components/settings/LessonPlanSettings";
import WhatsAppTemplatesSettings from "@/components/settings/WhatsAppTemplatesSettings";
import TeacherPermissionRow from "@/components/settings/TeacherPermissionRow";
import StaffLoginHistory from "@/components/settings/StaffLoginHistory";
import { useCalendarType } from "@/hooks/useCalendarType";
import { QUIZ_COLOR_OPTIONS } from "@/hooks/use-quiz-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNationalId, setProfileNationalId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Teacher password management
  const [teachers, setTeachers] = useState<{ user_id: string; email: string; full_name: string; national_id?: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // New teacher form
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherNationalId, setNewTeacherNationalId] = useState("");
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [newTeacherRole, setNewTeacherRole] = useState<"admin" | "teacher">("teacher");
  const [showNewTeacherPass, setShowNewTeacherPass] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);

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

  // Debounced save for class schedules (300ms delay)
  const saveClassSchedule = useCallback(async (classId: string, newVal: number) => {
    // Cancel any pending update for this class
    if (pendingScheduleUpdates.current[classId]) {
      clearTimeout(pendingScheduleUpdates.current[classId].timeout);
    }

    // Update UI immediately
    setClassSchedules(prev => ({
      ...prev,
      [classId]: { ...prev[classId], periodsPerWeek: newVal, daysOfWeek: prev[classId]?.daysOfWeek || [0, 1, 2, 3, 4] }
    }));

    // Schedule database update after 300ms
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

  // Absence threshold settings
  const [absenceThreshold, setAbsenceThreshold] = useState(20);
  const [absenceAllowedSessions, setAbsenceAllowedSessions] = useState(0);
  const [absenceMode, setAbsenceMode] = useState<"percentage" | "sessions">("percentage");
  const [totalTermSessions, setTotalTermSessions] = useState(0);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Countdown timer for popup expiry + admin notification
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

  // New category form
  const [newCatClassId, setNewCatClassId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [newCatMaxScore, setNewCatMaxScore] = useState(100);
  const [newCatGroup, setNewCatGroup] = useState("classwork");

  const fetchData = async () => {
    setLoading(true);
    const [classesRes, catsRes, studentsRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("grade_categories").select("*, classes(name)").order("sort_order"),
      supabase.from("students").select("id, class_id"),
    ]);

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

    // Init editing state
    const edits: Record<string, { weight: number; max_score: number }> = {};
    catData.forEach((c: GradeCategory) => {
      edits[c.id] = { weight: c.weight, max_score: c.max_score };
    });
    setEditingCats(edits);

    // Fetch profile
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, national_id")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setProfileName(profile.full_name || "");
        setProfilePhone(profile.phone || "");
        setProfileNationalId(profile.national_id || "");
      }
    }

    // Fetch teachers list for admin
    if (user && isAdmin) {
      const { data: teachersData } = await supabase.functions.invoke("manage-users", {
        body: { action: "list_teachers" },
      });
      if (teachersData?.teachers) {
        setTeachers(teachersData.teachers);
      }
    }

    // Fetch letterhead URL
    const { data: lhSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_letterhead_url")
      .single();
    if (lhSetting?.value) setLetterheadUrl(lhSetting.value);

    // Fetch SMS provider settings
    if (isAdmin) {
      const { data: smsData } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["sms_provider", "sms_provider_username", "sms_provider_api_key", "sms_provider_sender"]);
      (smsData || []).forEach((s: any) => {
        if (s.id === "sms_provider") setSmsProvider(s.value || "msegat");
        if (s.id === "sms_provider_username") setProviderUsername(s.value || "");
        if (s.id === "sms_provider_api_key") setProviderApiKey(s.value || "");
        if (s.id === "sms_provider_sender") setProviderSender(s.value || "");
      });
    }

    // Fetch login page settings
    if (isAdmin) {
      const { data: loginData } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["school_name", "school_subtitle", "school_logo_url", "default_academic_year", "dashboard_title"]);
      (loginData || []).forEach((s: any) => {
        if (s.id === "school_name") setLoginSchoolName(s.value || "");
        if (s.id === "school_subtitle") setLoginSubtitle(s.value || "");
        if (s.id === "school_logo_url") setSchoolLogoUrl(s.value || "");
        if (s.id === "dashboard_title") setDashboardTitle(s.value || "");
        if (s.id === "default_academic_year" && s.value) {
          setDefaultAcademicYear(s.value);
          setNewYear(s.value);
        }
      });
    }

    // Fetch quiz color settings & student visibility & popup
    if (isAdmin) {
      const { data: qcData } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["quiz_color_mcq", "quiz_color_tf", "quiz_color_selected", "student_show_grades", "student_show_attendance", "student_show_behavior", "student_hidden_categories", "student_popup_enabled", "student_popup_title", "student_popup_message", "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes", "student_popup_action", "student_popup_repeat", "honor_roll_enabled", "absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"]);
      (qcData || []).forEach((s: any) => {
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
        if (s.id === "absence_threshold" && s.value) setAbsenceThreshold(Number(s.value) || 20);
        if (s.id === "absence_allowed_sessions" && s.value) setAbsenceAllowedSessions(Number(s.value) || 0);
        if (s.id === "absence_mode" && s.value) setAbsenceMode(s.value as "percentage" | "sessions");
        if (s.id === "total_term_sessions" && s.value) setTotalTermSessions(Number(s.value) || 0);
      });

      // Fetch popup history
      const { data: historyData } = await supabase
        .from("popup_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (historyData) setPopupHistory(historyData as any);
      
      // Fetch attendance override lock setting
      const { data: overrideSetting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "attendance_override_lock")
        .maybeSingle();
      setAttendanceOverrideLock(overrideSetting?.value === "true");
      
      // Fetch class schedules
      const { data: schedulesData } = await supabase.from("class_schedules").select("class_id, periods_per_week, days_of_week");
      const schedulesMap: Record<string, { periodsPerWeek: number; daysOfWeek: number[] }> = {};
      (schedulesData || []).forEach((s: any) => {
        schedulesMap[s.class_id] = { periodsPerWeek: s.periods_per_week, daysOfWeek: s.days_of_week };
      });
      setClassSchedules(schedulesMap);
    }

    setLoading(false);
  };

  const handleSaveProvider = async () => {
    setSavingProvider(true);
    const updates = [
      supabase.from("site_settings").update({ value: smsProvider }).eq("id", "sms_provider"),
      supabase.from("site_settings").update({ value: providerUsername }).eq("id", "sms_provider_username"),
      supabase.from("site_settings").update({ value: providerApiKey }).eq("id", "sms_provider_api_key"),
      supabase.from("site_settings").update({ value: providerSender }).eq("id", "sms_provider_sender"),
    ];
    const results = await Promise.all(updates);
    setSavingProvider(false);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast({ title: "خطأ", description: "فشل حفظ إعدادات المزود", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات مزود SMS" });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileName,
        phone: profilePhone,
        national_id: profileNationalId || null,
      })
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

  const handleChangePassword = async () => {
    if (!selectedTeacher || !newPassword.trim()) return;
    if (newPassword.trim().length < 8) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    const teacher = teachers.find((t) => t.user_id === selectedTeacher);
    if (!teacher) return;

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "change_password", user_id: teacher.user_id, password: newPassword },
      });
      setChangingPassword(false);

      const errMsg = data?.error || (error as any)?.message || (typeof error === "string" ? error : null);
      if (errMsg) {
        toast({ title: "خطأ", description: errMsg, variant: "destructive" });
      } else {
        toast({ title: "تم التغيير", description: `تم تغيير كلمة المرور لـ ${teacher.full_name}` });
        setNewPassword("");
        setSelectedTeacher("");
      }
    } catch {
      setChangingPassword(false);
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    }
  };

  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherPassword.trim()) return;
    const email = newTeacherEmail.trim() || `teacher_${Date.now()}@auto.local`;
    setCreatingTeacher(true);

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "create_user",
        email,
        password: newTeacherPassword,
        full_name: newTeacherName,
        role: newTeacherRole,
        national_id: newTeacherNationalId.trim() || null,
      },
    });

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في إنشاء الحساب", variant: "destructive" });
      setCreatingTeacher(false);
      return;
    }

    toast({ title: "تم الإنشاء", description: `تم إنشاء حساب ${newTeacherName} بنجاح` });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherNationalId("");
    setCreatingTeacher(false);
    // Refresh only teachers list to avoid collapsing the settings panel
    const { data: teachersData } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_teachers" },
    });
    if (teachersData?.teachers) {
      setTeachers(teachersData.teachers);
    }
  };

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);

    const formData = new FormData();
    formData.append("file", file);

    const { data, error } = await supabase.functions.invoke("upload-letterhead", {
      body: formData,
    });

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
      name: newClassName,
      section: newSection,
      grade: newGrade,
      academic_year: newYear,
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
      name: editingClassName,
      grade: editingClassGrade,
      section: editingClassSection,
      academic_year: editingClassYear,
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
      .map((row) => ({
        name: find(row, columnMap.name),
        grade: find(row, columnMap.grade) || newGrade,
        section: find(row, columnMap.section) || "",
      }))
      .filter((r) => r.name);

    setImportedClasses(rows);
    if (classFileRef.current) classFileRef.current.value = "";
  };

  const handleImportClasses = async () => {
    if (importedClasses.length === 0) return;
    setImportingClasses(true);
    const inserts = importedClasses.map((c) => ({
      name: c.name,
      grade: c.grade,
      section: c.section || "1",
      academic_year: newYear,
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
      const firstClassId = classes[0]?.id;
      const templateCats = categories.filter((c) => c.class_id === firstClassId);

      for (const tpl of templateCats) {
        const editedVals = editingCats[tpl.id];
        if (!editedVals) continue;
        const originalName = tpl.name;
        const matchingCats = categories.filter((c) => c.name === originalName);
        for (const mc of matchingCats) {
          const updateData: Record<string, any> = { max_score: editedVals.max_score };
          if (editedVals.name && editedVals.name !== originalName) {
            updateData.name = editedVals.name;
          }
          if (editedVals.category_group) {
            updateData.category_group = editedVals.category_group;
          }
          const { error } = await supabase
            .from("grade_categories")
            .update(updateData)
            .eq("id", mc.id);
          if (error) hasError = true;
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
        return supabase
          .from("grade_categories")
          .update(updateData)
          .eq("id", cat.id);
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
      // Add to ALL classes
      const inserts = classes.map((cls) => {
        const classCats = categories.filter((c) => c.class_id === cls.id);
        const maxOrder = classCats.length > 0 ? Math.max(...classCats.map((c) => c.sort_order)) : 0;
        return supabase.from("grade_categories").insert({
          name: newCatName,
          weight: newCatWeight,
          max_score: newCatMaxScore,
          class_id: cls.id,
          sort_order: maxOrder + 1,
          category_group: newCatGroup,
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
        name: newCatName,
        weight: newCatWeight,
        max_score: newCatMaxScore,
        class_id: newCatClassId,
        sort_order: maxOrder + 1,
        category_group: newCatGroup,
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
      // Delete matching category name from ALL classes
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
    if (!targetClassId || orphanedCategories.length === 0) return;
    if (targetClassId === "all_classes") {
      // Reassign to all classes: for each orphaned category, create a copy in each class
      const inserts = classes.flatMap(cls => 
        orphanedCategories.map(cat => ({
          name: cat.name,
          weight: cat.weight,
          max_score: cat.max_score,
          class_id: cls.id,
          sort_order: cat.sort_order,
          category_group: cat.category_group,
        }))
      );
      const { error: insertError } = await supabase.from("grade_categories").insert(inserts);
      if (insertError) {
        toast({ title: "خطأ", description: insertError.message, variant: "destructive" });
        return;
      }
      // Delete orphaned originals
      const ids = orphanedCategories.map(c => c.id);
      await supabase.from("grade_categories").delete().in("id", ids);
      toast({ title: "تم الربط", description: `تم ربط ${orphanedCategories.length} فئة بجميع الفصول` });
    } else {
      // Reassign to specific class
      const updates = orphanedCategories.map(cat =>
        supabase.from("grade_categories").update({ class_id: targetClassId }).eq("id", cat.id)
      );
      const results = await Promise.all(updates);
      if (results.some(r => r.error)) {
        toast({ title: "خطأ", description: "فشل ربط بعض الفئات", variant: "destructive" });
      } else {
        const className = classes.find(c => c.id === targetClassId)?.name || "";
        toast({ title: "تم الربط", description: `تم ربط ${orphanedCategories.length} فئة بفصل ${className}` });
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

    // Swap sort_order values
    if (catClassFilter === "all") {
      // Apply to all classes by matching name
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

  // Filter categories by selected class
  const [catClassFilter, setCatClassFilter] = useState("all");

  // Orphaned categories (class was deleted, category preserved)
  const orphanedCategories = categories.filter((c) => c.class_id === null);

  // When "all", show unique categories by name (from first class as template), plus orphaned
  const filteredCategories = catClassFilter === "all"
    ? (() => {
        const firstClassId = classes[0]?.id;
        const classCats = firstClassId ? categories.filter((c) => c.class_id === firstClassId) : [];
        // Include orphaned categories not already represented
        const classNames = new Set(classCats.map(c => c.name));
        const uniqueOrphaned = orphanedCategories.filter(c => !classNames.has(c.name));
        return [...classCats, ...uniqueOrphaned];
      })()
    : catClassFilter === "orphaned"
      ? orphanedCategories
      : categories.filter((c) => c.class_id === catClassFilter);

  const getEffectiveGroup = (cat: GradeCategory) => editingCats[cat.id]?.category_group ?? cat.category_group;
  const classworkCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "classwork");
  const examCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "exams");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">الإعدادات</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "إدارة الفصول وفئات التقييم" : "عرض إحصائيات الفصول والتقييمات"}
          </p>
        </div>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            للاطلاع فقط
          </span>
        )}
      </div>

      {/* ===== البطاقات الرئيسية ===== */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
        <h2 className="text-sm font-bold text-primary tracking-wide">⚙️ الإعدادات الأساسية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "classes", icon: Users, label: "الفصول الدراسية", desc: `${classes.length} فصل`, gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/20" },
          { key: "categories", icon: GraduationCap, label: "فئات التقييم", desc: `${categories.length} فئة`, gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
          { key: "print", icon: Printer, label: "ورقة الطباعة", desc: "ترويسة التقارير", gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20", adminOnly: true },
          { key: "colors", icon: Palette, label: "ألوان الاختبارات", desc: "تخصيص الألوان", gradient: "", shadow: "", customBg: "linear-gradient(135deg, #0ea5e9, #f59e0b, #14b8a6)", adminOnly: true },
          { key: "visibility", icon: Eye, label: "عرض الطالب", desc: "التحكم بالبيانات المعروضة", gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", adminOnly: true },
          { key: "popup", icon: Megaphone, label: "رسالة منبثقة", desc: popupEnabled ? (popupRepeat === "daily" ? "مفعّلة · يومياً" : popupRepeat === "weekly" ? "مفعّلة · أسبوعياً" : "مفعّلة · مرة واحدة") : "معطّلة", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20", adminOnly: true },
          { key: "calendar", icon: CalendarDays, label: "نوع التقويم", desc: calendarTypeLocal === "hijri" ? "هجري" : "ميلادي", gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20", adminOnly: true },
          { key: "academic_year", icon: GraduationCap, label: "العام الدراسي", desc: defaultAcademicYear, gradient: "from-cyan-500 to-blue-600", shadow: "shadow-cyan-500/20", adminOnly: true },
          { key: "academic_calendar", icon: CalendarDays, label: "التقويم الأكاديمي", desc: "الأسابيع والاختبارات", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", adminOnly: true },
          { key: "attendance_settings", icon: ClipboardCheck, label: "إعدادات التحضير", desc: attendanceOverrideLock ? "القفل معطّل" : "قفل تلقائي", gradient: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/20", adminOnly: true },
          { key: "honor_roll", icon: Trophy, label: "لوحة الشرف", desc: honorRollEnabled ? "مفعّلة" : "معطّلة", gradient: "from-amber-500 to-yellow-500", shadow: "shadow-amber-500/20", adminOnly: true },
          { key: "lesson_plans", icon: CalendarDays, label: "خطة الدروس", desc: "تخطيط الحصص الأسبوعية", gradient: "from-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20", adminOnly: false },
        ].filter(c => !c.adminOnly || isAdmin).map((card) => (
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
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl shadow-lg text-white transition-transform duration-300 group-hover:scale-110",
                !card.customBg && `bg-gradient-to-br ${card.gradient} ${card.shadow}`
              )}
              style={card.customBg ? { background: card.customBg } : undefined}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              {card.key === "popup" && popupCountdown && (
                <div className={cn(
                  "mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                  popupCountdown === "منتهية" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                )}>
                  ⏱ {popupCountdown === "منتهية" ? "منتهية الصلاحية" : `متبقي: ${popupCountdown}`}
                </div>
              )}
            </div>
            {activeCard === card.key && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-b-2 border-r-2 border-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Active Card Content - Full Width */}
      {activeCard === "classes" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                الفصول الدراسية
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog open={importClassesOpen} onOpenChange={(v) => { setImportClassesOpen(v); if (!v) setImportedClasses([]); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Download className="h-4 w-4" />
                      استيراد من Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        استيراد الفصول من ملف Excel
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                        الأعمدة المدعومة: <strong>اسم الفصل</strong> (مطلوب)، الصف، رقم الفصل
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملف Excel أو CSV</Label>
                        <Input ref={classFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleClassFileSelect} className="cursor-pointer" />
                      </div>
                      {importedClasses.length > 0 && (
                        <div className="space-y-2">
                          <Label>معاينة ({importedClasses.length} فصل)</Label>
                          <div className="max-h-[200px] overflow-auto rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                   <TableHead className="text-right">الفصل</TableHead>
                                   <TableHead className="text-right">الصف</TableHead>
                                   <TableHead className="text-right">رقم الفصل</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importedClasses.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell>
                                      <Input
                                        value={c.name}
                                        onChange={(e) => {
                                          const updated = [...importedClasses];
                                          updated[i] = { ...updated[i], name: e.target.value };
                                          setImportedClasses(updated);
                                        }}
                                        className="h-8"
                                      />
                                    </TableCell>
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
                      <DialogClose asChild>
                        <Button variant="outline">إلغاء</Button>
                      </DialogClose>
                      {importedClasses.length > 0 && (
                        <Button onClick={handleImportClasses} disabled={importingClasses}>
                          <Download className="h-4 w-4 ml-1.5" />
                          {importingClasses ? "جارٍ الاستيراد..." : `استيراد ${importedClasses.length} فصل`}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                       إضافة فصل
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة فصل جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label>اسم الفصل</Label>
                        <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="مثال: 1/1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>الصف</Label>
                        <Select value={newGrade} onValueChange={setNewGrade}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>رقم الفصل</Label>
                          <Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>السنة</Label>
                          <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">إلغاء</Button>
                      </DialogClose>
                      <Button onClick={handleAddClass}>
                        <Plus className="h-4 w-4 ml-1.5" />
                        إضافة
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">الفصل</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">رقم الفصل</TableHead>
                    <TableHead className="text-right">السنة</TableHead>
                    <TableHead className="text-right">الطلاب</TableHead>
                    {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className="group" onDoubleClick={() => {
                      if (!isAdmin) return;
                      setEditingClassId(cls.id);
                      setEditingClassName(cls.name);
                      setEditingClassGrade(cls.grade);
                      setEditingClassSection(cls.section);
                      setEditingClassYear(cls.academic_year);
                    }}>
                      <TableCell className="font-medium">
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)} className="h-8 w-28"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.name}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Select value={editingClassGrade} onValueChange={setEditingClassGrade}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["الأول الثانوي","الثاني الثانوي","الثالث الثانوي","الأول المتوسط","الثاني المتوسط","الثالث المتوسط","الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : cls.grade}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassSection} onChange={(e) => setEditingClassSection(e.target.value)} className="h-8 w-16"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.section}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassYear} onChange={(e) => setEditingClassYear(e.target.value)} className="h-8 w-24"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.academic_year}
                      </TableCell>
                      <TableCell>{cls.studentCount}</TableCell>
                      {isAdmin && (
                        <TableCell className="flex items-center gap-1">
                          {editingClassId === cls.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveClassEdit(cls.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingClassId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title="تعديل الفصل"
                                onClick={() => startEditingClass(cls)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary"
                                title="جدول الحصص"
                                onClick={() => setScheduleDialogClass({ id: cls.id, name: cls.name })}
                              >
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                     <AlertDialogTitle>حذف الفصل {cls.name}؟</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       سيتم حذف الفصل وجميع البيانات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteClass(cls.id)}
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
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
            <ClassScheduleDialog
              open={!!scheduleDialogClass}
              onOpenChange={(open) => !open && setScheduleDialogClass(null)}
              classId={scheduleDialogClass?.id || ""}
              className={scheduleDialogClass?.name || ""}
            />
          </CardContent>
        </Card>
      )}

      {activeCard === "categories" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                فئات التقييم
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Class filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-sm font-semibold whitespace-nowrap">تطبيق على:</Label>
              <Select value={catClassFilter} onValueChange={setCatClassFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  {orphanedCategories.length > 0 && (
                    <SelectItem value="orphaned">فئات غير مرتبطة ({orphanedCategories.length})</SelectItem>
                  )}
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" />
                      استيراد من Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader><DialogTitle>استيراد فئات التقييم</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                        الأعمدة المطلوبة: <strong>اسم الفئة</strong>، <strong>الدرجة القصوى</strong>. اختياري: الترتيب، القسم
                      </div>
                      <div className="space-y-1.5">
                        <Label>الفصل الدراسي</Label>
                        <Select value={newCatClassId} onValueChange={setNewCatClassId}>
                          <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الفصول</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملف Excel أو CSV</Label>
                        <Input type="file" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !newCatClassId) return;
                          const XLSX = await import("xlsx");
                          const data = await file.arrayBuffer();
                          const wb = XLSX.read(data);
                          const ws = wb.Sheets[wb.SheetNames[0]];
                          const json: any[] = XLSX.utils.sheet_to_json(ws);
                          let order = categories.filter(c => c.class_id === newCatClassId).length;
                          for (const row of json) {
                            const name = row["اسم الفئة"] || row["name"] || row["الفئة"];
                            const max = parseFloat(row["الدرجة القصوى"] || row["max_score"] || row["الدرجة"] || 100);
                            if (!name) continue;
                            order++;
                            await supabase.from("grade_categories").insert({
                              name, max_score: max, class_id: newCatClassId, sort_order: order, category_group: "classwork", weight: 10
                            });
                          }
                          toast({ title: "تم الاستيراد", description: `تم استيراد الفئات بنجاح` });
                          fetchData();
                        }} className="cursor-pointer" />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      إضافة فئة
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader><DialogTitle>إضافة فئة تقييم</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label>الفصل الدراسي</Label>
                        <Select value={newCatClassId} onValueChange={setNewCatClassId}>
                          <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الفصول</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>القسم</Label>
                        <Select value={newCatGroup} onValueChange={setNewCatGroup}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classwork">المهام الأدائية والمشاركة والتفاعل</SelectItem>
                            <SelectItem value="exam">الاختبارات</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>اسم الفئة</Label>
                        <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="مثال: المشاركة" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>الدرجة القصوى</Label>
                        <Input type="number" value={newCatMaxScore} onChange={(e) => setNewCatMaxScore(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                      <Button onClick={handleAddCategory}><Plus className="h-4 w-4 ml-1.5" />إضافة</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {Object.keys(editingCats).length > 0 && (
                  <Button size="sm" variant="default" className="gap-1.5" onClick={handleSaveCategories} disabled={savingCats}>
                    <Save className="h-4 w-4" />
                    {savingCats ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                  </Button>
                )}
              </div>
            )}


            {/* Orphaned categories notice */}
            {isAdmin && orphanedCategories.length > 0 && catClassFilter !== "orphaned" && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300">
                    يوجد {orphanedCategories.length} فئة غير مرتبطة بفصل (محفوظة من فصول محذوفة)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select onValueChange={handleReassignOrphanedCategories}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="ربط بفصل..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_classes">جميع الفصول</SelectItem>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Section 1: المهام الأدائية والمشاركة والتفاعل */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2 px-1 text-emerald-600 dark:text-emerald-400">
                <span>📝</span>
                المهام الأدائية والمشاركة والتفاعل
              </h3>
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-50 dark:bg-emerald-900/20">
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">الدرجة القصوى</TableHead>
                      {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classworkCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-4">
                          لا توجد فئات — أضف: المشاركة، الواجبات، الأعمال والمشاريع
                        </TableCell>
                      </TableRow>
                    ) : classworkCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">
                          {isAdmin ? (
                            <Input
                              value={editingCats[cat.id]?.name ?? cat.name}
                              onChange={(e) =>
                                setEditingCats((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: e.target.value },
                                }))
                              }
                              className="h-8 w-40"
                            />
                          ) : <span>{cat.name}</span>}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Input type="number" className="w-24 h-8"
                              value={editingCats[cat.id]?.max_score ?? cat.max_score}
                              onChange={(e) =>
                                setEditingCats((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...prev[cat.id], name: prev[cat.id]?.name ?? cat.name, max_score: parseFloat(e.target.value) || 0 },
                                }))
                              }
                            />
                          ) : <span>{cat.max_score}</span>}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleReorderCategory(cat.id, "up", classworkCategories)}
                                disabled={classworkCategories.indexOf(cat) === 0} title="تحريك لأعلى">
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleReorderCategory(cat.id, "down", classworkCategories)}
                                disabled={classworkCategories.indexOf(cat) === classworkCategories.length - 1} title="تحريك لأسفل">
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                onClick={() =>
                                  setEditingCats((prev) => ({
                                    ...prev,
                                    [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: prev[cat.id]?.name ?? cat.name, category_group: "exam" },
                                  }))
                                }
                                title="نقل إلى الاختبارات">
                                ← الاختبارات
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف فئة التقييم "{cat.name}"؟</AlertDialogTitle>
                                    <AlertDialogDescription>سيتم حذف الفئة وجميع الدرجات المسجلة فيها{catClassFilter === "all" ? " من جميع الفصول" : ""}.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDeleteCategory(cat.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
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

            {/* Section 2: الاختبارات */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2 px-1 text-amber-600 dark:text-amber-400">
                <span>📋</span>
                الاختبارات
              </h3>
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-50 dark:bg-amber-900/20">
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">الدرجة القصوى</TableHead>
                      {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-4">
                          لا توجد فئات — أضف: اختبار عملي، اختبار الفترة
                        </TableCell>
                      </TableRow>
                    ) : examCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">
                          {isAdmin ? (
                            <Input
                              value={editingCats[cat.id]?.name ?? cat.name}
                              onChange={(e) =>
                                setEditingCats((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: e.target.value },
                                }))
                              }
                              className="h-8 w-40"
                            />
                          ) : <span>{cat.name}</span>}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Input type="number" className="w-24 h-8"
                              value={editingCats[cat.id]?.max_score ?? cat.max_score}
                              onChange={(e) =>
                                setEditingCats((prev) => ({
                                  ...prev,
                                  [cat.id]: { ...prev[cat.id], name: prev[cat.id]?.name ?? cat.name, max_score: parseFloat(e.target.value) || 0 },
                                }))
                              }
                            />
                          ) : <span>{cat.max_score}</span>}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleReorderCategory(cat.id, "up", examCategories)}
                                disabled={examCategories.indexOf(cat) === 0} title="تحريك لأعلى">
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleReorderCategory(cat.id, "down", examCategories)}
                                disabled={examCategories.indexOf(cat) === examCategories.length - 1} title="تحريك لأسفل">
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                onClick={() =>
                                  setEditingCats((prev) => ({
                                    ...prev,
                                    [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: prev[cat.id]?.name ?? cat.name, category_group: "classwork" },
                                  }))
                                }
                                title="نقل إلى أعمال الفصل">
                                ← المهام الأدائية
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف فئة التقييم "{cat.name}"؟</AlertDialogTitle>
                                    <AlertDialogDescription>سيتم حذف الفئة وجميع الدرجات المسجلة فيها{catClassFilter === "all" ? " من جميع الفصول" : ""}.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDeleteCategory(cat.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
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

            {catClassFilter === "all" && (
              <p className="text-xs text-muted-foreground text-center">
                💡 أي تعديل سيُطبق على جميع الفصول تلقائياً
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeCard === "print" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Printer className="h-5 w-5 text-primary" />
                ورقة الطباعة
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">اتجاه الطباعة والتصدير:</span>
              <PrintOrientationToggle />
            </div>
            <PrintHeaderEditor />
          </CardContent>
        </Card>
      )}

      {activeCard === "colors" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                ألوان الاختبارات
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* MCQ Color */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">لون أسئلة الاختيار من متعدد</Label>
                <div className="flex flex-wrap gap-2">
                  {QUIZ_COLOR_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setQuizColorMcq(opt.value)}
                      className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                        quizColorMcq === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: opt.value }}
                      title={opt.label} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: quizColorMcq }} />
                  <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === quizColorMcq)?.label || quizColorMcq}</span>
                </div>
              </div>

              {/* True/False Color */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">لون أسئلة الصح والخطأ</Label>
                <div className="flex flex-wrap gap-2">
                  {QUIZ_COLOR_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setQuizColorTf(opt.value)}
                      className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                        quizColorTf === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: opt.value }}
                      title={opt.label} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: quizColorTf }} />
                  <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === quizColorTf)?.label || quizColorTf}</span>
                </div>
              </div>

              {/* Selected Answer Color */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">لون الإجابة المختارة</Label>
                <div className="flex flex-wrap gap-2">
                  {QUIZ_COLOR_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setQuizColorSelected(opt.value)}
                      className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                        quizColorSelected === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: opt.value }}
                      title={opt.label} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: quizColorSelected }} />
                  <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === quizColorSelected)?.label || quizColorSelected}</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة:</p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorMcq }}>اختياري</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorTf }}>صح/خطأ</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorSelected }}>الإجابة</div>
              </div>
            </div>

            <Button disabled={savingQuizColors} className="gap-1.5"
              onClick={async () => {
                setSavingQuizColors(true);
                const results = await Promise.all([
                  supabase.from("site_settings").upsert({ id: "quiz_color_mcq", value: quizColorMcq }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_tf", value: quizColorTf }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_selected", value: quizColorSelected }),
                ]);
                setSavingQuizColors(false);
                if (results.some(r => r.error)) {
                  toast({ title: "خطأ", description: "فشل حفظ ألوان الاختبارات", variant: "destructive" });
                } else {
                  toast({ title: "تم الحفظ", description: "تم تحديث ألوان الاختبارات بنجاح" });
                }
              }}>
              <Save className="h-4 w-4" />
              {savingQuizColors ? "جارٍ الحفظ..." : "حفظ الألوان"}
            </Button>
          </CardContent>
        </Card>
      )}
      {activeCard === "visibility" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" />
                التحكم بعرض بيانات الطالب
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">اختر البيانات التي تريد إظهارها للطلاب عند تسجيل دخولهم</p>
            <div className="space-y-3 max-w-md">
              {[
                { key: "grades" as const, label: "الدرجات", desc: "عرض درجات الطالب وتفاصيل التقييم", icon: GraduationCap, state: showGrades, setter: setShowGrades, hasSubmenu: true },
                { key: "attendance" as const, label: "الحضور والغياب", desc: "عرض سجل الحضور والغياب", icon: Users, state: showAttendance, setter: setShowAttendance },
                { key: "behavior" as const, label: "السلوك", desc: "عرض التقييمات السلوكية", icon: Eye, state: showBehavior, setter: setShowBehavior },
              ].map((item) => (
                <div key={item.key} className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300",
                  item.state ? "border-success/40 bg-success/5" : "border-border/50 bg-muted/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-xl transition-all",
                      item.state ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{item.label}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => item.setter(!item.state)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      item.state ? "bg-success text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.state ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {item.state ? "ظاهر" : "مخفي"}
                  </button>
                </div>
              ))}
            </div>

            {/* Grade Categories Visibility per Period */}
            {showGrades && (() => {
              const uniqueNames = Array.from(new Set(categories.map(c => c.name)));
              if (uniqueNames.length === 0) return null;
              const currentHidden = hiddenCategories[visibilityPeriod];
              return (
                <div className="space-y-3 max-w-md">
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-bold text-muted-foreground">فئات التقييم المعروضة للطالب</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <p className="text-xs text-muted-foreground">حدد الفئات التي تريد إظهارها في صفحة الطالب لكل فترة بشكل مستقل.</p>

                  {/* Period Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "p1" as const, label: "الفترة الأولى" },
                      { key: "p2" as const, label: "الفترة الثانية" },
                    ]).map(p => (
                      <button
                        key={p.key}
                        onClick={() => setVisibilityPeriod(p.key)}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                          visibilityPeriod === p.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full transition-all",
                          visibilityPeriod === p.key ? "bg-primary scale-125" : "bg-muted-foreground/30"
                        )} />
                        {p.label}
                        {hiddenCategories[p.key].length > 0 && (
                          <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full font-bold">
                            {hiddenCategories[p.key].length} مخفي
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Apply to both periods button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const source = hiddenCategories[visibilityPeriod];
                      const targetPeriod = visibilityPeriod === "p1" ? "p2" : "p1";
                      setHiddenCategories(prev => ({
                        ...prev,
                        [targetPeriod]: [...source]
                      }));
                      toast({ title: "تم النسخ", description: `تم تطبيق إعدادات ${visibilityPeriod === "p1" ? "الفترة الأولى" : "الفترة الثانية"} على الفترتين` });
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    تطبيق على الفترتين
                  </Button>

                  <div className="grid grid-cols-1 gap-2">
                    {uniqueNames.map(name => {
                      const isHidden = currentHidden.includes(name);
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setHiddenCategories(prev => ({
                              ...prev,
                              [visibilityPeriod]: isHidden
                                ? prev[visibilityPeriod].filter(n => n !== name)
                                : [...prev[visibilityPeriod], name]
                            }));
                          }}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 text-right",
                            !isHidden
                              ? "border-success/40 bg-success/5"
                              : "border-border/50 bg-muted/30 opacity-70"
                          )}
                        >
                          <span className={cn("text-sm font-semibold", !isHidden ? "text-foreground" : "text-muted-foreground line-through")}>
                            {name}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold",
                            !isHidden ? "bg-success text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {!isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {!isHidden ? "ظاهر" : "مخفي"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                disabled={savingVisibility}
                className="gap-1.5"
                onClick={async () => {
                  setSavingVisibility(true);
                  const results = await Promise.all([
                    supabase.from("site_settings").upsert({ id: "student_show_grades", value: String(showGrades) }),
                    supabase.from("site_settings").upsert({ id: "student_show_attendance", value: String(showAttendance) }),
                    supabase.from("site_settings").upsert({ id: "student_show_behavior", value: String(showBehavior) }),
                    supabase.from("site_settings").upsert({ id: "student_hidden_categories", value: JSON.stringify(hiddenCategories) }),
                  ]);
                  setSavingVisibility(false);
                  if (results.some(r => r.error)) {
                    toast({ title: "خطأ", description: "فشل حفظ إعدادات العرض", variant: "destructive" });
                  } else {
                    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات عرض بيانات الطالب" });
                  }
                }}
              >
                <Save className="h-4 w-4" />
                {savingVisibility ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    إعادة ضبط الكل
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>إعادة ضبط إعدادات العرض؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم إعادة جميع إعدادات عرض بيانات الطالب للقيم الافتراضية (إظهار الكل وإزالة جميع الاستثناءات).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setShowGrades(true);
                        setShowAttendance(true);
                        setShowBehavior(true);
                        setHiddenCategories({ p1: [], p2: [] });
                        setSavingVisibility(true);
                        const results = await Promise.all([
                          supabase.from("site_settings").upsert({ id: "student_show_grades", value: "true" }),
                          supabase.from("site_settings").upsert({ id: "student_show_attendance", value: "true" }),
                          supabase.from("site_settings").upsert({ id: "student_show_behavior", value: "true" }),
                          supabase.from("site_settings").upsert({ id: "student_hidden_categories", value: JSON.stringify({ p1: [], p2: [] }) }),
                        ]);
                        setSavingVisibility(false);
                        if (results.some(r => r.error)) {
                          toast({ title: "خطأ", description: "فشل إعادة الضبط", variant: "destructive" });
                        } else {
                          toast({ title: "تم الضبط", description: "تم إعادة جميع إعدادات العرض للقيم الافتراضية" });
                        }
                      }}
                    >
                      إعادة الضبط
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {activeCard === "popup" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="h-5 w-5 text-primary" />
                رسالة منبثقة للطلاب
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <Label>تفعيل الرسالة المنبثقة</Label>
              <button
                type="button"
                onClick={() => setPopupEnabled(!popupEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  popupEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                  popupEnabled ? "translate-x-1" : "translate-x-6"
                )} />
              </button>
            </div>
            <div className="space-y-2">
              <Label>عنوان الرسالة</Label>
              <Input value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)} placeholder="مثال: تنبيه مهم" />
            </div>
            <div className="space-y-2">
              <Label>نص الرسالة</Label>
              <Textarea value={popupMessage} onChange={(e) => setPopupMessage(e.target.value)} placeholder="اكتب الرسالة التي تريد عرضها للطلاب..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ انتهاء الرسالة (اختياري)</Label>
              <Input type="datetime-local" value={popupExpiry} onChange={(e) => setPopupExpiry(e.target.value)} dir="ltr" className="text-right" />
              {popupExpiry && (
                <p className="text-xs text-muted-foreground">ستختفي الرسالة تلقائياً بعد: {new Date(popupExpiry).toLocaleString("ar-SA")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>استهداف الفصول</Label>
              <Select value={popupTargetType} onValueChange={(v: "all" | "specific") => { setPopupTargetType(v); if (v === "all") setPopupTargetClassIds([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطلاب</SelectItem>
                  <SelectItem value="specific">فصول محددة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {popupTargetType === "specific" && (
              <div className="space-y-2">
                <Label>اختر الفصول</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 max-h-40 overflow-y-auto">
                  {classes.map((c) => {
                    const isSelected = popupTargetClassIds.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setPopupTargetClassIds((prev) => isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/40 hover:border-primary/40"
                        )}
                      >{c.name}</button>
                    );
                  })}
                </div>
                {popupTargetClassIds.length > 0 && <p className="text-xs text-muted-foreground">تم اختيار {popupTargetClassIds.length} فصل</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>التوجيه عند الضغط (اختياري)</Label>
              <Select value={popupAction} onValueChange={setPopupAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون توجيه</SelectItem>
                  <SelectItem value="grades">الدرجات</SelectItem>
                  <SelectItem value="attendance">الحضور</SelectItem>
                  <SelectItem value="behavior">السلوك</SelectItem>
                  <SelectItem value="activities">الأنشطة</SelectItem>
                  <SelectItem value="library">المكتبة</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">عند اختيار وجهة، سيظهر للطالب زر للانتقال مباشرة إلى القسم المحدد</p>
            </div>
            <div className="space-y-2">
              <Label>تكرار الرسالة</Label>
              <Select value={popupRepeat} onValueChange={setPopupRepeat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تكرار (مرة واحدة)</SelectItem>
                  <SelectItem value="daily">يومياً</SelectItem>
                  <SelectItem value="weekly">أسبوعياً</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {popupRepeat === "daily" && "ستظهر الرسالة للطالب مرة واحدة كل يوم"}
                {popupRepeat === "weekly" && "ستظهر الرسالة للطالب مرة واحدة كل أسبوع"}
                {popupRepeat === "none" && "ستظهر الرسالة مرة واحدة فقط للطالب"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={savingPopup} className="gap-1.5"
                onClick={async () => {
                  setSavingPopup(true);
                  const updates = [
                    supabase.from("site_settings").upsert({ id: "student_popup_enabled", value: String(popupEnabled) }),
                    supabase.from("site_settings").upsert({ id: "student_popup_title", value: popupTitle }),
                    supabase.from("site_settings").upsert({ id: "student_popup_message", value: popupMessage }),
                    supabase.from("site_settings").upsert({ id: "student_popup_expiry", value: popupExpiry }),
                    supabase.from("site_settings").upsert({ id: "student_popup_target_type", value: popupTargetType }),
                    supabase.from("site_settings").upsert({ id: "student_popup_target_classes", value: JSON.stringify(popupTargetClassIds) }),
                    supabase.from("site_settings").upsert({ id: "student_popup_action", value: popupAction }),
                    supabase.from("site_settings").upsert({ id: "student_popup_repeat", value: popupRepeat }),
                  ];
                  const results = await Promise.all(updates);
                  if (popupTitle.trim() && popupMessage.trim() && user) {
                    await supabase.from("popup_messages").insert({
                      title: popupTitle, message: popupMessage, expiry: popupExpiry || null,
                      target_type: popupTargetType, target_class_ids: popupTargetClassIds, created_by: user.id,
                    } as any);
                    const { data: historyData } = await supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20);
                    if (historyData) setPopupHistory(historyData as any);
                  }
                  setSavingPopup(false);
                  if (results.some((r) => r.error)) {
                    toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                  } else {
                    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الرسالة المنبثقة" });
                  }
                }}>
                <Save className="h-4 w-4" />
                {savingPopup ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" className="gap-1.5"
                onClick={() => { setPreviewTitle(popupTitle); setPreviewMessage(popupMessage); setPopupPreviewOpen(true); }}
                disabled={!popupTitle.trim() && !popupMessage.trim()}>
                <Eye className="h-4 w-4" />
                معاينة
              </Button>
            </div>
            {popupHistory.length > 0 && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  سجل الرسائل السابقة
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {popupHistory.map((msg) => (
                    <div key={msg.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{new Date(msg.created_at).toLocaleDateString("ar-SA")}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.target_type === "all" ? "جميع الطلاب" : `${(msg.target_class_ids || []).length} فصل`}</Badge>
                          {msg.expiry && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ينتهي: {new Date(msg.expiry).toLocaleDateString("ar-SA")}</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7"
                          onClick={() => {
                            setPopupTitle(msg.title); setPopupMessage(msg.message); setPopupExpiry(msg.expiry || "");
                            setPopupTargetType(msg.target_type as "all" | "specific"); setPopupTargetClassIds(msg.target_class_ids || []);
                            setPopupEnabled(true); toast({ title: "تم تحميل الرسالة", description: "اضغط حفظ لتفعيلها" });
                          }}>
                          <RotateCcw className="h-3 w-3" />
                          تفعيل
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الرسالة المنبثقة؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم حذف الرسالة نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                await supabase.from("popup_messages").delete().eq("id", msg.id);
                                setPopupHistory((prev) => prev.filter((m) => m.id !== msg.id));
                                toast({ title: "تم الحذف" });
                              }}>حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeCard === "calendar" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                نوع التقويم الافتراضي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <p className="text-sm text-muted-foreground">
              اختر نوع التقويم الافتراضي الذي سيُستخدم في جميع صفحات التحضير والدرجات والتقارير.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "gregorian" as const, label: "ميلادي", sub: "Gregorian", emoji: "🌍" },
                { value: "hijri" as const, label: "هجري", sub: "Hijri (أم القرى)", emoji: "🕌" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGlobalCalendarType(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200",
                    calendarTypeLocal === opt.value
                      ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                      : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm font-bold text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground">{opt.sub}</span>
                  {calendarTypeLocal === opt.value && (
                    <Badge variant="default" className="text-[10px] px-2 py-0">
                      <Check className="h-3 w-3 ml-1" />
                      مُفعّل
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeCard === "academic_year" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                العام الدراسي الافتراضي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <p className="text-sm text-muted-foreground">
              حدد العام الدراسي الافتراضي الذي سيُستخدم عند إنشاء فصول جديدة.
            </p>
            <div className="space-y-2">
              <Label>العام الدراسي</Label>
              <Input
                value={defaultAcademicYear}
                onChange={(e) => setDefaultAcademicYear(e.target.value)}
                placeholder="مثال: 1446-1447"
                dir="ltr"
                className="text-center text-lg font-bold"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["1445-1446", "1446-1447", "1447-1448", "1448-1449"].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setDefaultAcademicYear(yr)}
                  className={cn(
                    "px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                    defaultAcademicYear === yr
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                disabled={savingAcademicYear || !defaultAcademicYear.trim()}
                className="gap-1.5"
                onClick={async () => {
                  setSavingAcademicYear(true);
                  const { error } = await supabase
                    .from("site_settings")
                    .upsert({ id: "default_academic_year", value: defaultAcademicYear }, { onConflict: "id" });
                  setSavingAcademicYear(false);
                  if (error) {
                    toast({ title: "خطأ", description: "فشل حفظ العام الدراسي", variant: "destructive" });
                  } else {
                    setNewYear(defaultAcademicYear);
                    toast({ title: "تم الحفظ", description: `العام الدراسي الافتراضي: ${defaultAcademicYear}` });
                  }
                }}
              >
                <Save className="h-4 w-4" />
                {savingAcademicYear ? "جارٍ الحفظ..." : "حفظ"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                    <RotateCcw className="h-4 w-4" />
                    تحديث جميع الفصول ({classes.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>تحديث العام الدراسي لجميع الفصول؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم تغيير العام الدراسي لجميع الفصول الموجودة ({classes.length} فصل) إلى <strong className="text-foreground">{defaultAcademicYear}</strong>. هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setSavingAcademicYear(true);
                        const { error } = await supabase
                          .from("classes")
                          .update({ academic_year: defaultAcademicYear })
                          .neq("academic_year", "__never__");
                        // Also save as default
                        await supabase
                          .from("site_settings")
                          .upsert({ id: "default_academic_year", value: defaultAcademicYear }, { onConflict: "id" });
                        setSavingAcademicYear(false);
                        if (error) {
                          toast({ title: "خطأ", description: error.message, variant: "destructive" });
                        } else {
                          setNewYear(defaultAcademicYear);
                          setClasses(prev => prev.map(c => ({ ...c, academic_year: defaultAcademicYear })));
                          toast({ title: "تم التحديث", description: `تم تغيير العام الدراسي لجميع الفصول إلى ${defaultAcademicYear}` });
                        }
                      }}
                    >
                      تحديث الكل
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {activeCard === "academic_calendar" && isAdmin && (
        <AcademicCalendarSettings onClose={() => setActiveCard(null)} />
      )}

      {/* Attendance Settings Panel */}
      {activeCard === "attendance_settings" && isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                إعدادات التحضير
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Override Lock Toggle */}
            <div className="rounded-xl border-2 border-border/50 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {attendanceOverrideLock ? (
                    <LockOpen className="h-6 w-6 text-warning" />
                  ) : (
                    <Lock className="h-6 w-6 text-success" />
                  )}
                  <div>
                    <h3 className="font-semibold">تجاوز القفل التلقائي</h3>
                    <p className="text-xs text-muted-foreground">
                      {attendanceOverrideLock 
                        ? "القفل معطّل — يمكن إضافة حصص إضافية بعد اكتمال الحد الأسبوعي"
                        : "القفل مفعّل — سيتم قفل التحضير تلقائياً عند الوصول للحد الأسبوعي"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={attendanceOverrideLock ? "destructive" : "outline"}
                  size="sm"
                  disabled={savingAttendanceSettings}
                  onClick={async () => {
                    setSavingAttendanceSettings(true);
                    const newValue = !attendanceOverrideLock;
                    const { data: existing } = await supabase
                      .from("site_settings")
                      .select("id")
                      .eq("id", "attendance_override_lock")
                      .maybeSingle();
                    if (existing) {
                      await supabase.from("site_settings").update({ value: String(newValue) }).eq("id", "attendance_override_lock");
                    } else {
                      await supabase.from("site_settings").insert({ id: "attendance_override_lock", value: String(newValue) });
                    }
                    setAttendanceOverrideLock(newValue);
                    setSavingAttendanceSettings(false);
                    toast({ title: "تم الحفظ", description: newValue ? "تم تعطيل القفل التلقائي" : "تم تفعيل القفل التلقائي" });
                  }}
                >
                  {attendanceOverrideLock ? "إعادة تفعيل القفل" : "تعطيل القفل"}
                </Button>
              </div>
            </div>

            {/* Class Periods Settings */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                عدد الحصص الأسبوعية لكل فصل
              </h3>
              <p className="text-xs text-muted-foreground">حدد عدد الحصص المطلوبة أسبوعياً لكل فصل. عند الوصول للحد، سيتم قفل التحضير تلقائياً.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {classes.map((c) => {
                  const schedule = classSchedules[c.id];
                  const periodsPerWeek = schedule?.periodsPerWeek ?? 5;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors"
                    >
                      <span className="font-medium text-sm truncate flex-1">{c.name}</span>
                      <div className="flex items-center gap-2 mr-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-xs"
                          onClick={() => {
                            const newVal = Math.max(1, periodsPerWeek - 1);
                            saveClassSchedule(c.id, newVal);
                          }}
                        >
                          −
                        </Button>
                        <span className="w-8 text-center font-bold text-primary">{periodsPerWeek}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-xs"
                          onClick={() => {
                            const newVal = Math.min(20, periodsPerWeek + 1);
                            saveClassSchedule(c.id, newVal);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Honor Roll Panel */}
      {activeCard === "honor_roll" && isAdmin && (
        <Card className="border-2 border-amber-400/30 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                لوحة الشرف
              </CardTitle>
              <Badge variant={honorRollEnabled ? "default" : "secondary"} className={cn(honorRollEnabled && "bg-amber-500 text-amber-950")}>
                {honorRollEnabled ? "مفعّلة" : "معطّلة"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/20">
                  <Crown className="h-7 w-7 text-amber-950" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-1">نظام لوحة الشرف</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    يتم عرض الطلاب المتميزين تلقائياً بناءً على المعايير التالية:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <strong>انتظام كامل:</strong> صفر غياب خلال الشهر الحالي
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <strong>درجة كاملة:</strong> في أحدث اختبار فترة
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
              <div>
                <p className="font-medium text-foreground">نشر لوحة الشرف</p>
                <p className="text-xs text-muted-foreground mt-0.5">تظهر للطلاب في صفحتهم الرئيسية</p>
              </div>
              <Button
                variant={honorRollEnabled ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-2 min-w-[100px]",
                  honorRollEnabled && "bg-amber-500 hover:bg-amber-600 text-amber-950"
                )}
                disabled={savingHonorRoll}
                onClick={async () => {
                  setSavingHonorRoll(true);
                  const newVal = !honorRollEnabled;
                  await supabase.from("site_settings").upsert({ id: "honor_roll_enabled", value: String(newVal) });
                  setHonorRollEnabled(newVal);
                  setSavingHonorRoll(false);
                  toast({ title: newVal ? "تم التفعيل" : "تم التعطيل", description: newVal ? "لوحة الشرف مرئية للطلاب الآن" : "تم إخفاء لوحة الشرف" });
                }}
              >
                {savingHonorRoll ? (
                  <span className="animate-spin">⏳</span>
                ) : honorRollEnabled ? (
                  <>
                    <Eye className="h-4 w-4" />
                    مفعّلة
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    معطّلة
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <strong>ملاحظة:</strong> يظهر شعار النجمة الماسية 💎⭐ بجانب أسماء الطلاب المتميزين في جميع أنحاء التطبيق.
              الخصوصية محفوظة: تُعرض الأسماء والإنجازات فقط، بدون درجات خاصة.
            </div>
          </CardContent>
        </Card>
      )}

      {activeCard === "lesson_plans" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                خطة الدروس الأسبوعية
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LessonPlanSettings classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
          </CardContent>
        </Card>
      )}


      <div className="flex items-center gap-3 mb-2 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent" />
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide">🔧 إعدادات إضافية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      </div>
      <div className="space-y-4">

        {/* ===== الملف الشخصي ===== */}
        <Collapsible>
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
            <CollapsibleTrigger className="w-full group">
              <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20 text-white">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-base font-bold text-foreground">الملف الشخصي</h3>
                    <p className="text-xs text-muted-foreground">تعديل بياناتك الشخصية وكلمة المرور</p>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="الاسم الكامل" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الجوال</Label>
                  <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهوية الوطنية</Label>
                  <Input value={profileNationalId} onChange={(e) => setProfileNationalId(e.target.value)}
                    placeholder="1XXXXXXXXX" dir="ltr" className="text-right" inputMode="numeric" />
                  <p className="text-xs text-muted-foreground">يُستخدم لتسجيل الدخول بدلاً من البريد الإلكتروني</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </Button>

                <div className="border-t pt-4 mt-4 space-y-4">
                  <h3 className="text-base font-semibold">تغيير كلمة المرور</h3>
                  <div className="space-y-2">
                    <Label>كلمة المرور الحالية</Label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <Input type="password" value={newOwnPassword} onChange={(e) => setNewOwnPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور الجديدة</Label>
                    <Input type="password" value={confirmOwnPassword} onChange={(e) => setConfirmOwnPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة" dir="ltr" />
                  </div>
                  <Button onClick={handleChangeOwnPassword}
                    disabled={changingOwnPassword || !currentPassword.trim() || !newOwnPassword.trim() || !confirmOwnPassword.trim()}
                    className="gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    {changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {isAdmin && (
          <>
            {/* ===== إدارة المعلمين ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20 text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">إدارة المعلمين</h3>
                        <p className="text-xs text-muted-foreground">إنشاء حسابات وإدارة كلمات المرور والصلاحيات</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{teachers.length} معلم</Badge>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-5 pt-0 space-y-6">
                    {/* قائمة المعلمين مع الصلاحيات */}
                    {teachers.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-primary" />
                          المعلمون الحاليون
                        </h4>
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-right">المعلم</TableHead>
                                <TableHead className="text-right">رقم الهوية</TableHead>
                                <TableHead className="text-center text-xs font-bold text-primary">عرض فقط</TableHead>
                                <TableHead className="text-center text-xs">الطباعة</TableHead>
                                <TableHead className="text-center text-xs">التصدير</TableHead>
                                <TableHead className="text-center text-xs">الإشعارات</TableHead>
                                <TableHead className="text-center text-xs">الحذف</TableHead>
                                <TableHead className="text-center text-xs">الدرجات</TableHead>
                                <TableHead className="text-center text-xs">التحضير</TableHead>
                                <TableHead className="text-center text-xs">عرض الدرجات</TableHead>
                                <TableHead className="text-center text-xs">عرض التقارير</TableHead>
                                <TableHead className="text-center text-xs">عرض الحضور</TableHead>
                                <TableHead className="text-center text-xs">عرض الأنشطة</TableHead>
                                <TableHead className="text-center text-xs">عرض لوحة التحكم</TableHead>
                                <TableHead className="text-center text-xs">عرض الطلاب</TableHead>
                                <TableHead className="text-center text-xs">حفظ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teachers.map((t) => (
                                <TeacherPermissionRow
                                  key={t.user_id}
                                  teacher={t}
                                  onDeleted={() => setTeachers(prev => prev.filter(tr => tr.user_id !== t.user_id))}
                                  onUpdated={(userId, newName, newNationalId) => setTeachers(prev => prev.map(tr => tr.user_id === userId ? { ...tr, full_name: newName, national_id: newNationalId } : tr))}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* إضافة معلم جديد */}
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        إضافة معلم جديد
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">الاسم الكامل</Label>
                          <Input value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="اسم المعلم" className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">رقم الهوية الوطنية</Label>
                          <Input value={newTeacherNationalId} onChange={(e) => setNewTeacherNationalId(e.target.value)}
                            placeholder="1XXXXXXXXX" dir="ltr" className="text-right h-9" inputMode="numeric" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">البريد الإلكتروني <span className="text-muted-foreground">(اختياري)</span></Label>
                          <Input type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)}
                            placeholder="teacher@school.edu.sa" dir="ltr" className="text-right h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">كلمة المرور</Label>
                          <div className="relative">
                            <Input type={showNewTeacherPass ? "text" : "password"} value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)}
                              placeholder="كلمة مرور قوية" dir="ltr" className="h-9 pl-9" />
                            <button type="button" onClick={() => setShowNewTeacherPass(!showNewTeacherPass)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showNewTeacherPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">الصلاحية</Label>
                          <Select value={newTeacherRole} onValueChange={(v: "admin" | "teacher") => setNewTeacherRole(v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="teacher">معلم</SelectItem>
                              <SelectItem value="admin">مدير (صلاحيات كاملة)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button onClick={handleCreateTeacher}
                            disabled={creatingTeacher || !newTeacherName.trim() || !newTeacherPassword.trim()}
                            className="gap-1.5 h-9 w-full" size="sm">
                            <Plus className="h-3.5 w-3.5" />
                            {creatingTeacher ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* تغيير كلمة مرور معلم */}
                    <div className="space-y-3 rounded-xl border border-border/30 bg-muted/20 p-4">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-destructive" />
                        تغيير كلمة مرور معلم
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs">اختر المعلم</Label>
                          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                            <SelectContent>
                              {teachers.map((t) => (
                                <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">كلمة المرور الجديدة</Label>
                          <div className="relative">
                            <Input type={showChangePass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="كلمة مرور جديدة" dir="ltr" className="h-9 pl-9" />
                            <button type="button" onClick={() => setShowChangePass(!showChangePass)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showChangePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <Button onClick={handleChangePassword}
                          disabled={changingPassword || !selectedTeacher || !newPassword.trim()} className="gap-1.5 h-9" size="sm">
                          <KeyRound className="h-3.5 w-3.5" />
                          {changingPassword ? "جارٍ التغيير..." : "تغيير"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== سجل دخول المعلمين ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
                        <History className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">سجل الدخول</h3>
                        <p className="text-xs text-muted-foreground">استعراض تاريخ دخول المعلمين والمديرين</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-5 px-5">
                    <StaffLoginHistory
                      teachers={teachers}
                      currentUserId={user?.id || ""}
                      currentUserName={profileName || "المدير"}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== نسبة الغياب للإنذار ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/20 text-white">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">حد إنذار الغياب</h3>
                        <p className="text-xs text-muted-foreground">تحديد نسبة الغياب التي يتم عندها إنذار الطالب وولي الأمر — الحالي: {absenceThreshold}%</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-5 pt-0 space-y-5 max-w-lg">
                    {/* Mode Toggle */}
                    <div className="space-y-2">
                      <Label>طريقة تحديد الحد</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={absenceMode === "percentage" ? "default" : "outline"}
                          size="sm"
                          className="h-9 text-xs flex-1"
                          onClick={() => setAbsenceMode("percentage")}
                        >
                          بالنسبة المئوية (%)
                        </Button>
                        <Button
                          variant={absenceMode === "sessions" ? "default" : "outline"}
                          size="sm"
                          className="h-9 text-xs flex-1"
                          onClick={() => setAbsenceMode("sessions")}
                        >
                          بعدد الحصص
                        </Button>
                      </div>
                    </div>

                    {/* Total Term Sessions */}
                    <div className="space-y-2">
                      <Label>إجمالي حصص الفصل الدراسي</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={10}
                          max={500}
                          value={totalTermSessions || ""}
                          onChange={(e) => {
                            const val = Math.min(500, Math.max(0, Number(e.target.value) || 0));
                            setTotalTermSessions(val);
                            // Auto-calculate the other field
                            if (absenceMode === "percentage" && val > 0) {
                              setAbsenceAllowedSessions(Math.round((absenceThreshold / 100) * val));
                            }
                            if (absenceMode === "sessions" && val > 0 && absenceAllowedSessions > 0) {
                              setAbsenceThreshold(Math.round((absenceAllowedSessions / val) * 100));
                            }
                          }}
                          className="w-28 text-center font-bold text-lg"
                          dir="ltr"
                          placeholder="مثال: 90"
                        />
                        <span className="text-sm text-muted-foreground">حصة</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        أدخل عدد الحصص الكلي للفصل الدراسي لتفعيل الحساب التلقائي بين النسبة وعدد الحصص
                      </p>
                    </div>

                    {/* Percentage Field */}
                    <div className="space-y-2">
                      <Label>نسبة الغياب المسموح بها (%)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={5}
                          max={50}
                          value={absenceThreshold}
                          onChange={(e) => {
                            const val = Math.min(50, Math.max(5, Number(e.target.value) || 20));
                            setAbsenceThreshold(val);
                            if (totalTermSessions > 0) {
                              setAbsenceAllowedSessions(Math.round((val / 100) * totalTermSessions));
                            }
                          }}
                          className={cn("w-24 text-center font-bold text-lg", absenceMode === "percentage" && "ring-2 ring-primary")}
                          dir="ltr"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[10, 15, 20, 25, 30].map((v) => (
                          <Button
                            key={v}
                            variant={absenceThreshold === v ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setAbsenceThreshold(v);
                              if (totalTermSessions > 0) {
                                setAbsenceAllowedSessions(Math.round((v / 100) * totalTermSessions));
                              }
                            }}
                          >
                            {v}%
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Sessions Field */}
                    <div className="space-y-2">
                      <Label>عدد الحصص المسموح بها</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={absenceAllowedSessions || ""}
                          onChange={(e) => {
                            const val = Math.min(200, Math.max(0, Number(e.target.value) || 0));
                            setAbsenceAllowedSessions(val);
                            if (totalTermSessions > 0 && val > 0) {
                              setAbsenceThreshold(Math.round((val / totalTermSessions) * 100));
                            }
                          }}
                          className={cn("w-24 text-center font-bold text-lg", absenceMode === "sessions" && "ring-2 ring-primary")}
                          dir="ltr"
                          placeholder="مثال: 5"
                        />
                        <span className="text-sm text-muted-foreground">حصة</span>
                      </div>
                      {totalTermSessions > 0 && absenceAllowedSessions > 0 && (
                        <p className="text-xs text-info font-medium">
                          = {Math.round((absenceAllowedSessions / totalTermSessions) * 100)}% من إجمالي {totalTermSessions} حصة
                        </p>
                      )}
                    </div>

                    {/* Blocking Warning */}
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                      <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        إجراء تلقائي عند التجاوز
                      </p>
                      <p className="text-xs text-muted-foreground">
                        عند تجاوز الطالب عدد الحصص المسموح بها ({absenceAllowedSessions > 0 ? `${absenceAllowedSessions} حصة` : `${absenceThreshold}%`})،
                        يتم تحويل حالته تلقائياً إلى <strong className="text-destructive">"محروم من دخول الاختبار"</strong> ويظهر تنبيه بارز في صفحات التحضير والطلاب.
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      عند تجاوز الطالب هذا الحد يظهر تنبيه في تقارير الحضور وإنذارات الغياب. القيمة الافتراضية حسب نظام وزارة التعليم: 20%
                    </p>

                    <Button
                      onClick={async () => {
                        setSavingThreshold(true);
                        await Promise.all([
                          supabase.from("site_settings").upsert({ id: "absence_threshold", value: String(absenceThreshold) }),
                          supabase.from("site_settings").upsert({ id: "absence_allowed_sessions", value: String(absenceAllowedSessions) }),
                          supabase.from("site_settings").upsert({ id: "absence_mode", value: absenceMode }),
                          supabase.from("site_settings").upsert({ id: "total_term_sessions", value: String(totalTermSessions) }),
                        ]);
                        setSavingThreshold(false);
                        toast({ title: "تم الحفظ", description: `تم تعيين حد الإنذار: ${absenceMode === "sessions" && absenceAllowedSessions > 0 ? `${absenceAllowedSessions} حصة` : `${absenceThreshold}%`}` });
                      }}
                      disabled={savingThreshold}
                      className="gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      {savingThreshold ? "جارٍ الحفظ..." : "حفظ"}
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== قوالب واتساب ===== */}
            <WhatsAppTemplatesSettings />

            {/* ===== مزود SMS ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">إعدادات مزود خدمة SMS</h3>
                        <p className="text-xs text-muted-foreground">ربط مزود الرسائل النصية</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label>المزود</Label>
                      <Select value={smsProvider} onValueChange={setSmsProvider}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="msegat">MSEGAT</SelectItem>
                          <SelectItem value="unifonic">Unifonic</SelectItem>
                          <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {smsProvider === "msegat" && (
                      <div className="space-y-2">
                        <Label>اسم المستخدم</Label>
                        <Input value={providerUsername} onChange={(e) => setProviderUsername(e.target.value)}
                          placeholder="اسم مستخدم MSEGAT" dir="ltr" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>
                        {smsProvider === "msegat" ? "مفتاح API" : smsProvider === "unifonic" ? "App SID" : "Bearer Token"}
                      </Label>
                      <Input type="password" value={providerApiKey} onChange={(e) => setProviderApiKey(e.target.value)}
                        placeholder={smsProvider === "unifonic" ? "App SID" : smsProvider === "taqnyat" ? "Bearer Token" : "API Key"} dir="ltr" />
                    </div>

                    <div className="space-y-2">
                      <Label>اسم المرسل (Sender ID)</Label>
                      <Input value={providerSender} onChange={(e) => setProviderSender(e.target.value)}
                        placeholder="Sender Name" dir="ltr" />
                      {smsProvider === "unifonic" && (
                        <p className="text-xs text-muted-foreground">اختياري - سيُستخدم الافتراضي إن ترك فارغاً</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button onClick={handleSaveProvider} disabled={savingProvider} className="gap-1.5">
                        <Save className="h-4 w-4" />
                        {savingProvider ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                      </Button>
                      <Button variant="outline" disabled={testingSms || !providerApiKey || !providerSender} className="gap-1.5"
                        onClick={async () => {
                          setTestingSms(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("send-sms", {
                              body: { phone: providerSender, message: "رسالة اختبارية من النظام - Test SMS" },
                            });
                            if (error) {
                              toast({ title: "فشل الاختبار", description: error.message, variant: "destructive" });
                            } else if (data?.success) {
                              toast({ title: "نجح الاختبار ✅", description: "تم إرسال الرسالة الاختبارية بنجاح" });
                            } else {
                              toast({ title: "فشل الاختبار", description: data?.error || "لم يتم الإرسال", variant: "destructive" });
                            }
                          } catch (err: any) {
                            toast({ title: "خطأ", description: err.message, variant: "destructive" });
                          }
                          setTestingSms(false);
                        }}>
                        <MessageSquare className="h-4 w-4" />
                        {testingSms ? "جارٍ الاختبار..." : "اختبار الاتصال"}
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== تفريغ البيانات ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden border-destructive/20">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20 text-white">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">تفريغ البيانات</h3>
                        <p className="text-xs text-muted-foreground">حذف جميع سجلات الدرجات أو الحضور</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-5 pt-0 space-y-4">
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>تحذير: هذه العمليات لا يمكن التراجع عنها. تأكد قبل المتابعة.</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* تفريغ الدرجات */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ جميع الدرجات
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ جميع الدرجات
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> سجلات الدرجات (اليومية والتراكمية) لكل الطلاب والفصول بشكل نهائي. هل أنت متأكد؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const r1 = await supabase.from("grades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const r2 = await supabase.from("manual_category_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                if (r1.error || r2.error) {
                                  toast({ title: "خطأ", description: r1.error?.message || r2.error?.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات الدرجات بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ الدرجات
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* تفريغ الحضور */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ جميع الحضور
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ جميع سجلات الحضور
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> سجلات الحضور والغياب لكل الطلاب والفصول بشكل نهائي. هل أنت متأكد؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const { error } = await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                if (error) {
                                  toast({ title: "خطأ", description: error.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات الحضور بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ الحضور
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* تفريغ السلوك */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ سجلات السلوك
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ سجلات السلوك
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> سجلات السلوك (الإيجابية والسلبية) لكل الطلاب بشكل نهائي.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const { error } = await supabase.from("behavior_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                if (error) {
                                  toast({ title: "خطأ", description: error.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات السلوك بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ السلوك
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* تفريغ الإشعارات */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ الإشعارات
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ جميع الإشعارات
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> الإشعارات المرسلة لأولياء الأمور بشكل نهائي.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                if (error) {
                                  toast({ title: "خطأ", description: error.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الإشعارات بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ الإشعارات
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* تفريغ الأنشطة */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ الأنشطة والاختبارات
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ الأنشطة والاختبارات
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> الأنشطة والاختبارات وتسليمات الطلاب بشكل نهائي.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const r1 = await supabase.from("quiz_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const r2 = await supabase.from("student_file_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const r3 = await supabase.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const r4 = await supabase.from("activity_class_targets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const r5 = await supabase.from("teacher_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                const err = r1.error || r2.error || r3.error || r4.error || r5.error;
                                if (err) {
                                  toast({ title: "خطأ", description: err.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الأنشطة والاختبارات بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ الأنشطة
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* تفريغ الإعلانات */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                            تفريغ الإعلانات
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              تأكيد تفريغ الإعلانات
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف <strong>جميع</strong> الإعلانات المنشورة بشكل نهائي.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const { error } = await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                                if (error) {
                                  toast({ title: "خطأ", description: error.message, variant: "destructive" });
                                } else {
                                  toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الإعلانات بنجاح" });
                                }
                              }}
                            >
                              نعم، تفريغ الإعلانات
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Popup Preview Dialog */}
            <Dialog open={popupPreviewOpen} onOpenChange={setPopupPreviewOpen}>
              <DialogContent dir="rtl" className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="h-7 w-7 text-white" />
                  </div>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                      {previewTitle || "رسالة من الإدارة"}
                    </DialogTitle>
                  </DialogHeader>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-center">{previewMessage}</p>
                  <DialogFooter>
                    <Button onClick={() => setPopupPreviewOpen(false)} className="w-full rounded-2xl h-11 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90">
                      حسناً
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            {/* ===== صفحة الدخول ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 text-white">
                        <SettingsIcon className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-bold text-foreground">إعدادات صفحة تسجيل الدخول</h3>
                        <p className="text-xs text-muted-foreground">تخصيص شعار واسم المدرسة</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
                    {/* School Logo Upload */}
                    <div className="space-y-2">
                      <Label>شعار المدرسة</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                          {schoolLogoUrl ? (
                            <img src={schoolLogoUrl} alt="شعار المدرسة" className="h-full w-full object-cover rounded-xl" />
                          ) : (
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingLogo(true);
                              const filePath = `school-logo-${Date.now()}.${file.name.split('.').pop()}`;
                              const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
                              if (uploadError) {
                                toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" });
                                setUploadingLogo(false);
                                return;
                              }
                              const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
                              const logoUrl = urlData.publicUrl;
                              await supabase.from("site_settings").upsert({ id: "school_logo_url", value: logoUrl });
                              setSchoolLogoUrl(logoUrl);
                              setUploadingLogo(false);
                              toast({ title: "تم رفع الشعار بنجاح" });
                              e.target.value = "";
                            }} />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingLogo}
                            onClick={() => logoInputRef.current?.click()} className="gap-1.5">
                            <Upload className="h-4 w-4" />
                            {uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
                          </Button>
                          {schoolLogoUrl && (
                            <Button type="button" variant="ghost" size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={async () => {
                                await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" });
                                setSchoolLogoUrl("");
                                toast({ title: "تم إزالة الشعار", description: "سيتم استخدام الشعار الافتراضي" });
                              }}>
                              <Trash2 className="h-4 w-4" />
                              إزالة
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>اسم المدرسة</Label>
                      <Input value={loginSchoolName} onChange={(e) => setLoginSchoolName(e.target.value)}
                        placeholder="مثال: ثانوية الفيصلية" />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف الفرعي</Label>
                      <Input value={loginSubtitle} onChange={(e) => setLoginSubtitle(e.target.value)}
                        placeholder="مثال: نظام إدارة المدرسة" />
                    </div>
                    <div className="space-y-2">
                      <Label>عنوان لوحة التحكم</Label>
                      <Input value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)}
                        placeholder="لوحة التحكم" />
                      <p className="text-[11px] text-muted-foreground">يظهر في أعلى لوحة التحكم الرئيسية</p>
                    </div>
                    <Button disabled={savingLogin} className="gap-1.5"
                      onClick={async () => {
                        setSavingLogin(true);
                        const updates = [
                          supabase.from("site_settings").upsert({ id: "school_name", value: loginSchoolName }),
                          supabase.from("site_settings").upsert({ id: "school_subtitle", value: loginSubtitle }),
                          supabase.from("site_settings").upsert({ id: "dashboard_title", value: dashboardTitle }),
                        ];
                        const results = await Promise.all(updates);
                        setSavingLogin(false);
                        if (results.some((r) => r.error)) {
                          toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                        } else {
                          toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" });
                        }
                      }}>
                      <Save className="h-4 w-4" />
                      {savingLogin ? "جارٍ الحفظ..." : "حفظ"}
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
}
