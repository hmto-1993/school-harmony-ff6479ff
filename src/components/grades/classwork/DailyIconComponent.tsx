import { cn } from "@/lib/utils";
import type { DailyIcon } from "./classwork-types";

export const DailyIconComponent = ({ icon, size = "h-4 w-4" }: { icon: DailyIcon; size?: string }) => {
  if (icon.isFullScore) {
    return (
      <svg viewBox="0 0 24 24" className={cn(size, "shrink-0 text-amber-500")} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" fill="none" />
        <path d="M12 7.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4L12 15.2l-3 1.7.6-3.4-2.5-2.4 3.4-.5L12 7.5z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon.level === "excellent") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-emerald-500")} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8.6 12.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon.level === "average") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-amber-500")} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-rose-500")} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};
