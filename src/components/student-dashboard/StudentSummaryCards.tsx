import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CheckCircle, Clock, BookOpen } from "lucide-react";

interface Props {
  vis: { grades: boolean; attendance: boolean; behavior: boolean };
  percentage: number;
  presentCount: number;
  absentCount: number;
  positiveCount: number;
  negativeCount: number;
}

export default function StudentSummaryCards({ vis, percentage, presentCount, absentCount, positiveCount, negativeCount }: Props) {
  const visibleCount = [vis.grades, vis.attendance, vis.attendance, vis.behavior].filter(Boolean).length;

  return (
    <div className={cn("grid gap-4", visibleCount <= 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
      {vis.grades && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-card to-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/5 overflow-hidden">
          <CardContent className="flex flex-col items-center p-5">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-md shadow-primary/25 mb-2">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{percentage}%</p>
            <p className="text-xs text-muted-foreground">المعدل العام</p>
          </CardContent>
        </Card>
      )}
      {vis.attendance && (
        <>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 dark:from-emerald-500/10 dark:via-card dark:to-emerald-500/5 overflow-hidden">
            <CardContent className="flex flex-col items-center p-5">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-md shadow-emerald-500/25 mb-2">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{presentCount}</p>
              <p className="text-xs text-muted-foreground">أيام الحضور</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500/5 via-card to-rose-500/10 dark:from-rose-500/10 dark:via-card dark:to-rose-500/5 overflow-hidden">
            <CardContent className="flex flex-col items-center p-5">
              <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-3 shadow-md shadow-rose-500/25 mb-2">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{absentCount}</p>
              <p className="text-xs text-muted-foreground">أيام الغياب</p>
            </CardContent>
          </Card>
        </>
      )}
      {vis.behavior && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 via-card to-blue-500/10 dark:from-blue-500/10 dark:via-card dark:to-blue-500/5 overflow-hidden">
          <CardContent className="flex flex-col items-center p-5">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-md shadow-blue-500/25 mb-2">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{positiveCount}/{positiveCount + negativeCount}</p>
            <p className="text-xs text-muted-foreground">تقييم إيجابي</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
