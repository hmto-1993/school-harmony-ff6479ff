import type { ExamDate } from "@/hooks/useAcademicWeek";

export interface MOEPreset {
  label: string;
  start_date: string;
  total_weeks: number;
  semester: string;
  academic_year: string;
  exam_dates: ExamDate[];
}

// التقويم الدراسي المعتمد من وزارة التعليم السعودية للعام 1446-1447هـ
// المصدر: وزارة التعليم - المملكة العربية السعودية
export const MOE_PRESETS: Record<string, MOEPreset> = {
  "1446-1447-first": {
    label: "الفصل الدراسي الأول ١٤٤٦-١٤٤٧هـ",
    start_date: "2024-08-18",
    total_weeks: 18,
    semester: "first",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2024-10-20", label: "اختبارات منتصف الفصل الأول", type: "midterm" },
      { date: "2024-11-14", label: "بداية اختبارات الفصل الأول النهائية (عملي)", type: "final" },
      { date: "2024-11-20", label: "بداية اختبارات الفصل الأول النهائية (نظري)", type: "final" },
    ],
  },
  "1446-1447-second": {
    label: "الفصل الدراسي الثاني ١٤٤٦-١٤٤٧هـ",
    start_date: "2024-12-01",
    total_weeks: 18,
    semester: "second",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2025-02-09", label: "اختبارات منتصف الفصل الثاني", type: "midterm" },
      { date: "2025-03-13", label: "بداية اختبارات الفصل الثاني النهائية (عملي)", type: "final" },
      { date: "2025-03-19", label: "بداية اختبارات الفصل الثاني النهائية (نظري)", type: "final" },
    ],
  },
  "1446-1447-third": {
    label: "الفصل الدراسي الثالث ١٤٤٦-١٤٤٧هـ",
    start_date: "2025-03-30",
    total_weeks: 14,
    semester: "third",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2025-05-11", label: "اختبارات منتصف الفصل الثالث", type: "midterm" },
      { date: "2025-06-12", label: "بداية اختبارات الفصل الثالث النهائية (عملي)", type: "final" },
      { date: "2025-06-18", label: "بداية اختبارات الفصل الثالث النهائية (نظري)", type: "final" },
    ],
  },
};

export type MOEPresetKey = keyof typeof MOE_PRESETS;
