import {
  Atom, BookOpen, GraduationCap, FileText, FileSpreadsheet, TestTube2,
  Calculator, Ruler, Lightbulb, Brain, Microscope, ClipboardList,
  FlaskConical, Zap, Magnet, Waves, FolderOpen,
} from "lucide-react";

export const statusLabels: Record<string, { label: string; color: string }> = {
  present: { label: "حاضر", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  absent: { label: "غائب", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  late: { label: "متأخر", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  early_leave: { label: "خروج مبكر", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  sick_leave: { label: "إجازة مرضية", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
};

const ICON_MAP: Record<string, any> = {
  atom: Atom, book: BookOpen, graduation: GraduationCap, file: FileText,
  sheet: FileSpreadsheet, testtube: TestTube2, calculator: Calculator,
  ruler: Ruler, lightbulb: Lightbulb, brain: Brain, microscope: Microscope,
  clipboard: ClipboardList, flask: FlaskConical, zap: Zap, magnet: Magnet, waves: Waves,
};

export function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] || FolderOpen;
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export interface ResourceFolder {
  id: string;
  title: string;
  icon: string;
  class_id: string | null;
  category: string;
  file_count: number;
}

export interface ResourceFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface ParentVisibility {
  parentShowNationalId: boolean;
  parentShowGrades: boolean;
  parentShowAttendance: boolean;
  parentShowBehavior: boolean;
  parentShowHonorRoll: boolean;
  parentShowAbsenceWarning: boolean;
  parentShowContactTeacher: boolean;
  parentGradesShowPercentage: boolean;
  parentGradesShowEval: boolean;
  parentGradesVisiblePeriods: "both" | "1" | "2";
  parentGradesHiddenCategories: { global: string[]; classes: Record<string, string[]> };
  parentShowDailyGrades: boolean;
  parentShowClassworkIcons: boolean;
  parentClassworkIconsCount: number;
  parentShowLibrary: boolean;
  parentShowActivities: boolean;
}

export interface PdfHeader {
  line1: string;
  line2: string;
  line3: string;
  showLogo: boolean;
}
