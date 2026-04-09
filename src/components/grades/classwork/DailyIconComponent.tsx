import { cn } from "@/lib/utils";
import type { DailyIcon } from "./classwork-types";

export const DailyIconComponent = ({ icon, size = "h-4 w-4" }: { icon: DailyIcon; size?: string }) => {
  if (icon.isFullScore) {
    return (
      <svg viewBox="0 0 24 24" className={cn(size, "shrink-0")} aria-hidden="true">
        <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.27l-5.8 3.18 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
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
