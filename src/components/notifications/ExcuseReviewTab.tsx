import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, Clock, FileImage, X as XIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "@/hooks/use-toast";

function ExcuseFileLink({ fileUrl, label }: { fileUrl: string; label: string }) {
  const signed = useSignedUrl("school-assets", fileUrl);
  return (
    <a href={signed || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
      <FileImage className="h-3 w-3" />
      {label}
    </a>
  );
}

function ExcuseImage({ fileUrl }: { fileUrl: string }) {
  const signed = useSignedUrl("school-assets", fileUrl);
  return (
    <a href={signed || "#"} target="_blank" rel="noopener noreferrer">
      <img src={signed || ""} alt="ملف العذر" className="w-full max-h-[300px] object-contain bg-muted" />
    </a>
  );
}

interface ExcuseSubmission {
  id: string;
  notification_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  reason: string;
  status: string;
  review_note: string;
  created_at: string;
  students?: { full_name: string; class_id: string | null; classes?: { name: string } | null } | null;
  notifications?: { message: string; created_at: string } | null;
}

interface ExcuseReviewTabProps {
  isReadOnly: boolean;
}

export default function ExcuseReviewTab({ isReadOnly }: ExcuseReviewTabProps) {
  const { user } = useAuth();
  const [excuses, setExcuses] = useState<ExcuseSubmission[]>([]);
  const [reviewingExcuse, setReviewingExcuse] = useState<ExcuseSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const pendingCount = excuses.filter(e => e.status === "pending").length;

  useEffect(() => { fetchExcuses(); }, []);

  const fetchExcuses = async () => {
    const { data } = await supabase
      .from("excuse_submissions")
      .select("*, students(full_name, class_id, classes(name)), notifications(message, created_at)")
      .order("created_at", { ascending: false });
    setExcuses((data as ExcuseSubmission[]) || []);
  };

  const handleReviewExcuse = async (action: "accepted" | "rejected") => {
    if (!reviewingExcuse) return;
    setReviewLoading(true);
    try {
      await supabase.from("excuse_submissions").update({
        status: action, review_note: reviewNote,
        reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", reviewingExcuse.id);

      await supabase.from("notifications").update({
        status: action === "accepted" ? "excuse_accepted" : "excuse_rejected",
      }).eq("id", reviewingExcuse.notification_id);

      if (action === "accepted") {
        const { data: absences } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("student_id", reviewingExcuse.student_id)
          .eq("status", "absent")
          .order("date", { ascending: false })
          .limit(1);
        if (absences && absences.length > 0) {
          await supabase.from("attendance_records").update({ status: "sick_leave" }).eq("id", absences[0].id);
        }
      }

      toast({ title: action === "accepted" ? "تم القبول" : "تم الرفض", description: action === "accepted" ? "تم قبول العذر وتحديث سجل الحضور" : "تم رفض العذر" });
      fetchExcuses();
      setReviewingExcuse(null);
      setReviewNote("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setReviewLoading(false);
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            أعذار الغياب المقدمة من الطلاب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {excuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileImage className="h-12 w-12 mb-3 opacity-30" />
              <p>لا توجد أعذار مقدمة</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-right">الفصل</TableHead>
                    <TableHead className="text-right">سبب العذر</TableHead>
                    <TableHead className="text-right">الملف</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excuses.map((excuse) => (
                    <TableRow key={excuse.id} className={excuse.status === "pending" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell className="font-medium">{excuse.students?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{excuse.students?.classes?.name || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{excuse.reason || "—"}</TableCell>
                      <TableCell><ExcuseFileLink fileUrl={excuse.file_url} label="عرض" /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(excuse.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          excuse.status === "pending" ? "secondary" :
                          excuse.status === "accepted" ? "default" : "destructive"
                        } className="text-xs">
                          {excuse.status === "pending" && <Clock className="h-3 w-3 ml-1" />}
                          {excuse.status === "accepted" && <Check className="h-3 w-3 ml-1" />}
                          {excuse.status === "rejected" && <XIcon className="h-3 w-3 ml-1" />}
                          {excuse.status === "pending" ? "قيد المراجعة" :
                           excuse.status === "accepted" ? "مقبول" : "مرفوض"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {excuse.status === "pending" && !isReadOnly ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Button size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                              onClick={() => { setReviewingExcuse(excuse); setReviewNote(""); }}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excuse Review Dialog */}
      <Dialog open={!!reviewingExcuse} onOpenChange={(open) => { if (!open) setReviewingExcuse(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              مراجعة العذر
            </DialogTitle>
          </DialogHeader>
          {reviewingExcuse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">الطالب:</span>
                  <p className="font-medium">{reviewingExcuse.students?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الفصل:</span>
                  <p className="font-medium">{reviewingExcuse.students?.classes?.name}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">سبب العذر:</span>
                <p className="text-sm mt-1">{reviewingExcuse.reason || "لم يُذكر سبب"}</p>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <ExcuseImage fileUrl={reviewingExcuse.file_url} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ملاحظة المعلم (اختياري)</Label>
                <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="مثال: العذر مقبول، تم تحديث سجل الحضور" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setReviewingExcuse(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => handleReviewExcuse("rejected")}
              disabled={reviewLoading} className="gap-1.5">
              <XIcon className="h-4 w-4" /> رفض العذر
            </Button>
            <Button onClick={() => handleReviewExcuse("accepted")}
              disabled={reviewLoading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="h-4 w-4" /> قبول العذر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { type ExcuseSubmission };
