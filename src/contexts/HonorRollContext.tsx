import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HonorRollContextType {
  honoredStudentIds: Set<string>;
  isHonored: (studentId: string) => boolean;
  isEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const HonorRollContext = createContext<HonorRollContextType>({
  honoredStudentIds: new Set(),
  isHonored: () => false,
  isEnabled: false,
  loading: true,
  refresh: async () => {},
});

export function HonorRollProvider({ children }: { children: ReactNode }) {
  const [honoredStudentIds, setHonoredStudentIds] = useState<Set<string>>(new Set());
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHonorRoll = async () => {
    setLoading(true);

    // Check if honor roll is enabled
    const { data: settingData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "honor_roll_enabled")
      .maybeSingle();

    if (!settingData || settingData.value !== "true") {
      setIsEnabled(false);
      setHonoredStudentIds(new Set());
      setLoading(false);
      return;
    }
    setIsEnabled(true);

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Fetch all students
    const { data: students } = await supabase
      .from("students")
      .select("id");
    
    if (!students || students.length === 0) {
      setHonoredStudentIds(new Set());
      setLoading(false);
      return;
    }

    // Fetch absences for this month
    const { data: absences } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("status", "absent")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const studentsWithAbsences = new Set(absences?.map(a => a.student_id) || []);

    // Fetch grades for period test full marks
    const { data: grades } = await supabase
      .from("grades")
      .select("student_id, score, grade_categories(name, max_score)")
      .not("score", "is", null);

    const studentsWithFullMarks = new Set<string>();
    grades?.forEach(g => {
      const catName = (g.grade_categories as any)?.name || "";
      const maxScore = (g.grade_categories as any)?.max_score || 0;
      if ((catName.includes("اختبار الفترة") || catName.includes("اختبار فتر")) && 
          g.score === maxScore && maxScore > 0) {
        studentsWithFullMarks.add(g.student_id);
      }
    });

    // Filter honored students: 0 absences AND full marks
    const honored = new Set<string>();
    for (const student of students) {
      const hasNoAbsences = !studentsWithAbsences.has(student.id);
      const hasFullMark = studentsWithFullMarks.has(student.id);
      
      if (hasNoAbsences && hasFullMark) {
        honored.add(student.id);
      }
    }

    setHonoredStudentIds(honored);
    setLoading(false);
  };

  useEffect(() => {
    fetchHonorRoll();
  }, []);

  const isHonored = (studentId: string) => honoredStudentIds.has(studentId);

  return (
    <HonorRollContext.Provider value={{ honoredStudentIds, isHonored, isEnabled, loading, refresh: fetchHonorRoll }}>
      {children}
    </HonorRollContext.Provider>
  );
}

export function useHonorRoll() {
  return useContext(HonorRollContext);
}
