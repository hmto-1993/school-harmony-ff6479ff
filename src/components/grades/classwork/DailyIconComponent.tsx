import { CircleCheck, CircleMinus, CircleX, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyIcon } from "./classwork-types";

export const DailyIconComponent = ({ icon, size = "h-4 w-4" }: { icon: DailyIcon; size?: string }) => {
  if (icon.isFullScore) return <Star className={cn(size, "text-amber-500 fill-amber-400")} />;
  if (icon.level === "excellent") return <CircleCheck className={cn(size, "text-emerald-600 dark:text-emerald-400")} />;
  if (icon.level === "average") return <CircleMinus className={cn(size, "text-amber-500 dark:text-amber-400")} />;
  return <CircleX className={cn(size, "text-rose-500 dark:text-rose-400")} />;
};
