import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  locked: boolean;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  children: ReactNode;
}

export default function DraggableWidget({
  id,
  locked,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  children,
}: Props) {
  if (locked) return <>{children}</>;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragEnd={onDragEnd}
      className={cn(
        "relative group transition-all duration-200 rounded-xl",
        isDragging ? "opacity-50 scale-[0.98]" : "opacity-100",
        !locked && "ring-2 ring-dashed ring-primary/20 hover:ring-primary/40"
      )}
    >
      {/* Drag handle */}
      <div className="absolute top-2 left-2 z-10 p-1.5 rounded-lg border border-border/40 bg-card shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
