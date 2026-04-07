export interface AttendanceRecord {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
}

export interface WeekData {
  weekNum: number;
  dates: string[];
}

export interface StudentRow {
  id: string;
  name: string;
  weeks: Record<number, (string | null)[]>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalPeriods: number;
  isAtRisk: boolean;
}

export const STATUS_CONFIG: Record<string, { color: string; printColor: string; label: string; dotChar: string }> = {
  present:    { color: "#4caf50", printColor: "#66bb6a", label: "حاضر",      dotChar: "●" },
  absent:     { color: "#e53935", printColor: "#ef5350", label: "غائب",      dotChar: "●" },
  sick_leave: { color: "#1e88e5", printColor: "#42a5f5", label: "مستأذن",    dotChar: "●" },
  late:       { color: "#fbc02d", printColor: "#ffca28", label: "متأخر",     dotChar: "●" },
  early_leave:{ color: "#1e88e5", printColor: "#42a5f5", label: "خروج مبكر", dotChar: "●" },
};
