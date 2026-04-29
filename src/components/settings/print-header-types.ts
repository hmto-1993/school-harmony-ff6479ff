export interface SectionConfig {
  lines: string[];
  fontSize: number;
  align: "right" | "center" | "left";
  color?: string;
}

export interface CenterSectionConfig {
  images: string[];
  imagesSizes: number[];
  imagesWidths?: number[];
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
  repeat: boolean;
}

export interface FooterSignature {
  label: string;
  name: string;
}

export interface FooterSignaturesConfig {
  enabled: boolean;
  signatures: FooterSignature[];
}

export interface MarginsConfig {
  top: number;
  side: number;
  borderWidth?: number;
  borderColor?: string;
  borderBottomMargin?: number;
}

export interface AdvancedConfig {
  paperSize: "A4" | "A5" | "Letter" | "Legal";
  exportQuality: "standard" | "high" | "max";
  pdfFontSize: number;
  tableRowHeight: number;
  showPageNumbers: boolean;
  showDate: boolean;
  showReportTitle: boolean;
  headerOnEveryPage: boolean;
  tableHeaderBg: string;
  tableHeaderText: string;
}

export interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
  watermark?: WatermarkConfig;
  footerSignatures?: FooterSignaturesConfig;
  margins?: MarginsConfig;
  advanced?: AdvancedConfig;
}

export interface ReportTypeOption {
  id: string;
  label: string;
  icon: string;
}

export const defaultWatermark: WatermarkConfig = {
  enabled: false,
  text: "سري",
  fontSize: 48,
  color: "#94a3b8",
  opacity: 0.08,
  angle: -30,
  repeat: true,
};

export const defaultFooterSignatures: FooterSignaturesConfig = {
  enabled: false,
  signatures: [
    { label: "معلم المادة", name: "" },
    { label: "مدير المدرسة", name: "" },
  ],
};

export const defaultMargins: MarginsConfig = {
  top: 10,
  side: 12,
  borderWidth: 3,
  borderColor: "#3b82f6",
  borderBottomMargin: 8,
};

export const defaultAdvanced: AdvancedConfig = {
  paperSize: "A4",
  exportQuality: "high",
  pdfFontSize: 12,
  tableRowHeight: 28,
  showPageNumbers: true,
  showDate: true,
  showReportTitle: true,
  headerOnEveryPage: true,
  tableHeaderBg: "#eff6ff",
  tableHeaderText: "#1e40af",
};

export const defaultConfig: PrintHeaderConfig = {
  rightSection: {
    lines: ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم", "مدرسة ..."],
    fontSize: 12,
    align: "right",
    color: "#1e293b",
  },
  centerSection: {
    images: ["", "", ""],
    imagesSizes: [60, 80, 60],
  },
  leftSection: {
    lines: ["اختبار: ...", "المادة: ...", "الصف: ...", "الزمن: ..."],
    fontSize: 12,
    align: "left",
    color: "#1e293b",
  },
  watermark: defaultWatermark,
  footerSignatures: defaultFooterSignatures,
  margins: defaultMargins,
  advanced: defaultAdvanced,
};

export const reportTypes: ReportTypeOption[] = [
  { id: "__default__", label: "الترويسة الافتراضية (عامة)", icon: "📄" },
  { id: "attendance", label: "تقرير الحضور والغياب", icon: "📋" },
  { id: "grades", label: "تقرير الدرجات", icon: "📊" },
  { id: "behavior", label: "تقرير السلوك", icon: "⭐" },
  { id: "student_logins", label: "سجل دخول الطلاب", icon: "🔑" },
  { id: "students", label: "بيانات الطلاب", icon: "👨‍🎓" },
  { id: "weekly_attendance", label: "الحضور الأسبوعي", icon: "📅" },
  { id: "comprehensive", label: "التقرير الشامل", icon: "📑" },
  { id: "quiz_stats", label: "إحصائيات الاختبارات", icon: "✏️" },
  { id: "monthly", label: "التقرير الشهري", icon: "🗓️" },
  { id: "violations", label: "المخالفات السلوكية", icon: "⚠️" },
];

export const presetColors = ["#1e293b", "#000000", "#1d4ed8", "#047857", "#7c3aed", "#b91c1c", "#92400e", "#64748b"];
export const borderColors = ["#3b82f6", "#1d4ed8", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#1e293b", "#64748b"];

export const normalizeConfig = (parsed: any) => {
  if (!parsed.rightSection.color) parsed.rightSection.color = "#1e293b";
  if (!parsed.leftSection.color) parsed.leftSection.color = "#1e293b";
  if (!parsed.watermark) parsed.watermark = defaultWatermark;
  if (!parsed.footerSignatures) parsed.footerSignatures = defaultFooterSignatures;
  if (!parsed.margins) parsed.margins = defaultMargins;
  if (!parsed.advanced) parsed.advanced = defaultAdvanced;
};
