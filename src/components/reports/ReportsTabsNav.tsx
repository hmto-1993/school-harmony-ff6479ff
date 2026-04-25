import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, GraduationCap, ShieldAlert, ChevronRight, ChevronLeft, BarChart3 } from "lucide-react";

const TABS = [
  { value: "attendance", label: "الحضور والتحليل", icon: ClipboardCheck, accent: "primary" },
  { value: "grades", label: "الدرجات", icon: GraduationCap, accent: "success" },
  { value: "behavior", label: "السلوك والمخالفات", icon: ShieldAlert, accent: "warning" },
] as const;

const ACCENT_CLS: Record<string, string> = {
  primary: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 data-[state=active]:font-semibold",
  success: "data-[state=active]:bg-success data-[state=active]:text-success-foreground data-[state=active]:shadow-md data-[state=active]:shadow-success/30 data-[state=active]:font-semibold",
  warning: "data-[state=active]:bg-warning data-[state=active]:text-warning-foreground data-[state=active]:shadow-md data-[state=active]:shadow-warning/30 data-[state=active]:font-semibold",
};

interface Props {
  activeTab: string;
  onChange: (v: string) => void;
}

export default function ReportsTabsNav({ activeTab, onChange }: Props) {
  const idx = Math.max(0, TABS.findIndex((t) => t.value === activeTab));
  const prev = TABS[(idx - 1 + TABS.length) % TABS.length];
  const next = TABS[(idx + 1) % TABS.length];
  const current = TABS[idx];

  return (
    <div className="space-y-2 print:hidden">
      <TabsList className="report-tabs-list w-full justify-start h-auto p-1.5 gap-1.5 bg-card/70 backdrop-blur-xl border border-border/40 rounded-2xl flex-wrap shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isWarning = t.accent === "warning";
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className={`report-tab gap-1.5 rounded-xl px-4 py-2.5 font-medium transition-all bg-transparent text-foreground/70 hover:bg-muted/50 ${ACCENT_CLS[t.accent]}`}
              style={isWarning ? { /* keep using warning text via inline if needed */ } : undefined}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="flex items-center justify-between gap-2 px-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(prev.value)}
          className="gap-1.5 h-8 hover:bg-muted/50"
          aria-label={`السابق: ${prev.label}`}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="hidden sm:inline text-xs text-muted-foreground">السابق:</span>
          <span className="text-xs font-medium">{prev.label}</span>
        </Button>

        <span className="text-xs text-muted-foreground hidden md:inline">
          {idx + 1} / {TABS.length} — <span className="font-medium text-foreground">{current.label}</span>
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(next.value)}
          className="gap-1.5 h-8 hover:bg-muted/50"
          aria-label={`التالي: ${next.label}`}
        >
          <span className="text-xs font-medium">{next.label}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">:التالي</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
