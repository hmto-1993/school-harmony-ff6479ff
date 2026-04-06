import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const cardColors = [
  "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
  "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10",
  "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
  "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
  "from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/10",
  "from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10",
];
const iconColors = [
  "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
  "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
  "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
  "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
  "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
];

interface Props {
  classCounts: [string, { name: string; count: number }][];
  classFilter: string;
  setClassFilter: (v: string) => void;
  totalStudents: number;
  selectedIds: Set<string>;
  isAdmin: boolean;
}

export default function StudentClassSummary({ classCounts, classFilter, setClassFilter, totalStudents, selectedIds, isAdmin }: Props) {
  const { toast } = useToast();
  if (classCounts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {classCounts.map(([classId, info], index) => (
        <Card
          key={classId}
          className={cn(
            "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br animate-fade-in",
            cardColors[index % cardColors.length],
            classFilter === classId && "ring-2 ring-primary shadow-md"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => setClassFilter(classFilter === classId ? "all" : classId)}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn("rounded-xl p-2", iconColors[index % iconColors.length])}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{info.name}</p>
              <p className="text-lg font-bold">{info.count} <span className="text-xs font-normal text-muted-foreground">طالب</span></p>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card
        className={cn(
          "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-primary/10 to-accent/5 dark:from-primary/20 dark:to-accent/10 animate-fade-in",
          classFilter === "all" && "ring-2 ring-primary shadow-md"
        )}
        style={{ animationDelay: `${classCounts.length * 50}ms` }}
        onClick={() => setClassFilter("all")}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="rounded-xl p-2 bg-primary/10 dark:bg-primary/20 text-primary"><Users className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">الإجمالي</p>
            <p className="text-lg font-bold">{totalStudents} <span className="text-xs font-normal text-muted-foreground">طالب</span></p>
          </div>
        </CardContent>
      </Card>
      {isAdmin && (
        <Card
          className={cn(
            "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10 animate-fade-in",
            selectedIds.size > 0 && "ring-2 ring-orange-500 shadow-md"
          )}
          style={{ animationDelay: `${(classCounts.length + 1) * 50}ms` }}
          onClick={() => {
            if (selectedIds.size === 0) toast({ title: "تلميح", description: "حدد الطلاب من الجدول أدناه أولاً لنقلهم أو حذفهم أو تعديلهم" });
          }}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-xl p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"><Pencil className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">تعديل</p>
              <p className="text-sm font-bold">{selectedIds.size > 0 ? `${selectedIds.size} محدد` : "حدد طلاب"}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
