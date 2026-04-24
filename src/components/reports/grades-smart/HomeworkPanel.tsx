import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";
import { homeworkStatus } from "./grades-helpers";

interface Props {
  homeworkCategories: CategoryMeta[];
  targets: Record<string, number>;
  saveTarget: (categoryId: string, count: number) => void;
  rows: GradeRow[];
}

export default function HomeworkPanel({ homeworkCategories, targets, saveTarget, rows }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    homeworkCategories.forEach((c) => { init[c.id] = String(targets[c.id] ?? ""); });
    setDrafts(init);
  }, [homeworkCategories, targets]);

  if (homeworkCategories.length === 0) {
    return (
      <Card className="border-0 shadow-md bg-card/80 print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            إدارة الواجبات
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          لا توجد فئات تقييم تحمل اسم "واجب" في هذا الفصل. أضف فئة باسم يحتوي كلمة "واجب" من إعدادات فئات التقييم.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-success/5 print:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          إدارة الواجبات الذكية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {homeworkCategories.map((cat) => {
          const required = targets[cat.id] ?? 0;
          // Each "submitted" = number of grades > 0 entered for that category? We use binary: any score > 0 counts as 1 submission.
          // Better: treat the grade itself as # of submissions out of required.
          const stats = rows.reduce(
            (acc, r) => {
              const score = r.categories[cat.name];
              const submitted = score === null || score === undefined ? 0 : Math.min(score, required);
              const status = homeworkStatus(submitted, required);
              acc[status.key]++;
              return acc;
            },
            { complete: 0, partial: 0, missing: 0 } as Record<string, number>
          );
          return (
            <div key={cat.id} className="rounded-lg bg-card/60 p-3 border border-border/30 space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">{cat.name}</Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      min={0}
                      value={drafts[cat.id] ?? ""}
                      onChange={(e) => setDrafts((p) => ({ ...p, [cat.id]: e.target.value }))}
                      placeholder="إجمالي الواجبات المطلوبة"
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveTarget(cat.id, Math.max(0, parseInt(drafts[cat.id] || "0", 10)))}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    كاملة: {stats.complete}
                  </Badge>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    ناقصة: {stats.partial}
                  </Badge>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    لم يسلم: {stats.missing}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
