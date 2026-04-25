import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, GraduationCap, ShieldAlert, Trophy, FileText, ChevronRight, ChevronLeft } from "lucide-react";

const TABS = [
  { value: "attendance", label: "الحضور", icon: ClipboardCheck, accent: "primary" },
  { value: "grades", label: "الدرجات", icon: GraduationCap, accent: "success" },
  { value: "behavior", label: "السلوك والمخالفات", icon: ShieldAlert, accent: "warning" },
  { value: "analytics", label: "تحليل شهري", icon: Trophy, accent: "primary" },
  { value: "comprehensive", label: "تقارير شاملة", icon: FileText, accent: "success" },
] as const;

const ACCENT_CLS: Record<string, string> = {
  primary: "data-[state=active]:bg-primary/15 data-[state=active]:text-primary",
  success: "data-[state=active]:bg-success/15 data-[state=active]:text-success",
  warning: "data-[state=active]:bg-warning/15 data-[state=active]:text-warning",
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
      <TabsList className="report-tabs-list w-full justify-start h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className={`report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:shadow-sm ${ACCENT_CLS[t.accent]}`}
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
          variant="outline"
          size="sm"
          onClick={() => onChange(prev.value)}
          className="gap-1.5 h-8"
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
          variant="outline"
          size="sm"
          onClick={() => onChange(next.value)}
          className="gap-1.5 h-8"
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
