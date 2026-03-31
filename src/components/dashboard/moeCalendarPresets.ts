import type { ExamDate } from "@/hooks/useAcademicWeek";

export interface MOEPreset {
  label: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  semester: string;
  academic_year: string;
  exam_dates: ExamDate[];
  holidays: { date: string; end_date?: string; label: string }[];
}

// التقويم الدراسي المعتمد من وزارة التعليم السعودية
// المصدر: وزارة التعليم - المملكة العربية السعودية
export const MOE_PRESETS: Record<string, MOEPreset> = {
  // ===== العام الدراسي 1447-1448هـ (2025-2026م) - فصلان دراسيان =====
  "1447-1448-first": {
    label: "الفصل الدراسي الأول ١٤٤٧-١٤٤٨هـ",
    start_date: "2025-08-24", // 01/03/1447
    end_date: "2026-01-08",   // 19/07/1447
    total_weeks: 20,
    semester: "first",
    academic_year: "1447-1448",
    exam_dates: [
      { date: "2025-12-28", label: "اختبارات نهاية الفصل الأول (عملي + شفهي)", type: "final" },
      { date: "2026-01-04", label: "اختبارات نهاية الفصل الأول (تحريري)", type: "final" },
    ],
    holidays: [
      { date: "2025-09-23", label: "إجازة اليوم الوطني" },
      { date: "2025-10-12", label: "إجازة إضافية" },
      { date: "2025-11-21", label: "بداية إجازة الخريف" },
      { date: "2025-11-30", label: "بداية الدراسة بعد إجازة الخريف" },
      { date: "2025-12-11", label: "بداية إجازة إضافية" },
      { date: "2025-12-14", label: "بداية الدراسة بعد الإجازة الإضافية" },
    ],
  },
  "1447-1448-second": {
    label: "الفصل الدراسي الثاني ١٤٤٧-١٤٤٨هـ",
    start_date: "2026-01-18", // 29/07/1447
    end_date: "2026-06-25",   // 10/01/1448
    total_weeks: 23,
    semester: "second",
    academic_year: "1447-1448",
    exam_dates: [
      { date: "2026-06-14", label: "اختبارات نهاية الفصل الثاني (عملي + شفهي)", type: "final" },
      { date: "2026-06-21", label: "اختبارات نهاية الفصل الثاني (تحريري)", type: "final" },
    ],
    holidays: [
      { date: "2026-02-22", label: "إجازة يوم التأسيس" },
      { date: "2026-03-06", label: "بداية إجازة عيد الفطر" },
      { date: "2026-03-29", label: "بداية الدراسة بعد إجازة عيد الفطر" },
      { date: "2026-05-22", label: "بداية إجازة عيد الأضحى" },
      { date: "2026-06-02", label: "بداية الدراسة بعد إجازة عيد الأضحى" },
    ],
  },

  // ===== العام الدراسي 1446-1447هـ (2024-2025م) - ثلاثة فصول دراسية =====
  "1446-1447-first": {
    label: "الفصل الدراسي الأول ١٤٤٦-١٤٤٧هـ",
    start_date: "2024-08-18", // 14/02/1446
    end_date: "2024-11-07",   // 05/05/1446
    total_weeks: 12,
    semester: "first",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2024-10-27", label: "اختبارات نهاية الفصل الأول (عملي + شفهي)", type: "final" },
      { date: "2024-11-03", label: "اختبارات نهاية الفصل الأول (تحريري)", type: "final" },
    ],
    holidays: [
      { date: "2024-09-22", label: "إجازة اليوم الوطني" },
      { date: "2024-10-17", label: "إجازة نهاية أسبوع مطولة" },
    ],
  },
  "1446-1447-second": {
    label: "الفصل الدراسي الثاني ١٤٤٦-١٤٤٧هـ",
    start_date: "2024-11-17", // 15/05/1446
    end_date: "2025-02-20",   // 21/08/1446
    total_weeks: 14,
    semester: "second",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2025-02-09", label: "اختبارات نهاية الفصل الثاني (عملي + شفهي)", type: "final" },
      { date: "2025-02-16", label: "اختبارات نهاية الفصل الثاني (تحريري)", type: "final" },
    ],
    holidays: [
      { date: "2024-12-11", label: "إجازة نهاية أسبوع مطولة" },
      { date: "2025-01-03", label: "إجازة منتصف العام الدراسي (بداية)" },
      { date: "2025-01-12", label: "بداية الدراسة بعد إجازة منتصف العام" },
      { date: "2025-02-23", label: "إجازة يوم التأسيس" },
    ],
  },
  "1446-1447-third": {
    label: "الفصل الدراسي الثالث ١٤٤٦-١٤٤٧هـ",
    start_date: "2025-03-02", // 02/09/1446
    end_date: "2025-06-26",   // 01/01/1447
    total_weeks: 17,
    semester: "third",
    academic_year: "1446-1447",
    exam_dates: [
      { date: "2025-06-15", label: "اختبارات نهاية الفصل الثالث (عملي + شفهي)", type: "final" },
      { date: "2025-06-22", label: "اختبارات نهاية الفصل الثالث (تحريري)", type: "final" },
    ],
    holidays: [
      { date: "2025-03-20", label: "بداية إجازة عيد الفطر" },
      { date: "2025-04-06", label: "بداية الدراسة بعد إجازة عيد الفطر" },
      { date: "2025-05-04", label: "إجازة نهاية أسبوع مطولة" },
      { date: "2025-05-30", label: "بداية إجازة عيد الأضحى" },
      { date: "2025-06-15", label: "بداية الدراسة بعد إجازة عيد الأضحى" },
    ],
  },
};

export type MOEPresetKey = keyof typeof MOE_PRESETS;
