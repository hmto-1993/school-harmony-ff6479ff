import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  changeType?: "new" | "updated";
  lastChangedAt?: string;
  /** Show only if recently changed (last N days). Default: 14 days. */
  freshnessDays?: number;
  className?: string;
}

/** Vivid badge marking a beta feature as freshly added or recently updated. */
export function BetaChangeBadge({ changeType, lastChangedAt, freshnessDays = 14, className }: Props) {
  if (!changeType) return null;
  if (lastChangedAt) {
    const days = (Date.now() - new Date(lastChangedAt).getTime()) / 86_400_000;
    if (days > freshnessDays) return null;
  }
  const isNew = changeType === "new";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm border-0",
        isNew
          ? "bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/40 animate-pulse"
          : "bg-gradient-to-r from-sky-500 to-blue-600 shadow-sky-500/40",
        className,
      )}
      title={lastChangedAt ? new Date(lastChangedAt).toLocaleString("ar-SA") : undefined}
    >
      {isNew ? <Sparkles className="h-2.5 w-2.5" /> : <RefreshCw className="h-2.5 w-2.5" />}
      {isNew ? "جديد" : "محدَّث"}
    </span>
  );
}
