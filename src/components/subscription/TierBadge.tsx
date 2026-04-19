import { Crown, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Show even when loading (skeleton-less). Default: false. */
  showWhenLoading?: boolean;
}

export default function TierBadge({ className, showWhenLoading }: Props) {
  const { loaded, tier, isDeveloper } = useSubscriptionTier();

  if (!loaded && !showWhenLoading) return null;

  if (isDeveloper) {
    return (
      <Badge
        className={cn(
          "gap-1 border-0 text-white shadow-lg",
          "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500",
          className,
        )}
        title="صلاحيات المطور المطلقة"
      >
        <Shield className="h-3 w-3" />
        مطور
      </Badge>
    );
  }

  if (tier === "premium") {
    return (
      <Badge
        className={cn(
          "gap-1 border-0 text-white shadow-md",
          "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600",
          className,
        )}
        title="باقة ألفا بريميوم"
      >
        <Crown className="h-3 w-3" />
        بريميوم
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-slate-400/50 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700",
        "dark:from-slate-700 dark:to-slate-600 dark:text-slate-200",
        className,
      )}
      title="الباقة الأساسية"
    >
      <Shield className="h-3 w-3" />
      أساسية
    </Badge>
  );
}
