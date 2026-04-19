import { ReactNode, useState, MouseEvent } from "react";
import { Lock, Crown, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { cn } from "@/lib/utils";

interface PremiumGateProps {
  children: ReactNode;
  /** Short feature name shown in the upgrade dialog */
  featureName: string;
  /** Optional longer description shown in the dialog */
  description?: string;
  /** Hide the lock chip overlay, keep block behavior only */
  hideLock?: boolean;
  className?: string;
}

/**
 * Wraps premium-only UI. For basic users it overlays a lock and blocks
 * all interactions, opening a professional upgrade dialog on click.
 * Premium users / developers see the children unchanged.
 */
export function PremiumGate({ children, featureName, description, hideLock, className }: PremiumGateProps) {
  const { loaded, isPremium } = useSubscriptionTier();
  const [open, setOpen] = useState(false);

  if (!loaded || isPremium) return <>{children}</>;

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <div
        className={cn("relative inline-block w-full", className)}
        onClickCapture={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`${featureName} - ميزة بريميوم`}
      >
        <div className="pointer-events-none select-none opacity-50 grayscale">{children}</div>
        {!hideLock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-md">
            <Badge className="gap-1 bg-amber-500/95 hover:bg-amber-500 text-white border-amber-600 shadow-lg cursor-pointer">
              <Lock className="h-3 w-3" />
              بريميوم
            </Badge>
          </div>
        )}
      </div>

      <UpgradeDialog open={open} onOpenChange={setOpen} featureName={featureName} description={description} />
    </>
  );
}

export function UpgradeDialog({
  open, onOpenChange, featureName, description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  featureName: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-xl">ميزة حصرية لمشتركي ألفا بريميوم</DialogTitle>
          <DialogDescription className="text-center pt-2">
            <span className="block font-semibold text-foreground mb-2">{featureName}</span>
            {description || "هذه الميزة متاحة حصرياً ضمن باقة ألفا بريميوم. تواصل مع الإدارة لترقية اشتراكك والاستفادة من جميع المميزات المتقدمة."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 my-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
            <Sparkles className="h-4 w-4" />
            مميزات باقة بريميوم
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <li>• المؤثرات الصوتية والبصرية في الرادار الذكي</li>
            <li>• مساعد الصياغة بالذكاء الاصطناعي</li>
            <li>• سجل الزيارات والتقارير المتقدمة</li>
            <li>• الإشعارات التلقائية الذكية</li>
            <li>• كافة الميزات التجريبية في مختبر ألفا</li>
          </ul>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>حسناً، فهمت</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
