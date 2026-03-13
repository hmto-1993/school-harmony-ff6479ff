import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import QuizStatistics from "@/components/activities/QuizStatistics";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, FileUp, ClipboardList, Eye, EyeOff, Trash2, Upload, Loader2,
  Send, BarChart3, FileText, Users, Search, ArrowRight, BookOpen, Pencil, Timer, ChevronDown, Bell, Lock
} from "lucide-react";
import { sendPushNotification } from "@/lib/push-notifications";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import QuizBuilder, { type QuizQuestion } from "@/components/activities/QuizBuilder";
import ActivityResults from "@/components/activities/ActivityResults";
import { SignedFileLink } from "@/components/activities/SignedFileLink";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import EmptyState from "@/components/EmptyState";

interface ClassInfo { id: string; name: string; grade: string; section: string; }
interface Activity {
  id: string; title: string; description: string | null; type: string;
  file_url: string | null; file_name: string | null; is_visible: boolean;
  allow_student_uploads: boolean; created_at: string; created_by: string;
  duration_minutes: number;
  targets: { class_id: string; allow_student_uploads: boolean; classes?: ClassInfo }[];
  question_count?: number;
}

export default function ActivitiesPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"file" | "quiz">("file");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [sendNotification, setSendNotification] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState(0);
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Results view
  const [resultsActivity, setResultsActivity] = useState<Activity | null>(null);
  const [resultsClassId, setResultsClassId] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("id, name, grade, section").order("grade");
    if (data) setClasses(data);
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("teacher_activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const ids = data.map((a: any) => a.id);
      const [{ data: targets }, { data: qCounts }] = await Promise.all([
        supabase.from("activity_class_targets").select("*, classes(id, name, grade, section)").in("activity_id", ids.length ? ids : ["__none__"]),
        supabase.from("quiz_questions").select("activity_id").in("activity_id", ids.length ? ids : ["__none__"]),
      ]);

      const qCountMap: Record<string, number> = {};
      qCounts?.forEach((q: any) => { qCountMap[q.activity_id] = (qCountMap[q.activity_id] || 0) + 1; });

      setActivities(data.map((a: any) => ({
        ...a,
        targets: (targets || []).filter((t: any) => t.activity_id === a.id),
        question_count: qCountMap[a.id] || 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClasses(); fetchActivities(); }, [fetchClasses, fetchActivities]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user || selectedClasses.length === 0) {
      toast({ title: "أكمل جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (createType === "quiz" && quizQuestions.length === 0) {
      toast({ title: "أضف سؤالاً واحداً على الأقل", variant: "destructive" });
      return;
    }
    setCreating(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (createType === "file" && selectedFile) {
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const { error: upErr } = await supabase.storage.from("activities").upload(`files/${safeName}`, selectedFile);
      if (upErr) {
        toast({ title: "خطأ في رفع الملف", description: upErr.message, variant: "destructive" });
        setCreating(false);
        return;
      }
      // Store path for private bucket — signed URLs generated on demand
      fileUrl = `files/${safeName}`;
      fileName = selectedFile.name;
    }

    const targetIds = selectedClasses.includes("__all__") ? classes.map(c => c.id) : selectedClasses;

    const { data: activity, error } = await supabase.from("teacher_activities").insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      type: createType,
      file_url: fileUrl,
      file_name: fileName,
      created_by: user.id,
      duration_minutes: createType === "quiz" ? newDuration : 0,
    } as any).select().single();

    if (error || !activity) {
      toast({ title: "خطأ", description: error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    await supabase.from("activity_class_targets").insert(targetIds.map(cid => ({ activity_id: activity.id, class_id: cid })) as any);

    if (createType === "quiz" && quizQuestions.length > 0) {
      await supabase.from("quiz_questions").insert(quizQuestions.map((q, i) => ({
        activity_id: activity.id, question_text: q.question_text, question_type: q.question_type,
        image_url: q.image_url || null, options: q.options, correct_answer: q.correct_answer, sort_order: i,
      })) as any);
    }

    toast({ title: `تم إنشاء ${createType === "quiz" ? "الاختبار" : "النشاط"} ونشره في ${targetIds.length} فصل` });

    // Send push notification if enabled
    if (sendNotification) {
      try {
        await sendPushNotification(
          createType === "quiz" ? "🎯 اختبار جديد" : "📄 نشاط جديد",
          newTitle.trim(),
          targetIds
        );
        toast({ title: "تم إرسال الإشعار للطلاب" });
      } catch (e) {
        console.error("Push notification failed:", e);
      }
    }

    resetCreate();
    fetchActivities();
  };

  const resetCreate = () => {
    setCreateOpen(false); setNewTitle(""); setNewDesc(""); setNewDuration(0);
    setSelectedFile(null); setSelectedClasses([]); setQuizQuestions([]); setCreateType("file"); setCreating(false);
  };

  // ===== Edit =====
  const openEdit = async (activity: Activity) => {
    setEditActivity(activity);
    setEditTitle(activity.title);
    setEditDesc(activity.description || "");
    setEditDuration(activity.duration_minutes || 0);
    setEditClasses(activity.targets.map(t => t.class_id));

    if (activity.type === "quiz") {
      const { data } = await supabase.from("quiz_questions").select("*").eq("activity_id", activity.id).order("sort_order");
      setEditQuestions((data || []).map((q: any) => ({
        id: q.id, question_text: q.question_text, question_type: q.question_type,
        image_url: q.image_url, options: q.options, correct_answer: q.correct_answer, sort_order: q.sort_order,
      })));
    } else {
      setEditQuestions([]);
    }
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editActivity || !editTitle.trim()) return;
    setSaving(true);

    await supabase.from("teacher_activities").update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      duration_minutes: editActivity.type === "quiz" ? editDuration : 0,
    } as any).eq("id", editActivity.id);

    // Update class targets: delete old, insert new
    await supabase.from("activity_class_targets").delete().eq("activity_id", editActivity.id);
    const targetIds = editClasses.includes("__all__") ? classes.map(c => c.id) : editClasses;
    if (targetIds.length) {
      await supabase.from("activity_class_targets").insert(targetIds.map(cid => ({ activity_id: editActivity.id, class_id: cid })) as any);
    }

    // Update quiz questions if quiz
    if (editActivity.type === "quiz") {
      await supabase.from("quiz_questions").delete().eq("activity_id", editActivity.id);
      if (editQuestions.length) {
        await supabase.from("quiz_questions").insert(editQuestions.map((q, i) => ({
          activity_id: editActivity.id, question_text: q.question_text, question_type: q.question_type,
          image_url: q.image_url || null, options: q.options, correct_answer: q.correct_answer, sort_order: i,
        })) as any);
      }
    }

    toast({ title: "تم تحديث النشاط بنجاح" });
    setSaving(false);
    setEditOpen(false);
    setEditActivity(null);
    fetchActivities();
  };

  const toggleEditClass = (classId: string) => {
    if (classId === "__all__") {
      setEditClasses(prev => prev.includes("__all__") ? [] : ["__all__"]);
      return;
    }
    setEditClasses(prev => {
      const filtered = prev.filter(c => c !== "__all__");
      return filtered.includes(classId) ? filtered.filter(c => c !== classId) : [...filtered, classId];
    });
  };

  const toggleVisibility = async (activityId: string, current: boolean) => {
    await supabase.from("teacher_activities").update({ is_visible: !current } as any).eq("id", activityId);
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_visible: !current } : a));
    toast({ title: !current ? "مرئي للطلاب" : "مخفي عن الطلاب" });
  };

  const toggleStudentUploads = async (activityId: string, classId: string, current: boolean) => {
    await supabase.from("activity_class_targets").update({ allow_student_uploads: !current } as any).eq("activity_id", activityId).eq("class_id", classId);
    setActivities(prev => prev.map(a => {
      if (a.id !== activityId) return a;
      return { ...a, targets: a.targets.map(t => t.class_id === classId ? { ...t, allow_student_uploads: !current } : t) };
    }));
    toast({ title: !current ? "رفع الملفات مفعّل" : "رفع الملفات معطّل" });
  };

  const deleteActivity = async (id: string) => {
    await supabase.from("teacher_activities").delete().eq("id", id);
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({ title: "تم حذف النشاط" });
  };

  const toggleClassSelection = (classId: string) => {
    if (classId === "__all__") {
      setSelectedClasses(prev => prev.includes("__all__") ? [] : ["__all__"]);
      return;
    }
    setSelectedClasses(prev => {
      const filtered = prev.filter(c => c !== "__all__");
      return filtered.includes(classId) ? filtered.filter(c => c !== classId) : [...filtered, classId];
    });
  };

  const filtered = activities.filter(a => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterClass !== "all" && !a.targets.some(t => t.class_id === filterClass)) return false;
    if (search && !a.title.includes(search)) return false;
    return true;
  });

  // Shared class selector component
  const ClassSelector = ({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
      <div
        className={cn("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all",
          selected.includes("__all__") ? "border-primary bg-primary/10 text-primary" : "border-border/30 hover:border-primary/40"
        )}
        onClick={() => onToggle("__all__")}
      >
        <Checkbox checked={selected.includes("__all__")} />
        <span className="text-sm font-medium">جميع الفصول</span>
      </div>
      {classes.map(cls => (
        <div key={cls.id}
          className={cn("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all",
            selected.includes(cls.id) ? "border-primary bg-primary/10 text-primary" : "border-border/30 hover:border-primary/40"
          )}
          onClick={() => onToggle(cls.id)}
        >
          <Checkbox checked={selected.includes(cls.id) || selected.includes("__all__")} />
          <span className="text-sm">{cls.name}</span>
        </div>
      ))}
    </div>
  );

  const isViewOnly = perms.read_only_mode && role !== "admin";

  const ActivityCard = ({ activity, ai }: { activity: Activity; ai: number }) => (
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
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(activity)} title="تعديل">
              <Pencil className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => toggleVisibility(activity.id, activity.is_visible)}
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
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteActivity(activity.id)}>حذف</AlertDialogAction>
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
                    onCheckedChange={() => toggleStudentUploads(activity.id, target.class_id, target.allow_student_uploads)}
                    className="scale-75" />
                </div>
                )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 rounded-lg"
                  onClick={() => { setResultsActivity(activity); setResultsClassId(target.class_id); }}>
                  <BarChart3 className="h-3 w-3" /> النتائج
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
        {!isViewOnly && (
        <Dialog open={createOpen} onOpenChange={v => { if (!v) resetCreate(); else setCreateOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-lg"><Plus className="h-4 w-4" /> نشاط جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle className="text-xl">إنشاء نشاط جديد</DialogTitle></DialogHeader>
            <div className="space-y-5 pt-2">
              <Tabs value={createType} onValueChange={v => setCreateType(v as any)} dir="rtl">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="file" className="gap-1.5"><FileUp className="h-4 w-4" /> ملف</TabsTrigger>
                  <TabsTrigger value="quiz" className="gap-1.5"><ClipboardList className="h-4 w-4" /> اختبار</TabsTrigger>
                </TabsList>
              </Tabs>

              <div>
                <Label>العنوان *</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="عنوان النشاط..." className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>الوصف</Label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="وصف مختصر (اختياري)..." className="mt-1 rounded-xl" />
              </div>

              {createType === "quiz" && (
                <div>
                  <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> المدة الزمنية (بالدقائق)</Label>
                  <Input type="number" min={0} value={newDuration || ""} onChange={e => setNewDuration(parseInt(e.target.value) || 0)} placeholder="0 = بدون مؤقت" className="mt-1 rounded-xl w-48" />
                  <p className="text-xs text-muted-foreground mt-1">اترك 0 لعدم تحديد وقت</p>
                </div>
              )}

              {createType === "file" && (
                <div>
                  <Label>الملف</Label>
                  <div className="mt-1">
                    <label className="flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 cursor-pointer transition-colors bg-muted/20">
                      <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{selectedFile ? selectedFile.name : "اختر ملفاً أو اسحبه هنا"}</span>
                    </label>
                  </div>
                </div>
              )}

              {createType === "quiz" && (
                <div>
                  <Label className="mb-2 block">أسئلة الاختبار</Label>
                  <QuizBuilder questions={quizQuestions} onChange={setQuizQuestions} />
                </div>
              )}

              <div>
                <Label className="mb-2 block">النشر في الفصول *</Label>
                <ClassSelector selected={selectedClasses} onToggle={toggleClassSelection} />
              </div>

              <div className="flex items-center justify-between bg-muted/30 rounded-2xl p-4 border border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">إرسال إشعار فوري</p>
                    <p className="text-xs text-muted-foreground">تنبيه الطلاب عند النشر</p>
                  </div>
                </div>
                <Switch checked={sendNotification} onCheckedChange={setSendNotification} />
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full gap-2 rounded-xl h-11">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {creating ? "جاري النشر..." : "إنشاء ونشر"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) { setEditOpen(false); setEditActivity(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl">تعديل النشاط</DialogTitle></DialogHeader>
          {editActivity && (
            <div className="space-y-5 pt-2">
              <div>
                <Label>العنوان *</Label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>الوصف</Label>
                <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1 rounded-xl" />
              </div>

              {editActivity.type === "quiz" && (
                <>
                  <div>
                    <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> المدة الزمنية (بالدقائق)</Label>
                    <Input type="number" min={0} value={editDuration || ""} onChange={e => setEditDuration(parseInt(e.target.value) || 0)} placeholder="0 = بدون مؤقت" className="mt-1 rounded-xl w-48" />
                  </div>
                  <div>
                    <Label className="mb-2 block">أسئلة الاختبار</Label>
                    <QuizBuilder questions={editQuestions} onChange={setEditQuestions} />
                  </div>
                </>
              )}

              <div>
                <Label className="mb-2 block">الفصول المنشورة</Label>
                <ClassSelector selected={editClasses} onToggle={toggleEditClass} />
              </div>

              <Button onClick={handleSaveEdit} disabled={saving} className="w-full gap-2 rounded-xl h-11">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Collapsible Sections */}
      {!resultsActivity && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد أنشطة بعد"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quiz Statistics - Collapsible */}
            {filtered.some(a => a.type === "quiz") && (
              <Collapsible defaultOpen>
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500/5 via-card to-purple-500/5">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-right">
                          <h2 className="text-lg font-bold text-foreground">إحصائيات الاختبارات</h2>
                          <p className="text-xs text-muted-foreground">تحليل الأداء ومعدلات النجاح</p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="px-5 pb-5 pt-0">
                      <QuizStatistics />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Quizzes Section - Collapsible */}
            {(filterType === "all" || filterType === "quiz") && (() => {
              const quizActivities = filtered.filter(a => a.type === "quiz");
              if (quizActivities.length === 0) return null;
              return (
                <Collapsible defaultOpen>
                  <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/5 via-card to-violet-500/5">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <ClipboardList className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-right">
                            <h2 className="text-lg font-bold text-foreground">الاختبارات</h2>
                            <p className="text-xs text-muted-foreground">{quizActivities.length} اختبار</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 rounded-full text-xs font-bold px-3">
                            {quizActivities.length}
                          </Badge>
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-5 pb-5 pt-0 space-y-3">
                        {quizActivities.map((activity, ai) => (
                          <ActivityCard key={activity.id} activity={activity} ai={ai} />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* Files Section - Collapsible */}
            {(filterType === "all" || filterType === "file") && (() => {
              const fileActivities = filtered.filter(a => a.type === "file");
              if (fileActivities.length === 0) return null;
              return (
                <Collapsible defaultOpen>
                  <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500/5 via-card to-blue-500/5">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <FileUp className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-right">
                            <h2 className="text-lg font-bold text-foreground">الأنشطة والملفات</h2>
                            <p className="text-xs text-muted-foreground">{fileActivities.length} نشاط</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20 rounded-full text-xs font-bold px-3">
                            {fileActivities.length}
                          </Badge>
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-5 pb-5 pt-0 space-y-3">
                        {fileActivities.map((activity, ai) => (
                          <ActivityCard key={activity.id} activity={activity} ai={ai} />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}
          </div>
        )
      )}
    </div>
  );
}
