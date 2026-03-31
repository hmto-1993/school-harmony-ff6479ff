import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToSaveProps {
  targetId?: string;
  label?: string;
}

export default function ScrollToSaveButton({ targetId = "save-area", label = "حفظ ↓" }: ScrollToSaveProps) {
  const handleClick = () => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-primary gap-1 no-print"
    >
      {label}
      <ChevronDown className="h-3 w-3" />
    </Button>
  );
}
