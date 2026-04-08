import { useState, useRef, useEffect } from "react";
import { RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComboboxFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export default function ComboboxField({ label, value, onChange, suggestions, placeholder }: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState(suggestions);
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions);
    } else {
      const q = value.trim().toLowerCase();
      const matches = suggestions.filter((s) => s.toLowerCase().includes(q));
      setFiltered(matches.length > 0 ? matches : suggestions);
    }
  }, [value, suggestions]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(40, textareaRef.current.scrollHeight) + "px";
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (suggestion: string) => {
    // If there's already text, append with separator; otherwise replace
    if (value.trim() && !suggestions.includes(value.trim())) {
      onChange(value.trim() + "، " + suggestion);
    } else {
      onChange(suggestion);
    }
    setOpen(false);
    textareaRef.current?.focus();
  };

  const handleReset = () => {
    onChange("");
    textareaRef.current?.focus();
  };

  return (
    <div ref={ref} className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {value && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                  onClick={handleReset}
                  type="button"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">مسح والبدء من جديد</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[40px]"
          )}
          dir="rtl"
          rows={1}
        />
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="absolute left-1 top-1.5 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-48 overflow-y-auto">
          {filtered.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "w-full text-right px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                "border-b border-border/30 last:border-b-0",
                value.trim() === suggestion && "bg-accent/50 font-medium"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
