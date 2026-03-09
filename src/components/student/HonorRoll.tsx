import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import DiamondStarBadge from "./DiamondStarBadge";

interface HonoredStudent {
  id: string;
  full_name: string;
  class_name: string;
  achievements: string[];
}

interface Props {
  classId?: string | null;
}

export default function HonorRoll({ classId }: Props) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [honoredStudents, setHonoredStudents] = useState<HonoredStudent[]>([]);

  useEffect(() => {
    fetchHonorRoll();
  }, [classId]);

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
      setLoading(false);
      return;
    }
    setIsEnabled(true);

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Fetch all students with their data
    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id, classes(name)")
      .order("full_name");
    
    if (classId) {
      studentsQuery = studentsQuery.eq("class_id", classId);
    }
    
    const { data: students } = await studentsQuery;
    if (!students || students.length === 0) {
      setHonoredStudents([]);
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

    const studentsWithFullMarks = new Map<string, string[]>();
    grades?.forEach(g => {
      const catName = (g.grade_categories as any)?.name || "";
      const maxScore = (g.grade_categories as any)?.max_score || 0;
      if ((catName.includes("اختبار الفترة") || catName.includes("اختبار فتر")) && 
          g.score === maxScore && maxScore > 0) {
        const existing = studentsWithFullMarks.get(g.student_id) || [];
        if (!existing.includes(catName)) {
          studentsWithFullMarks.set(g.student_id, [...existing, catName]);
        }
      }
    });

    // Filter honored students: 0 absences AND full marks
    const honored: HonoredStudent[] = [];
    for (const student of students) {
      const hasNoAbsences = !studentsWithAbsences.has(student.id);
      const fullMarkTests = studentsWithFullMarks.get(student.id);
      
      if (hasNoAbsences && fullMarkTests && fullMarkTests.length > 0) {
        honored.push({
          id: student.id,
          full_name: student.full_name,
          class_name: (student.classes as any)?.name || "",
          achievements: [
            "انتظام كامل",
            ...fullMarkTests.map(t => `درجة كاملة في ${t}`),
          ],
        });
      }
    }

    setHonoredStudents(honored);
    setLoading(false);
  };

  if (!isEnabled || loading) return null;
  if (honoredStudents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2",
        "border-amber-400/60 dark:border-amber-500/40",
        "bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-amber-100/50",
        "dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-900/20",
        "shadow-xl shadow-amber-200/30 dark:shadow-amber-900/20"
      )}>
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-400/50 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-400/50 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-400/50 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-400/50 rounded-br-xl" />

        <CardHeader className="text-center pb-2 relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
            <Crown className="h-7 w-7 text-amber-600 fill-amber-500" />
            <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
          </div>
          <CardTitle className="text-xl font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            لوحة الشرف
            <Trophy className="h-5 w-5 text-amber-600" />
          </CardTitle>
          <p className="text-xs text-amber-700/70 dark:text-amber-300/60 mt-1">
            الطلاب المتميزون بالانتظام الكامل والدرجة الكاملة
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {honoredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "relative rounded-xl p-4 text-center",
                    "bg-gradient-to-br from-white/80 to-amber-50/60",
                    "dark:from-card/80 dark:to-amber-950/30",
                    "border border-amber-300/50 dark:border-amber-700/40",
                    "shadow-md shadow-amber-200/20 dark:shadow-amber-900/10",
                    "hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  )}
                >
                  {/* Star decorations */}
                  <Sparkles className="absolute top-2 right-2 h-4 w-4 text-amber-400/60" />
                  <Sparkles className="absolute top-2 left-2 h-4 w-4 text-amber-400/60" />

                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DiamondStarBadge size="md" />
                  </div>
                  
                  <p className="font-bold text-foreground text-sm mb-1">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{student.class_name}</p>
                  
                  <div className="flex flex-wrap justify-center gap-1">
                    {student.achievements.slice(0, 2).map((ach, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-[10px] px-2 py-0.5 bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300/50"
                      >
                        {ach}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {honoredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>لا يوجد طلاب في لوحة الشرف حالياً</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
