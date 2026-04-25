import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, AlertTriangle } from "lucide-react";
import BehaviorReport from "@/components/reports/BehaviorReport";
import ViolationsReportTab from "@/components/reports/ViolationsReportTab";
import { usePersistedState } from "@/hooks/usePersistedState";

interface Props {
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  selectedStudent: string;
  reportType: any;
}

export default function BehaviorViolationsTab(p: Props) {
  const [sub, setSub] = usePersistedState("reports.behavior_sub", "behavior");
  return (
    <Tabs value={sub} onValueChange={setSub} dir="rtl" className="space-y-4">
      <TabsList className="bg-muted/40 p-1 rounded-lg w-full md:w-auto">
        <TabsTrigger value="behavior" className="gap-1.5 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:text-success">
          <Heart className="h-4 w-4" />
          السلوك
        </TabsTrigger>
        <TabsTrigger value="violations" className="gap-1.5 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          المخالفات
        </TabsTrigger>
      </TabsList>
      <TabsContent value="behavior" className="space-y-4 mt-0">
        <BehaviorReport selectedClass={p.selectedClass} dateFrom={p.dateFrom} dateTo={p.dateTo} selectedStudent={p.selectedStudent} />
      </TabsContent>
      <TabsContent value="violations" className="space-y-4 mt-0">
        <ViolationsReportTab selectedClass={p.selectedClass} dateFrom={p.dateFrom} dateTo={p.dateTo} selectedStudent={p.selectedStudent} reportType={p.reportType} />
      </TabsContent>
    </Tabs>
  );
}
