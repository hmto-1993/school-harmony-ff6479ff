import { useState } from "react";
import { getPrintOrientation, setPrintOrientation } from "@/lib/print-utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RectangleVertical, RectangleHorizontal } from "lucide-react";

export default function PrintOrientationToggle({ className }: { className?: string }) {
  const [orientation, setOrientation] = useState(getPrintOrientation);

  const handleChange = (value: string) => {
    if (value === "portrait" || value === "landscape") {
      setOrientation(value);
      setPrintOrientation(value);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={orientation}
      onValueChange={handleChange}
      className={className}
      dir="rtl"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="portrait" aria-label="عمودي" className="gap-1 text-xs px-2 h-8">
            <RectangleVertical className="h-3.5 w-3.5" />
            عمودي
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>طباعة عمودية (Portrait)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="landscape" aria-label="أفقي" className="gap-1 text-xs px-2 h-8">
            <RectangleHorizontal className="h-3.5 w-3.5" />
            أفقي
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>طباعة أفقية (Landscape)</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
