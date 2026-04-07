import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivitiesData, type Activity } from "@/hooks/useActivitiesData";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRight, BookOpen, Eye, Loader2, Lock } from "lucide-react";
import CreateActivityDialog from "@/components/activities/CreateActivityDialog";
import EditActivityDialog from "@/components/activities/EditActivityDialog";
import ActivitiesSections from "@/components/activities/ActivitiesSections";
import ActivityResults from "@/components/activities/ActivityResults";
import EmptyState from "@/components/EmptyState";

export default function ActivitiesPage() {
  const { role } = useAuth();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const { classes, activities, loading, createActivity, saveEdit, toggleVisibility, toggleStudentUploads, deleteActivity, loadQuizQuestions } = useActivitiesData();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

  // Results view
  const [resultsActivity, setResultsActivity] = useState<Activity | null>(null);
  const [resultsClassId, setResultsClassId] = useState<string | null>(null);

  const filtered = activities.filter(a => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterClass !== "all" && !a.targets.some(t => t.class_id === filterClass)) return false;
    if (search && !a.title.includes(search)) return false;
    return true;
  });

  const isViewOnly = perms.read_only_mode && role !== "admin";

  const openEdit = (activity: Activity) => {
    setEditActivity(activity);
    setEditOpen(true);
  };

  if (permsLoaded && !perms.can_view_activities && !perms.read_only_mode && role !== "admin") {
    return <EmptyState icon={Lock} title="لا تملك صلاحية عرض الأنشطة" description="تواصل مع المسؤول لتفعيل صلاحية عرض الأنشطة" />;
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            الأنشطة والاختبارات
            {perms.can_view_activities && (!perms.can_manage_grades || perms.read_only_mode) && <Badge variant="secondary" className="text-[10px] gap-1"><Eye className="h-3 w-3" /> عرض فقط</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إنشاء ونشر الملفات والاختبارات للفصول</p>
        </div>
        {!isViewOnly && <CreateActivityDialog classes={classes} onCreate={createActivity} />}
      </div>

      {/* Edit Dialog */}
      <EditActivityDialog
        activity={editActivity}
        classes={classes}
        open={editOpen}
        onOpenChange={v => { if (!v) { setEditOpen(false); setEditActivity(null); } else setEditOpen(true); }}
        onLoadQuestions={loadQuizQuestions}
        onSave={saveEdit}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-10 rounded-xl" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="file">ملفات</SelectItem>
            <SelectItem value="quiz">اختبارات</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="الفصل" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفصول</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results view */}
      {resultsActivity && resultsClassId && (
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <Button variant="ghost" size="sm" onClick={() => { setResultsActivity(null); setResultsClassId(null); }} className="gap-1.5 mb-4">
              <ArrowRight className="h-4 w-4 rotate-180" /> العودة
            </Button>
            <ActivityResults activityId={resultsActivity.id} activityType={resultsActivity.type} classId={resultsClassId}
              className={resultsActivity.targets.find(t => t.class_id === resultsClassId)?.classes?.name || ""} />
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!resultsActivity && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد أنشطة بعد"}</p>
          </div>
        ) : (
          <ActivitiesSections
            filtered={filtered}
            filterType={filterType}
            isViewOnly={isViewOnly}
            onEdit={openEdit}
            onToggleVisibility={toggleVisibility}
            onToggleUploads={toggleStudentUploads}
            onDelete={deleteActivity}
            onViewResults={(activity, classId) => { setResultsActivity(activity); setResultsClassId(classId); }}
          />
        )
      )}
    </div>
  );
}
