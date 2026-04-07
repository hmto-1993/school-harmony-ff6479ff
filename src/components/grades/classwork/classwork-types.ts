export type GradeLevel = "excellent" | "average" | "zero" | null;

export interface DailyIcon {
  level: GradeLevel;
  isFullScore: boolean;
}

export interface ClassInfo { id: string; name: string; }
export interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; }

export interface SummaryRow {
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
  manualScores: Record<string, number>;
  manualScoreIds: Record<string, string>;
  dailyIcons: Record<string, DailyIcon[]>;
}

export interface ClassworkSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}
