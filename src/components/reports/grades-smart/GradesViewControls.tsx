import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Percent, Hash, ArrowDownAZ, ArrowUpAZ, Award, SlidersHorizontal } from "lucide-react";
import type { ViewMode, SortKey, SortDir } from "./grades-helpers";

interface Props {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortDir: SortDir;
  setSortDir: (d: SortDir) => void;
  period: 1 | 2;
  setPeriod: (p: 1 | 2) => void;
  examCategories: { id: string; name: string }[];
  showLevelsReport: boolean;
  setShowLevelsReport: (v: boolean) => void;
  examColumn?: string;
  setExamColumn?: (v: string) => void;
}

export default function GradesViewControls({
  viewMode, setViewMode, sortKey, setSortKey, sortDir, setSortDir,
  period, setPeriod, examCategories,
  showLevelsReport, setShowLevelsReport, examColumn, setExamColumn,
}: Props) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur px-3 py-2.5 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs ml-1">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>التحكم:</span>
        </div>

        {/* Period */}
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v) as 1 | 2)}>
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="الفترة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">الفترة الأولى</SelectItem>
            <SelectItem value="2">الفترة الثانية</SelectItem>
          </SelectContent>
        </Select>

        {/* Exam columns */}
        {setExamColumn && examCategories.length > 0 && (
          <Select value={examColumn || "all"} onValueChange={setExamColumn}>
            <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="الأعمدة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الفترة + العملي</SelectItem>
              {examCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} فقط</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View toggle (raw / percent) */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/60 px-2.5 h-8">
          <Hash className={`h-3.5 w-3.5 ${viewMode === "raw" ? "text-primary" : "text-muted-foreground"}`} />
          <Switch
            id="view-toggle"
            checked={viewMode === "percent"}
            onCheckedChange={(v) => setViewMode(v ? "percent" : "raw")}
          />
          <Percent className={`h-3.5 w-3.5 ${viewMode === "percent" ? "text-primary" : "text-muted-foreground"}`} />
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-1">
          <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
            <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="ترتيب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="raw">الدرجة</SelectItem>
              <SelectItem value="percent">النسبة</SelectItem>
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

        <div className="flex-1" />

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
    </div>
  );
}
