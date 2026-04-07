import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ClipboardList, FileUp, Eye, EyeOff, Trash2, BarChart3, FileText, Users, Pencil, Timer } from "lucide-react";
import { SignedFileLink } from "@/components/activities/SignedFileLink";
import { format } from "date-fns";
import type { Activity } from "@/hooks/useActivitiesData";

interface ActivityCardProps {
  activity: Activity;
  ai: number;
  isViewOnly: boolean;
  onEdit: (activity: Activity) => void;
  onToggleVisibility: (id: string, current: boolean) => void;
  onToggleUploads: (activityId: string, classId: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onViewResults: (activity: Activity, classId: string) => void;
}

export default function ActivityCard({
  activity, ai, isViewOnly, onEdit, onToggleVisibility, onToggleUploads, onDelete, onViewResults,
}: ActivityCardProps) {
  return (
    <Card className={cn("border-0 shadow-md rounded-2xl overflow-hidden transition-all hover:shadow-lg", !activity.is_visible && "opacity-60")}
      style={{ animationDelay: `${ai * 50}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              activity.type === "quiz" ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
            )}>
              {activity.type === "quiz" ? <ClipboardList className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground truncate">{activity.title}</h3>
              {activity.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{activity.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs rounded-full">
                  {activity.type === "quiz" ? `اختبار • ${activity.question_count} سؤال` : "ملف"}
                </Badge>
                {activity.type === "quiz" && activity.duration_minutes > 0 && (
                  <Badge variant="outline" className="text-xs rounded-full gap-1">
                    <Timer className="h-3 w-3" /> {activity.duration_minutes} دقيقة
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{format(new Date(activity.created_at), "yyyy/MM/dd")}</span>
                {activity.file_name && activity.file_url && (
                  <SignedFileLink bucket="activities" path={activity.file_url} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {activity.file_name}
                  </SignedFileLink>
                )}
              </div>
            </div>
          </div>
          {!isViewOnly && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onEdit(activity)} title="تعديل">
                <Pencil className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onToggleVisibility(activity.id, activity.is_visible)}
                title={activity.is_visible ? "مرئي" : "مخفي"}>
                {activity.is_visible ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف النشاط؟</AlertDialogTitle>
                    <AlertDialogDescription>سيتم حذف النشاط نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(activity.id)}>حذف</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-border/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">الفصول المنشورة ({activity.targets.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activity.targets.map(target => (
              <div key={target.class_id} className="flex items-center gap-1.5 bg-muted/30 rounded-xl px-3 py-1.5 border border-border/20">
                <span className="text-sm font-medium">{target.classes?.name || "—"}</span>
                {!isViewOnly && (
                  <div className="flex items-center gap-1 mr-2">
                    <span className="text-[10px] text-muted-foreground">رفع ملفات</span>
                    <Switch checked={target.allow_student_uploads}
                      onCheckedChange={() => onToggleUploads(activity.id, target.class_id, target.allow_student_uploads)}
                      className="scale-75" />
                  </div>
                )}
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 rounded-lg"
                  onClick={() => onViewResults(activity, target.class_id)}>
                  <BarChart3 className="h-3 w-3" /> النتائج
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
