import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  behaviors: { date: string; type: string; note?: string }[];
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
        {behaviors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد تقييمات</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">التاريخ</th>
                  <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">النوع</th>
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {behaviors.map((b, i) => {
                  const isEven = i % 2 === 0;
                  const isLast = i === behaviors.length - 1;
                  return (
                    <tr key={i} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                      <td className={cn("p-3 text-right border-l border-border/10", isLast && "first:rounded-br-xl")}>{b.date}</td>
                      <td className="p-3 text-center border-l border-border/10">
                        <span className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          b.type === "إيجابي" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" : "bg-rose-500/15 text-rose-500 border-rose-500/20"
                        )}>{b.type}</span>
                      </td>
                      <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>{b.note || "-"}</td>
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
