import {
  Atom, BookOpen, GraduationCap, FileText, FileSpreadsheet, TestTube2,
  Calculator, Ruler, Lightbulb, Brain, Microscope, ClipboardList, FlaskConical,
  Zap, Magnet, Waves, FolderOpen,
} from "lucide-react";

export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export interface ResourceFolder {
  id: string;
  title: string;
  icon: string;
  class_id: string;
  created_by: string;
  created_at: string;
  category: string;
  visible_to_students: boolean;
  classes?: ClassInfo;
  file_count?: number;
}

export interface ResourceFile {
  id: string;
  folder_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

export const CATEGORY_OPTIONS = [
  { value: "general", label: "عام" },
  { value: "certificates", label: "شهادات" },
  { value: "worksheets", label: "أوراق عمل" },
  { value: "exams", label: "اختبارات" },
  { value: "notes", label: "مذكرات" },
  { value: "books", label: "كتب" },
  { value: "experiments", label: "تجارب" },
  { value: "reviews", label: "مراجعات" },
];

export function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(c => c.value === value)?.label || "عام";
}

export const ICON_OPTIONS = [
  { value: "atom", label: "فيزياء", icon: Atom },
  { value: "book", label: "الكتاب", icon: BookOpen },
  { value: "graduation", label: "شهادة", icon: GraduationCap },
  { value: "file", label: "مذكرة", icon: FileText },
  { value: "sheet", label: "أوراق عمل", icon: FileSpreadsheet },
  { value: "testtube", label: "تجارب", icon: TestTube2 },
  { value: "calculator", label: "حسابات", icon: Calculator },
  { value: "ruler", label: "قياسات", icon: Ruler },
  { value: "lightbulb", label: "قوانين", icon: Lightbulb },
  { value: "brain", label: "مراجعة", icon: Brain },
  { value: "microscope", label: "مختبر", icon: Microscope },
  { value: "clipboard", label: "اختبارات", icon: ClipboardList },
  { value: "flask", label: "معمل", icon: FlaskConical },
  { value: "zap", label: "كهرباء", icon: Zap },
  { value: "magnet", label: "مغناطيسية", icon: Magnet },
  { value: "waves", label: "موجات", icon: Waves },
];

export function getIconComponent(iconName: string) {
  const found = ICON_OPTIONS.find(o => o.value === iconName);
  return found ? found.icon : FolderOpen;
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export const CLASS_COLORS = [
  { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/20", hoverBg: "hover:bg-blue-500/15" },
  { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/20", hoverBg: "hover:bg-emerald-500/15" },
  { bg: "bg-violet-500/10", icon: "text-violet-500", border: "border-violet-500/20", hoverBg: "hover:bg-violet-500/15" },
  { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/20", hoverBg: "hover:bg-amber-500/15" },
  { bg: "bg-rose-500/10", icon: "text-rose-500", border: "border-rose-500/20", hoverBg: "hover:bg-rose-500/15" },
  { bg: "bg-cyan-500/10", icon: "text-cyan-500", border: "border-cyan-500/20", hoverBg: "hover:bg-cyan-500/15" },
  { bg: "bg-orange-500/10", icon: "text-orange-500", border: "border-orange-500/20", hoverBg: "hover:bg-orange-500/15" },
  { bg: "bg-pink-500/10", icon: "text-pink-500", border: "border-pink-500/20", hoverBg: "hover:bg-pink-500/15" },
];
