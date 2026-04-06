import { cn } from "@/lib/utils";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EvaluationTogglesProps {
  showDailyGrades: boolean;
  setShowDailyGrades: (v: boolean) => void;
  showClassworkIcons: boolean;
  setShowClassworkIcons: (v: boolean) => void;
  classworkIconsCount: number;
  setClassworkIconsCount: (v: number) => void;
  dailyLabel?: string;
  dailyDesc?: string;
  cumulativeLabel?: string;
  cumulativeDesc?: string;
  defaultOpen?: boolean;
}

export default function EvaluationToggles({
  showDailyGrades,
  setShowDailyGrades,
  showClassworkIcons,
  setShowClassworkIcons,
  classworkIconsCount,
  setClassworkIconsCount,
  dailyLabel = "📅 تفاعل اليوم",
  dailyDesc = "التقييم اليومي بالأيقونات",
  cumulativeLabel = "📊 التفاعل الكلي",
  cumulativeDesc = "التقييم التراكمي بالأيقونات",
  defaultOpen = true,
}: EvaluationTogglesProps) {
  const items = [
    { label: dailyLabel, desc: dailyDesc, state: showDailyGrades, setter: setShowDailyGrades },
    { label: cumulativeLabel, desc: cumulativeDesc, state: showClassworkIcons, setter: setShowClassworkIcons },
  ];

  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/20 transition-colors">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          التقييم المستمر
        </h4>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-2">
        {items.map((item, i) => (
          <div key={i} className={cn(
            "flex items-center justify-between p-2.5 rounded-lg border transition-all",
            item.state ? "border-success/40 bg-success/5" : "border-border/40 bg-card"
          )}>
            <div>
              <h4 className="text-xs font-bold">{item.label}</h4>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <button
              onClick={() => item.setter(!item.state)}
              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                item.state ? "bg-success text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {item.state ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {item.state ? "ظاهر" : "مخفي"}
            </button>
          </div>
        ))}

        {showClassworkIcons && (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card">
            <span className="text-xs font-bold">عدد الأيقونات</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setClassworkIconsCount(Math.max(5, classworkIconsCount - 5))}
                className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-xs"
              >−</button>
              <span className="w-6 text-center font-bold text-xs">{classworkIconsCount}</span>
              <button
                onClick={() => setClassworkIconsCount(Math.min(30, classworkIconsCount + 5))}
                className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-xs"
              >+</button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
