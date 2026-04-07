import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileUp, ClipboardList, Upload, Loader2, Send, Timer, Bell } from "lucide-react";
import QuizBuilder, { type QuizQuestion } from "@/components/activities/QuizBuilder";
import ActivityClassSelector from "@/components/activities/ActivityClassSelector";
import type { ClassInfo } from "@/hooks/useActivitiesData";

interface CreateActivityDialogProps {
  classes: ClassInfo[];
  onCreate: (params: {
    title: string; description: string; type: "file" | "quiz";
    duration: number; file: File | null; classIds: string[];
    questions: QuizQuestion[]; notify: boolean;
  }) => Promise<boolean>;
}

export default function CreateActivityDialog({ classes, onCreate }: CreateActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"file" | "quiz">("file");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [notify, setNotify] = useState(true);

  const reset = () => {
    setOpen(false); setTitle(""); setDesc(""); setDuration(0);
    setFile(null); setSelectedClasses([]); setQuestions([]); setType("file"); setCreating(false);
  };

  const toggleClass = (classId: string) => {
    if (classId === "__all__") {
      setSelectedClasses(prev => prev.includes("__all__") ? [] : ["__all__"]);
      return;
    }
    setSelectedClasses(prev => {
      const filtered = prev.filter(c => c !== "__all__");
      return filtered.includes(classId) ? filtered.filter(c => c !== classId) : [...filtered, classId];
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    const success = await onCreate({ title, description: desc, type, duration, file, classIds: selectedClasses, questions, notify });
    if (success) reset();
    else setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-lg"><Plus className="h-4 w-4" /> نشاط جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="text-xl">إنشاء نشاط جديد</DialogTitle></DialogHeader>
        <div className="space-y-5 pt-2">
          <Tabs value={type} onValueChange={v => setType(v as any)} dir="rtl">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="file" className="gap-1.5"><FileUp className="h-4 w-4" /> ملف</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><ClipboardList className="h-4 w-4" /> اختبار</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Label>العنوان *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان النشاط..." className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر (اختياري)..." className="mt-1 rounded-xl" />
          </div>

          {type === "quiz" && (
            <div>
              <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> المدة الزمنية (بالدقائق)</Label>
              <Input type="number" min={0} value={duration || ""} onChange={e => setDuration(parseInt(e.target.value) || 0)} placeholder="0 = بدون مؤقت" className="mt-1 rounded-xl w-48" />
              <p className="text-xs text-muted-foreground mt-1">اترك 0 لعدم تحديد وقت</p>
            </div>
          )}

          {type === "file" && (
            <div>
              <Label>الملف</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 cursor-pointer transition-colors bg-muted/20">
                  <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : "اختر ملفاً أو اسحبه هنا"}</span>
                </label>
              </div>
            </div>
          )}

          {type === "quiz" && (
            <div>
              <Label className="mb-2 block">أسئلة الاختبار</Label>
              <QuizBuilder questions={questions} onChange={setQuestions} />
            </div>
          )}

          <div>
            <Label className="mb-2 block">النشر في الفصول *</Label>
            <ActivityClassSelector classes={classes} selected={selectedClasses} onToggle={toggleClass} />
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
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full gap-2 rounded-xl h-11">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {creating ? "جاري النشر..." : "إنشاء ونشر"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
