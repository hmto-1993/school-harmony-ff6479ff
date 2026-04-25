import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, GraduationCap, ShieldAlert, Trophy, FileText } from "lucide-react";

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

export default function ReportsTabsNav() {
  return (
    <TabsList className="report-tabs-list w-full justify-start print:hidden h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl flex-wrap">
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
  );
}
