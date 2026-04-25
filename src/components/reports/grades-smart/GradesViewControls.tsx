import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Percent, Hash, ArrowDownAZ, ArrowUpAZ, Award } from "lucide-react";
import type { ViewMode, SortKey, SortDir } from "./grades-helpers";

interface Props {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortDir: SortDir;
  setSortDir: (d: SortDir) => void;
  scope: "current" | "all";
  setScope: (s: "current" | "all") => void;
  examFilter: string;
  setExamFilter: (v: string) => void;
  examCategories: { id: string; name: string }[];
  showLevelsReport: boolean;
  setShowLevelsReport: (v: boolean) => void;
  examColumn?: string;
  setExamColumn?: (v: string) => void;
}

export default function GradesViewControls({
  viewMode, setViewMode, sortKey, setSortKey, sortDir, setSortDir,
  scope, setScope, examFilter, setExamFilter, examCategories,
  showLevelsReport, setShowLevelsReport, examColumn, setExamColumn,
}: Props) {
  return (
    <Card className="border-0 shadow-md bg-card/80 print:hidden">
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-1.5">
            <Hash className={`h-3.5 w-3.5 ${viewMode === "raw" ? "text-primary" : "text-muted-foreground"}`} />
            <Label htmlFor="view-toggle" className="text-xs cursor-pointer">درجة خام</Label>
            <Switch
              id="view-toggle"
              checked={viewMode === "percent"}
              onCheckedChange={(v) => setViewMode(v ? "percent" : "raw")}
            />
            <Label htmlFor="view-toggle" className="text-xs cursor-pointer">نسبة %</Label>
            <Percent className={`h-3.5 w-3.5 ${viewMode === "percent" ? "text-primary" : "text-muted-foreground"}`} />
          </div>

          {/* Scope */}
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">النطاق:</Label>
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">الفصل الحالي</SelectItem>
                <SelectItem value="all">جميع الشعب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">ترتيب:</Label>
            <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="raw">الدرجة الخام</SelectItem>
                <SelectItem value="percent">النسبة %</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
              title={sortDir === "asc" ? "تصاعدي" : "تنازلي"}
            >
              {sortDir === "asc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Levels report toggle */}
          <Button
            variant={showLevelsReport ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLevelsReport(!showLevelsReport)}
            className="gap-1.5 h-8"
          >
            <Award className="h-3.5 w-3.5" />
            تقرير المستويات
          </Button>
        </div>

        {/* Exam filter */}
        <div className="flex flex-wrap items-center gap-3">
          {setExamColumn && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">عرض الأعمدة:</Label>
              <Select value={examColumn || "all"} onValueChange={setExamColumn}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الفترة + العملي</SelectItem>
                  {examCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} فقط</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">فلتر الاختبارات:</Label>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue placeholder="اختر اختباراً..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">عرض جميع الطلاب</SelectItem>
                {examCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>الطلاب الذين لم يختبروا في: {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
