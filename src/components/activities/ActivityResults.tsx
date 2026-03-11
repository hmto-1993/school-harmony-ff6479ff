import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignedFileLink } from "@/components/activities/SignedFileLink";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { safeWriteXLSX } from "@/lib/download-utils";

interface ActivityResultsProps {
  activityId: string;
  activityType: string;
  classId: string;
  className: string;
}

export default function ActivityResults({ activityId, activityType, classId, className: clsName }: ActivityResultsProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [quizSubs, setQuizSubs] = useState<any[]>([]);
  const [fileSubs, setFileSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activityId, classId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: studs }, { data: qSubs }, { data: fSubs }] = await Promise.all([
      supabase.from("students").select("id, full_name").eq("class_id", classId).order("full_name"),
      supabase.from("quiz_submissions").select("*").eq("activity_id", activityId),
      supabase.from("student_file_submissions").select("*").eq("activity_id", activityId).eq("class_id", classId),
    ]);
    setStudents(studs || []);
    setQuizSubs(qSubs || []);
    setFileSubs(fSubs || []);
    setLoading(false);
  };

  const exportResults = () => {
    import("xlsx").then(XLSX => {
      const rows = students.map((s, i) => {
        const qSub = quizSubs.find(q => q.student_id === s.id);
        const fSub = fileSubs.filter(f => f.student_id === s.id);
        return {
          "#": i + 1,
          "الاسم": s.full_name,
          ...(activityType === "quiz" ? {
            "الدرجة": qSub ? `${qSub.score}/${qSub.total}` : "لم يقدم",
            "النسبة": qSub ? `${Math.round((qSub.score / qSub.total) * 100)}%` : "-",
            "التاريخ": qSub ? format(new Date(qSub.submitted_at), "yyyy-MM-dd HH:mm") : "-",
          } : {
            "عدد الملفات": fSub.length,
            "آخر تقديم": fSub.length ? format(new Date(fSub[0].submitted_at), "yyyy-MM-dd HH:mm") : "-",
          }),
        };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "النتائج");
      safeWriteXLSX(wb, `نتائج_${clsName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
          نتائج: {clsName}
        </h3>
        <Button variant="outline" size="sm" onClick={exportResults} className="gap-1.5 rounded-xl">
          <Upload className="h-4 w-4" /> تصدير
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5">
              <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">#</th>
              <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطالب</th>
              {activityType === "quiz" ? (
                <>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الدرجة</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">التاريخ</th>
                </>
              ) : (
                <>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الملفات</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">آخر تقديم</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const qSub = quizSubs.find(q => q.student_id === s.id);
              const fSub = fileSubs.filter(f => f.student_id === s.id);
              const isEven = i % 2 === 0;
              return (
                <tr key={s.id} className={isEven ? "bg-card" : "bg-muted/30"}>
                  <td className="p-3 text-right text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-right font-medium">{s.full_name}</td>
                  {activityType === "quiz" ? (
                    <>
                      <td className="p-3 text-center font-bold">
                        {qSub ? (
                          <span className={cn(
                            qSub.score / qSub.total >= 0.6 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {qSub.score}/{qSub.total}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {qSub ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs">
                            <CheckCircle2 className="h-3 w-3 ml-1" /> مكتمل
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            <XCircle className="h-3 w-3 ml-1" /> لم يقدم
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {qSub ? format(new Date(qSub.submitted_at), "MM/dd HH:mm") : "-"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-center">
                        {fSub.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            {fSub.map(f => (
                              <SignedFileLink key={f.id} bucket="activities" path={f.file_url} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {f.file_name}
                              </SignedFileLink>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {fSub.length > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs">
                            {fSub.length} ملف
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">لم يقدم</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {fSub.length ? format(new Date(fSub[0].submitted_at), "MM/dd HH:mm") : "-"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
