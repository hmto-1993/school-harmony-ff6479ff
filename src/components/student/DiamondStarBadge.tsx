import { cn } from "@/lib/utils";
import { Sparkles, Star } from "lucide-react";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

/**
 * Diamond Star Badge - shown next to honored students' names
 * Criteria: 0 absences this month + Full mark in latest test
 */
export default function DiamondStarBadge({ size = "sm", className, showTooltip = true }: Props) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const containerClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6", 
    lg: "w-7 h-7",
  };

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        containerClasses[size],
        className
      )}
      title={showTooltip ? "⭐ طالب متميز - لوحة الشرف" : undefined}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/40 to-yellow-500/40 blur-sm animate-pulse" />
      
      {/* Diamond shape with star */}
      <div className={cn(
        "relative flex items-center justify-center",
        "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500",
        "rounded-sm rotate-45 shadow-md shadow-amber-400/30",
        size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-4.5 h-4.5" : "w-5.5 h-5.5"
      )}>
        <Star 
          className={cn(
            "-rotate-45 text-amber-900 fill-amber-900",
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3 w-3"
          )} 
        />
      </div>
    </div>
  );
}

/**
 * Hook to check if a student is on the honor roll
 */
export function useHonorRollStatus(studentId: string | undefined) {
  // This would typically be fetched from context or a query
  // For now, it returns a placeholder - the actual logic is in HonorRoll component
  return { isHonored: false };
}
