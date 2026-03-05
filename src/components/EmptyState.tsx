import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 animate-fade-in", className)}>
      {/* Layered icon background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 blur-xl scale-150" />
        <div className={cn(
          "relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/15 dark:to-accent/15 shadow-inner",
          iconClassName
        )}>
          <Icon className="h-9 w-9 text-primary/60" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
