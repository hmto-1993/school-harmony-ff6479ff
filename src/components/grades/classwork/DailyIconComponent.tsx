import { cn } from "@/lib/utils";
import type { DailyIcon } from "./classwork-types";

export const DailyIconComponent = ({ icon, size = "h-5 w-5" }: { icon: DailyIcon; size?: string }) => {
  const sizeNum = size.includes("3") ? 14 : size.includes("4") ? 16 : size.includes("5") ? 20 : size.includes("6") ? 24 : 20;

  if (icon.isFullScore) {
    return (
      <svg viewBox="0 0 24 24" width={sizeNum} height={sizeNum} className={cn("shrink-0", size)} style={{ color: "#d97706" }}>
        <path d="M12 3.75l2.55 5.17 5.7.83-4.13 4.03.98 5.68L12 16.78 6.9 19.46l.98-5.68-4.13-4.03 5.7-.83L12 3.75z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon.level === "excellent") {
    return (
      <svg viewBox="0 0 24 24" width={sizeNum} height={sizeNum} className={cn("shrink-0", size)} style={{ color: "#059669" }} fill="none">
        <path d="M6 12.5l4 4 8-8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon.level === "average") {
    return (
      <svg viewBox="0 0 24 24" width={sizeNum} height={sizeNum} className={cn("shrink-0", size)} style={{ color: "#ea580c" }} fill="none">
        <path d="M6 12h12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={sizeNum} height={sizeNum} className={cn("shrink-0", size)} style={{ color: "#e11d48" }} fill="none">
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M17 7l-10 10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
};
