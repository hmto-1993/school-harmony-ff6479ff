import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ResourceFolder, ResourceFile, ParentVisibility, PdfHeader } from "@/components/student-dashboard/constants";

export function useStudentDashboardData(student: any, isParent: boolean) {
  // Resource library state
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ResourceFolder | null>(null);
  const [folderFiles, setFolderFiles] = useState<ResourceFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Popup message state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupAction, setPopupAction] = useState<string>("none");

  // Welcome message (student-specific)
  const [studentWelcomeMessage, setStudentWelcomeMessage] = useState("مرحباً بك {name}.. نتمنى لك يوماً دراسياً مميزاً!");
  const [studentWelcomeEnabled, setStudentWelcomeEnabled] = useState(false);

  // Welcome message (parent)
  const [welcomeMessage, setWelcomeMessage] = useState("مرحباً بك ولي أمر الطالب / {name}.. أبناؤنا أمانة، ومتابعتكم سر نجاحهم.");
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);

  // School info
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [parentPdfHeader, setParentPdfHeader] = useState<PdfHeader>({ line1: "", line2: "", line3: "", showLogo: true });

  // Parent visibility
  const [parentVis, setParentVis] = useState<ParentVisibility>({
    parentShowNationalId: true,
    parentShowGrades: true,
    parentShowAttendance: true,
    parentShowBehavior: true,
    parentShowHonorRoll: true,
    parentShowAbsenceWarning: true,
    parentShowContactTeacher: true,
    parentGradesShowPercentage: true,
    parentGradesShowEval: true,
    parentGradesVisiblePeriods: "both",
    parentGradesHiddenCategories: { global: [], classes: {} },
    parentShowDailyGrades: false,
    parentShowClassworkIcons: false,
    parentClassworkIconsCount: 10,
    parentShowLibrary: true,
    parentShowActivities: true,
    parentShowDeductions: true,
  });

  // Live student visibility (refreshed every dashboard open, overrides login snapshot)
  const [studentVis, setStudentVis] = useState<Record<string, boolean> | null>(null);
  const [studentEvalLive, setStudentEvalLive] = useState<{ showDaily: boolean; showClasswork: boolean; iconsCount: number; showDeductions: boolean } | null>(null);

  // View states
  const [gradesView, setGradesView] = useState<"table" | "cards">("cards");
  const [evalSubView, setEvalSubView] = useState<"daily" | "classwork">("daily");

  useEffect(() => {
    if (student) {
      fetchFolders();
      fetchPopup();
      if (isParent) fetchWelcomeMessage();
      if (!isParent) { fetchStudentWelcome(); fetchStudentVisibility(); }
    }
  }, [student]);

  const fetchStudentVisibility = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", [
        "student_show_grades", "student_show_attendance", "student_show_behavior",
        "student_show_activities", "student_show_library", "student_show_honor_roll",
        "student_show_absence_warning", "student_show_national_id",
        "student_show_daily_grades", "student_show_classwork_icons",
        "student_classwork_icons_count", "student_show_deductions",
      ]);
    const vis: Record<string, boolean> = {};
    let showDaily = true, showClasswork = true, showDeductions = true, iconsCount = 10;
    (data || []).forEach((s: any) => {
      const v = s.value !== "false";
      if (s.id === "student_show_grades") vis.grades = v;
      if (s.id === "student_show_attendance") vis.attendance = v;
      if (s.id === "student_show_behavior") vis.behavior = v;
      if (s.id === "student_show_activities") vis.activities = v;
      if (s.id === "student_show_library") vis.library = v;
      if (s.id === "student_show_honor_roll") vis.honorRoll = v;
      if (s.id === "student_show_absence_warning") vis.absenceWarning = v;
      if (s.id === "student_show_national_id") vis.nationalId = v;
      if (s.id === "student_show_daily_grades") showDaily = v;
      if (s.id === "student_show_classwork_icons") showClasswork = v;
      if (s.id === "student_show_deductions") showDeductions = v;
      if (s.id === "student_classwork_icons_count" && s.value) iconsCount = Number(s.value) || 10;
    });
    setStudentVis(vis);
    setStudentEvalLive({ showDaily, showClasswork, iconsCount, showDeductions });
  };

  const fetchStudentWelcome = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["student_welcome_message", "student_welcome_enabled", "school_name", "school_logo_url"]);
    (data || []).forEach((s: any) => {
      if (s.id === "student_welcome_message" && s.value) setStudentWelcomeMessage(s.value);
      if (s.id === "student_welcome_enabled") setStudentWelcomeEnabled(s.value === "true");
      if (s.id === "school_name" && s.value) setSchoolName(s.value);
      if (s.id === "school_logo_url" && s.value) setSchoolLogoUrl(s.value);
    });
  };

  const fetchWelcomeMessage = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", [
        "parent_welcome_message", "parent_welcome_enabled", "school_name", "school_logo_url",
        "parent_show_national_id", "parent_show_grades", "parent_show_attendance", "parent_show_behavior",
        "parent_show_honor_roll", "parent_show_absence_warning", "parent_show_contact_teacher",
        "parent_grades_default_view", "parent_grades_show_percentage", "parent_grades_show_eval",
        "parent_grades_visible_periods", "parent_grades_hidden_categories", "parent_show_daily_grades",
        "parent_show_classwork_icons", "parent_classwork_icons_count", "parent_show_library",
        "parent_show_activities", "parent_pdf_header", "parent_show_deductions",
      ]);
    const updates: Partial<ParentVisibility> = {};
    (data || []).forEach((s: any) => {
      if (s.id === "parent_welcome_message" && s.value) setWelcomeMessage(s.value);
      if (s.id === "parent_welcome_enabled") setWelcomeEnabled(s.value !== "false");
      if (s.id === "school_name" && s.value) setSchoolName(s.value);
      if (s.id === "school_logo_url" && s.value) setSchoolLogoUrl(s.value);
      if (s.id === "parent_show_national_id") updates.parentShowNationalId = s.value !== "false";
      if (s.id === "parent_show_grades") updates.parentShowGrades = s.value !== "false";
      if (s.id === "parent_show_attendance") updates.parentShowAttendance = s.value !== "false";
      if (s.id === "parent_show_behavior") updates.parentShowBehavior = s.value !== "false";
      if (s.id === "parent_show_honor_roll") updates.parentShowHonorRoll = s.value !== "false";
      if (s.id === "parent_show_absence_warning") updates.parentShowAbsenceWarning = s.value !== "false";
      if (s.id === "parent_show_contact_teacher") updates.parentShowContactTeacher = s.value !== "false";
      if (s.id === "parent_grades_default_view") setGradesView(s.value === "table" ? "table" : "cards");
      if (s.id === "parent_grades_show_percentage") updates.parentGradesShowPercentage = s.value !== "false";
      if (s.id === "parent_grades_show_eval") updates.parentGradesShowEval = s.value !== "false";
      if (s.id === "parent_grades_visible_periods") updates.parentGradesVisiblePeriods = (s.value as "both" | "1" | "2") || "both";
      if (s.id === "parent_grades_hidden_categories" && s.value) {
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) {
            updates.parentGradesHiddenCategories = { global: parsed, classes: {} };
          } else if (parsed.global !== undefined) {
            updates.parentGradesHiddenCategories = parsed;
          } else {
            updates.parentGradesHiddenCategories = { global: [], classes: {} };
          }
        } catch { updates.parentGradesHiddenCategories = { global: [], classes: {} }; }
      }
      if (s.id === "parent_show_daily_grades") updates.parentShowDailyGrades = s.value === "true";
      if (s.id === "parent_show_classwork_icons") updates.parentShowClassworkIcons = s.value === "true";
      if (s.id === "parent_classwork_icons_count" && s.value) updates.parentClassworkIconsCount = Number(s.value) || 10;
      if (s.id === "parent_show_library") updates.parentShowLibrary = s.value !== "false";
      if (s.id === "parent_show_activities") updates.parentShowActivities = s.value !== "false";
      if (s.id === "parent_show_deductions") updates.parentShowDeductions = s.value !== "false";
      if (s.id === "parent_pdf_header" && s.value) {
        try { setParentPdfHeader(JSON.parse(s.value)); } catch {}
      }
    });
    setParentVis(prev => ({ ...prev, ...updates }));
  };

  const fetchPopup = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", [
        "student_popup_enabled", "student_popup_title", "student_popup_message",
        "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes",
        "student_popup_action", "student_popup_repeat",
      ]);
    let enabled = false;
    let title = "";
    let message = "";
    let expiry = "";
    let targetType = "all";
    let targetClassIds: string[] = [];
    let action = "none";
    let repeat = "none";
    (data || []).forEach((s: any) => {
      if (s.id === "student_popup_enabled") enabled = s.value === "true";
      if (s.id === "student_popup_title") title = s.value || "";
      if (s.id === "student_popup_message") message = s.value || "";
      if (s.id === "student_popup_expiry") expiry = s.value || "";
      if (s.id === "student_popup_target_type") targetType = s.value || "all";
      if (s.id === "student_popup_target_classes" && s.value) {
        try { targetClassIds = JSON.parse(s.value); } catch { targetClassIds = []; }
      }
      if (s.id === "student_popup_action") action = s.value || "none";
      if (s.id === "student_popup_repeat") repeat = s.value || "none";
    });

    if (expiry && new Date(expiry) < new Date()) enabled = false;
    if (targetType === "specific" && student?.class_id) {
      if (!targetClassIds.includes(student.class_id)) enabled = false;
    }

    if (enabled && message.trim()) {
      const storageKey = `popup_dismissed_${student?.id || "unknown"}`;
      const lastDismissed = localStorage.getItem(storageKey);
      if (lastDismissed && repeat !== "none") {
        const dismissedDate = new Date(lastDismissed);
        const now = new Date();
        if (repeat === "daily") {
          if (dismissedDate.toDateString() === now.toDateString()) enabled = false;
        } else if (repeat === "weekly") {
          const diffDays = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 7) enabled = false;
        }
      } else if (lastDismissed && repeat === "none") {
        enabled = false;
      }
    }

    if (enabled && message.trim()) {
      setPopupTitle(title);
      setPopupMessage(message);
      setPopupAction(action);
      setPopupOpen(true);
    }
  };

  const fetchFolders = async () => {
    if (!student) return;
    setFoldersLoading(true);
    const query = supabase
      .from("resource_folders")
      .select("id, title, icon, class_id, category")
      .eq("visible_to_students", true)
      .order("created_at", { ascending: false });

    const { data } = await query;
    if (data) {
      const filtered = data.filter((f: any) => !f.class_id || f.class_id === student.class_id);
      const { data: fileCounts } = await supabase.from("resource_files").select("folder_id");
      const countMap: Record<string, number> = {};
      fileCounts?.forEach((fc: any) => { countMap[fc.folder_id] = (countMap[fc.folder_id] || 0) + 1; });
      setFolders(filtered.map((f: any) => ({ ...f, file_count: countMap[f.id] || 0 })));
    }
    setFoldersLoading(false);
  };

  const openFolder = async (folder: ResourceFolder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    const { data } = await supabase
      .from("resource_files")
      .select("id, file_name, file_url, file_size")
      .eq("folder_id", folder.id)
      .order("created_at", { ascending: false });
    setFolderFiles(data || []);
    setFilesLoading(false);
  };

  const dismissPopup = () => {
    const storageKey = `popup_dismissed_${student?.id || "unknown"}`;
    localStorage.setItem(storageKey, new Date().toISOString());
    setPopupOpen(false);
  };

  return {
    // Library
    folders, foldersLoading, selectedFolder, setSelectedFolder, folderFiles, setFolderFiles,
    filesLoading, previewFile, setPreviewFile, openFolder,
    // Popup
    popupOpen, setPopupOpen, popupTitle, popupMessage, popupAction, dismissPopup,
    // Welcome
    welcomeMessage, welcomeEnabled,
    studentWelcomeMessage, studentWelcomeEnabled,
    // School
    schoolName, schoolLogoUrl, parentPdfHeader,
    // Parent visibility
    parentVis,
    // Live student visibility (overrides login snapshot)
    studentVis, studentEvalLive,
    // View states
    gradesView, setGradesView, evalSubView, setEvalSubView,
  };
}
