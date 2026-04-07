import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Timer } from "lucide-react";
import QuizBuilder, { type QuizQuestion } from "@/components/activities/QuizBuilder";
import ActivityClassSelector from "@/components/activities/ActivityClassSelector";
import type { Activity, ClassInfo } from "@/hooks/useActivitiesData";

interface EditActivityDialogProps {
  activity: Activity | null;
  classes: ClassInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadQuestions: (activityId: string) => Promise<QuizQuestion[]>;
  onSave: (params: {
    activity: Activity; title: string; description: string;
    duration: number; classIds: string[]; questions: QuizQuestion[];
  }) => Promise<boolean>;
}

export default function EditActivityDialog({ activity, classes, open, onOpenChange, onLoadQuestions, onSave }: EditActivityDialogProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activity && open) {
      setTitle(activity.title);
      setDesc(activity.description || "");
      setDuration(activity.duration_minutes || 0);
      setEditClasses(activity.targets.map(t => t.class_id));
      if (activity.type === "quiz") {
        onLoadQuestions(activity.id).then(setQuestions);
      } else {
        setQuestions([]);
      }
    }
  }, [activity, open]);

  const toggleClass = (classId: string) => {
    if (classId === "__all__") {
      setEditClasses(prev => prev.includes("__all__") ? [] : ["__all__"]);
      return;
    }
    setEditClasses(prev => {
      const filtered = prev.filter(c => c !== "__all__");
      return filtered.includes(classId) ? filtered.filter(c => c !== classId) : [...filtered, classId];
    });
  };

  const handleSave = async () => {
    if (!activity) return;
    setSaving(true);
    const success = await onSave({ activity, title, description: desc, duration, classIds: editClasses, questions });
    setSaving(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="text-xl">تعديل النشاط</DialogTitle></DialogHeader>
        {activity && (
          <div className="space-y-5 pt-2">
            <div>
              <Label>العنوان *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} className="mt-1 rounded-xl" />
            </div>

            {activity.type === "quiz" && (
              <>
                <div>
                  <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> المدة الزمنية (بالدقائق)</Label>
                  <Input type="number" min={0} value={duration || ""} onChange={e => setDuration(parseInt(e.target.value) || 0)} placeholder="0 = بدون مؤقت" className="mt-1 rounded-xl w-48" />
                </div>
                <div>
                  <Label className="mb-2 block">أسئلة الاختبار</Label>
                  <QuizBuilder questions={questions} onChange={setQuestions} />
                </div>
              </>
            )}

            <div>
              <Label className="mb-2 block">الفصول المنشورة</Label>
              <ActivityClassSelector classes={classes} selected={editClasses} onToggle={toggleClass} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2 rounded-xl h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
