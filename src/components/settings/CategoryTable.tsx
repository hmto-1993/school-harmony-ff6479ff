import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";

export interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
  class_id: string | null;
  class_name?: string;
  category_group: string;
  is_deduction?: boolean;
}

interface CategoryTableProps {
  title: string;
  emoji: string;
  colorScheme: "emerald" | "amber";
  emptyText: string;
  categories: GradeCategory[];
  allCategories: GradeCategory[];
  classes: { id: string; name: string }[];
  editingCats: Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>;
  setEditingCats: React.Dispatch<React.SetStateAction<Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>>>;
  isAdmin: boolean;
  catClassFilter: string;
  targetGroupLabel: string;
  targetGroupKey: string;
  onReorder: (catId: string, direction: "up" | "down", groupCats: GradeCategory[]) => void;
  onDelete: (id: string) => void;
  headerExtra?: React.ReactNode;
}

export default function CategoryTable({
  title,
  emoji,
  colorScheme,
  emptyText,
  categories,
  allCategories,
  classes,
  editingCats,
  setEditingCats,
  isAdmin,
  catClassFilter,
  targetGroupLabel,
  targetGroupKey,
  onReorder,
  onDelete,
  headerExtra,
}: CategoryTableProps) {
  const colorMap = {
    emerald: {
      title: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/50",
      headerBg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    amber: {
      title: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/50",
      headerBg: "bg-amber-50 dark:bg-amber-900/20",
    },
  };

  const colors = colorMap[colorScheme];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <h3 className={`text-sm font-bold flex items-center gap-2 ${colors.title}`}>
          <span>{emoji}</span>
          {title}
        </h3>
        {headerExtra}
      </div>
      <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className={colors.headerBg}>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">الدرجة القصوى</TableHead>
              {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-4">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Input
                        value={editingCats[cat.id]?.name ?? cat.name}
                        onChange={(e) =>
                          setEditingCats((prev) => ({
                            ...prev,
                            [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: e.target.value },
                          }))
                        }
                        className="h-8 w-40"
                      />
                    ) : <span>{cat.name}</span>}
                    {cat.is_deduction && (
                      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive whitespace-nowrap">
                        خصم
                      </Badge>
                    )}
                    {catClassFilter === "all" && (() => {
                      const classesWithCat = allCategories.filter(c => c.name === cat.name && c.class_id !== null);
                      const missingCount = classes.length - classesWithCat.length;
                      if (missingCount > 0) {
                        const missingNames = classes.filter(cls => !classesWithCat.some(c => c.class_id === cls.id)).map(c => c.name);
                        return (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400 whitespace-nowrap" title={`ناقصة في: ${missingNames.join("، ")}`}>
                            ⚠ ناقصة في {missingCount} فصل
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Input type="number" className="w-24 h-8"
                      value={editingCats[cat.id]?.max_score ?? cat.max_score}
                      onChange={(e) =>
                        setEditingCats((prev) => ({
                          ...prev,
                          [cat.id]: { ...prev[cat.id], name: prev[cat.id]?.name ?? cat.name, max_score: parseFloat(e.target.value) || 0 },
                        }))
                      }
                    />
                  ) : <span>{cat.max_score}</span>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onReorder(cat.id, "up", categories)}
                        disabled={categories.indexOf(cat) === 0} title="تحريك لأعلى">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onReorder(cat.id, "down", categories)}
                        disabled={categories.indexOf(cat) === categories.length - 1} title="تحريك لأسفل">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                        onClick={() =>
                          setEditingCats((prev) => ({
                            ...prev,
                            [cat.id]: { ...prev[cat.id], max_score: prev[cat.id]?.max_score ?? cat.max_score, weight: prev[cat.id]?.weight ?? cat.weight, name: prev[cat.id]?.name ?? cat.name, category_group: targetGroupKey },
                          }))
                        }
                        title={`نقل إلى ${targetGroupLabel}`}>
                        ← {targetGroupLabel}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف فئة التقييم "{cat.name}"؟</AlertDialogTitle>
                            <AlertDialogDescription>سيتم حذف الفئة وجميع الدرجات المسجلة فيها{catClassFilter === "all" ? " من جميع الفصول" : ""}.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => onDelete(cat.id)}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
