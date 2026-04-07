import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, AlertTriangle, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "warning" | "achievement" | null;
  studentName: string;
  fullMarkNames: string;
  onViewDetails: () => void;
}

export default function LoginPopupDialog({ open, onOpenChange, type, studentName, fullMarkNames, onViewDetails }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-0 shadow-2xl p-0 overflow-hidden" dir="rtl">
        <div className={cn("p-6 text-center", type === "achievement" ? "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500" : "bg-gradient-to-br from-red-500 via-rose-500 to-red-600")}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }} className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-3">
            {type === "achievement" ? <Trophy className="h-8 w-8 text-amber-950" /> : <AlertTriangle className="h-8 w-8 text-white" />}
          </motion.div>
          <DialogHeader>
            <DialogTitle className={cn("text-lg font-bold", type === "achievement" ? "text-amber-950" : "text-white")}>
              {type === "achievement" ? "🎉 مبارك! حصلت على الدرجة الكاملة" : "⚠️ لديك إنذار غياب جديد"}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-center text-muted-foreground leading-relaxed">
            {type === "achievement" ? `تهنئة خاصة لك يا ${studentName} على تميّزك في ${fullMarkNames}!` : `تم تسجيل إنذار غياب جديد في حسابك. يُرجى مراجعة التفاصيل.`}
          </p>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button className={cn("w-full rounded-2xl h-11 text-sm font-bold", type === "achievement" ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950" : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white")} onClick={onViewDetails}>
              <Eye className="h-4 w-4 ml-1" />عرض التفاصيل
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full rounded-2xl h-10 text-sm">لاحقاً</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
