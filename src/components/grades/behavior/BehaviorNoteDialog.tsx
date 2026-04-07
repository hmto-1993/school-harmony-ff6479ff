import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type BehaviorType = "positive" | "negative" | "neutral" | null;

interface StudentBehavior {
  student_id: string;
  full_name: string;
  parent_phone: string | null;
  type: BehaviorType;
  note: string;
  severity: string;
  existingId: string | null;
  notified: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  student: StudentBehavior | undefined;
  suggestions: Record<string, string[]>;
  onTypeChange: (type: BehaviorType) => void;
  onSeverityChange: (severity: string) => void;
  onNoteChange: (note: string) => void;
}

const BEHAVIOR_OPTIONS = [
  { type: "positive" as const, label: "إيجابي", desc: "سلوك إيجابي يستحق التقدير", icon: ThumbsUp, bg: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300" },
  { type: "negative" as const, label: "سلبي", desc: "سلوك سلبي يحتاج تصحيح", icon: ThumbsDown, bg: "bg-rose-500", text: "text-rose-700 dark:text-rose-300" },
  { type: "neutral" as const, label: "محايد", desc: "سلوك محايد أو ملاحظة عامة", icon: Minus, bg: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
];

const SEVERITY_LEVELS = [
  { key: "none", label: "غير خطر", en: "Not Dangerous" },
  { key: "low", label: "منخفض", en: "Low" },
  { key: "medium", label: "متوسط", en: "Medium" },
  { key: "high", label: "عالي", en: "High" },
  { key: "critical", label: "حرج", en: "Critical" },
];

export default function BehaviorNoteDialog({
  open, onOpenChange, studentName, student, suggestions,
  onTypeChange, onSeverityChange, onNoteChange,
}: Props) {
  const currentSuggestions = student?.type ? (suggestions[student.type] || []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ملاحظة السلوك - {studentName}</DialogTitle>
        </DialogHeader>

        {student && (
          <div className="space-y-4">
            {/* Type selection */}
            <div>
              <p className="text-sm font-semibold mb-2">نوع السلوك</p>
              <div className="grid grid-cols-3 gap-2">
                {BEHAVIOR_OPTIONS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onTypeChange(item.type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      student.type === item.type
                        ? `${item.bg} text-white border-transparent shadow-lg`
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <item.icon className={cn("h-6 w-6", student.type === item.type ? "text-white" : item.text)} />
                    <span className={cn("text-sm font-bold", student.type !== item.type && item.text)}>{item.label}</span>
                    <span className={cn("text-[10px] leading-tight", student.type === item.type ? "text-white/80" : "text-muted-foreground")}>{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            {student.type === "negative" && (
              <div>
                <p className="text-sm font-semibold mb-2">مستوى الخطورة</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {SEVERITY_LEVELS.map((sev) => (
                    <button
                      key={sev.key}
                      type="button"
                      onClick={() => onSeverityChange(sev.key)}
                      className={cn(
                        "px-2 py-2.5 rounded-xl border-2 text-xs font-bold transition-all text-center",
                        (student.severity || "low") === sev.key
                          ? "bg-emerald-600 text-white border-transparent shadow-lg"
                          : "border-border bg-card text-foreground hover:bg-muted/30"
                      )}
                    >
                      <span className="block">{sev.label}</span>
                      <span className="block text-[9px] font-medium opacity-70">{sev.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {student.type && currentSuggestions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">وصف السلوك</p>
                <p className="text-xs text-muted-foreground mb-2">مقترحات سريعة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const current = student.note || "";
                        onNoteChange(current ? `${current}، ${sug}` : sug);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-[1.02]",
                        student.note?.includes(sug)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border bg-card hover:bg-muted/50 text-foreground"
                      )}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom note */}
            <div>
              <p className="text-sm font-semibold mb-2">ملاحظة مخصصة</p>
              <Textarea
                value={student.note || ""}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="اكتب ملاحظة عن سلوك الطالب..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>تم</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
