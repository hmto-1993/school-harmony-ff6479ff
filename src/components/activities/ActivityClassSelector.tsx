import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { ClassInfo } from "@/hooks/useActivitiesData";

interface ActivityClassSelectorProps {
  classes: ClassInfo[];
  selected: string[];
  onToggle: (id: string) => void;
}

export default function ActivityClassSelector({ classes, selected, onToggle }: ActivityClassSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
      <div
        className={cn("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all",
          selected.includes("__all__") ? "border-primary bg-primary/10 text-primary" : "border-border/30 hover:border-primary/40"
        )}
        onClick={() => onToggle("__all__")}
      >
        <Checkbox checked={selected.includes("__all__")} />
        <span className="text-sm font-medium">جميع الفصول</span>
      </div>
      {classes.map(cls => (
        <div key={cls.id}
          className={cn("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all",
            selected.includes(cls.id) ? "border-primary bg-primary/10 text-primary" : "border-border/30 hover:border-primary/40"
          )}
          onClick={() => onToggle(cls.id)}
        >
          <Checkbox checked={selected.includes(cls.id) || selected.includes("__all__")} />
          <span className="text-sm">{cls.name}</span>
        </div>
      ))}
    </div>
  );
}
