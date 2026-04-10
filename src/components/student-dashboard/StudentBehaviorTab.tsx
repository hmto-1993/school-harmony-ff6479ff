import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

interface Props {
  behaviors: { date: string; type: string; note?: string }[];
}

const typeMap: Record<string, { label: string; icon: typeof ThumbsUp; colorClasses: string; bgClasses: string }> = {
  positive: {
    label: "إيجابي", icon: ThumbsUp,
    colorClasses: "text-emerald-600 dark:text-emerald-400",
    bgClasses: "bg-emerald-50 dark:bg-emerald-500/15",
  },
  negative: {
    label: "سلبي", icon: ThumbsDown,
    colorClasses: "text-rose-500 dark:text-rose-400",
    bgClasses: "bg-rose-50 dark:bg-rose-500/15",
  },
  neutral: {
    label: "محايد", icon: Minus,
    colorClasses: "text-amber-500 dark:text-amber-400",
    bgClasses: "bg-amber-50 dark:bg-amber-500/15",
  },
  "إيجابي": {
    label: "إيجابي", icon: ThumbsUp,
    colorClasses: "text-emerald-600 dark:text-emerald-400",
    bgClasses: "bg-emerald-50 dark:bg-emerald-500/15",
  },
  "سلبي": {
    label: "سلبي", icon: ThumbsDown,
    colorClasses: "text-rose-500 dark:text-rose-400",
    bgClasses: "bg-rose-50 dark:bg-rose-500/15",
  },
  "محايد": {
    label: "محايد", icon: Minus,
    colorClasses: "text-amber-500 dark:text-amber-400",
    bgClasses: "bg-amber-50 dark:bg-amber-500/15",
  },
};

const fallback = {
  label: "—", icon: Minus,
  colorClasses: "text-muted-foreground opacity-30",
  bgClasses: "bg-muted/30",
};

function cleanNote(note?: string) {
  if (!note) return "-";
  return note.replace(/\[severity:\w+\]\s*/g, "").trim() || "-";
}

export default function StudentBehaviorTab({ behaviors }: Props) {
  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-accent to-primary" />
          التقييمات السلوكية
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend matching teacher view */}
        <div className="flex gap-3 mb-4 text-sm flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">إيجابي</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <Minus className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">محايد</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
            <ThumbsDown className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            <span className="text-rose-700 dark:text-rose-300 font-medium">سلبي</span>
          </div>
        </div>

        {behaviors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد تقييمات</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-10 first:rounded-tr-xl">#</th>
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">التاريخ</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-24">السلوك</th>
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {behaviors.map((b, i) => {
                  const info = typeMap[b.type] || fallback;
                  const Icon = info.icon;
                  const isEven = i % 2 === 0;
                  const isLast = i === behaviors.length - 1;
                  return (
                    <tr
                      key={i}
                      className={cn(
                        isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                        !isLast && "border-b border-border/20",
                        "hover:bg-sky-100/60 dark:hover:bg-sky-900/30 transition-colors"
                      )}
                    >
                      <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>
                        {i + 1}
                      </td>
                      <td className="p-3 text-right font-semibold border-l border-border/10">{b.date}</td>
                      <td className="p-3 text-center border-l border-border/10">
                        <div className={cn("p-1.5 rounded-lg inline-flex mx-auto", info.bgClasses)}>
                          <Icon className={cn("h-5 w-5", info.colorClasses)} />
                        </div>
                      </td>
                      <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>
                        {cleanNote(b.note)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
