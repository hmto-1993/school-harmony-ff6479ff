import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, CheckCircle2, Circle, Settings, CalendarRange } from "lucide-react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface LessonItem {
  id: string;
  day_index: number;
  slot_index: number;
  lesson_title: string;
  is_completed: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const WEEKLY_DAY_INDEX = -1;

export default function WeekLessonsWidget() {
  const { user, role } = useAuth();
  const { currentWeek } = useAcademicWeek();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  // Fetch classes - for admins fetch all, for teachers fetch their classes
  useEffect(() => {
    if (!user) return;
    const isAdmin = role === "admin";

    if (isAdmin) {
      supabase
        .from("classes")
        .select("id, name")
        .order("name")
        .then(({ data }) => {
          const cls = (data || []) as ClassOption[];
          setClasses(cls);
          if (cls.length > 0 && !selectedClassId) {
            setSelectedClassId(cls[0].id);
          }
        });
    } else {
      supabase
        .from("teacher_classes")
        .select("class_id, classes(id, name)")
        .eq("teacher_id", user.id)
        .then(({ data }) => {
          const cls = (data || [])
            .map((tc: any) => tc.classes)
            .filter(Boolean) as ClassOption[];
          setClasses(cls);
          if (cls.length > 0 && !selectedClassId) {
            setSelectedClassId(cls[0].id);
          }
        });
    }
  }, [user, role]);

  const fetchLessons = useCallback(() => {
    if (!currentWeek || !selectedClassId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("lesson_plans")
      .select("id, day_index, slot_index, lesson_title, is_completed")
      .eq("week_number", currentWeek)
      .eq("class_id", selectedClassId)
      .order("day_index")
      .order("slot_index")
      .then(({ data }) => {
        setLessons((data || []).filter((l) => l.lesson_title.trim()));
        setLoading(false);
      });
  }, [currentWeek, selectedClassId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const toggleCompletion = async (lesson: LessonItem) => {
    const newVal = !lesson.is_completed;
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, is_completed: newVal } : l))
    );
    const { error } = await supabase
      .from("lesson_plans")
      .update({ is_completed: newVal })
      .eq("id", lesson.id);
    if (error) {
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, is_completed: !newVal } : l))
      );
      toast({ title: "خطأ", description: "فشل تحديث حالة الدرس", variant: "destructive" });
    }
  };

  const completedCount = lessons.filter((l) => l.is_completed).length;
  const todayDayIndex = new Date().getDay();

  if (loading && !selectedClassId) {
    return <Card className="border-0 ring-1 ring-border/30 animate-pulse h-48 bg-muted/30" />;
  }

  // Separate weekly and daily lessons
  const weeklyLessons = lessons.filter(l => l.day_index === WEEKLY_DAY_INDEX);
  const dailyLessons = lessons.filter(l => l.day_index !== WEEKLY_DAY_INDEX);

  // Group daily by day
  const byDay = new Map<number, LessonItem[]>();
  dailyLessons.forEach((l) => {
    if (!byDay.has(l.day_index)) byDay.set(l.day_index, []);
    byDay.get(l.day_index)!.push(l);
  });

  return (
    <Card className="border-0 ring-1 ring-info/20 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
            <BookOpen className="h-4 w-4 text-info-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">
              دروس الأسبوع {currentWeek || "—"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">خطة الدروس الأسبوعية</p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            title="إعدادات خطة الدروس"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          {lessons.length > 0 && (
            <Badge className="bg-info/15 text-info hover:bg-info/20 border-0 text-xs">
              {completedCount}/{lessons.length}
            </Badge>
          )}
        </div>
        {/* Class selector */}
        {classes.length > 1 && (
          <div className="mt-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="h-7 text-[11px] border-border/30 bg-background/50">
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Progress bar */}
        {lessons.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Progress value={(completedCount / lessons.length) * 100} className="h-2 flex-1 bg-muted/50 [&>div]:bg-gradient-to-l [&>div]:from-success [&>div]:to-success/70" />
            <span className="text-[10px] font-semibold text-muted-foreground min-w-[32px] text-left">
              {Math.round((completedCount / lessons.length) * 100)}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 border-2 border-info/30 border-t-info rounded-full animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {currentWeek ? "لم يتم تعيين دروس لهذا الأسبوع" : "لا يوجد تقويم أكاديمي"}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
            {/* Weekly lessons */}
            {weeklyLessons.length > 0 && (
              <div>
                <p className="text-[11px] font-bold mb-1 text-accent flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  أسبوعي
                </p>
                <div className="space-y-1">
                  {weeklyLessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => toggleCompletion(l)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors w-full text-right",
                        l.is_completed
                          ? "bg-success/10 text-success hover:bg-success/15"
                          : "bg-accent/10 text-foreground hover:bg-accent/15"
                      )}
                    >
                      {l.is_completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-accent" />
                      )}
                      <span className={cn("truncate flex-1", l.is_completed && "line-through opacity-70")}>
                        {l.lesson_title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Daily lessons */}
            {Array.from(byDay.entries()).map(([dayIdx, dayLessons]) => (
              <div key={dayIdx}>
                <p className={cn(
                  "text-[11px] font-bold mb-1",
                  dayIdx === todayDayIndex ? "text-info" : "text-muted-foreground"
                )}>
                  {DAY_NAMES[dayIdx] || `يوم ${dayIdx}`}
                  {dayIdx === todayDayIndex && (
                    <span className="mr-1 text-[10px] font-normal">(اليوم)</span>
                  )}
                </p>
                <div className="space-y-1">
                  {dayLessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => toggleCompletion(l)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors w-full text-right",
                        l.is_completed
                          ? "bg-success/10 text-success hover:bg-success/15"
                          : "bg-muted/50 text-foreground hover:bg-muted/70"
                      )}
                    >
                      {l.is_completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className={cn("truncate flex-1", l.is_completed && "line-through opacity-70")}>
                        {l.lesson_title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
