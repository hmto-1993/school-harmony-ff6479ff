import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Award, X } from "lucide-react";

interface FullMarkGrade {
  categoryName: string;
  score: number;
  maxScore: number;
  period: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentName: string;
  className: string;
  subjectName: string;
  fullMarks: FullMarkGrade[];
  onShowCert: () => void;
  fireConfetti: () => void;
  confettiFired: boolean;
}

export default function AchievementDetailDialog({ open, onOpenChange, studentName, className, subjectName, fullMarks, onShowCert, fireConfetti, confettiFired }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v && !confettiFired) setTimeout(fireConfetti, 200); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Trophy className="h-5 w-5" />تفاصيل التميّز
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-4 space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
            <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-xl shadow-amber-400/30">
              <Trophy className="h-10 w-10 text-amber-900" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{studentName}</p>
            <p className="text-sm text-muted-foreground">{className}</p>
          </div>
          <div className="space-y-2">
            {fullMarks.map((f, i) => (
              <div key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 border border-amber-300/50 dark:border-amber-700/50 mx-1">
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{f.categoryName}: {f.score}/{f.maxScore}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            تهنئة على حصولك على الدرجة الكاملة في مادة <strong>{subjectName}</strong>. واصل تميّزك!
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />إغلاق
          </Button>
          <Button onClick={onShowCert} className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950">
            <Award className="h-4 w-4" />عرض الشهادة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
