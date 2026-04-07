import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Megaphone, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  action: string;
  onDismiss: () => void;
  onNavigate: (tab: string) => void;
}

const actionLabels: Record<string, string> = {
  grades: "عرض الدرجات",
  attendance: "عرض الحضور",
  behavior: "عرض السلوك",
  activities: "عرض الأنشطة",
  library: "عرض المكتبة",
};

export default function StudentPopupDialog({ open, title, message, action, onDismiss, onNavigate }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent dir="rtl" className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">{title || "رسالة من الإدارة"}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap text-center">{message}</p>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            {action && action !== "none" && (
              <Button onClick={() => { onNavigate(action); onDismiss(); }} className="w-full rounded-2xl h-11 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90">
                <ArrowRight className="h-4 w-4" />
                {actionLabels[action] || "الانتقال"}
              </Button>
            )}
            <Button
              variant={action && action !== "none" ? "outline" : "default"}
              onClick={onDismiss}
              className={cn("w-full rounded-2xl h-11 text-base font-bold", (!action || action === "none") && "bg-gradient-to-l from-primary to-accent hover:opacity-90")}
            >
              حسناً
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
