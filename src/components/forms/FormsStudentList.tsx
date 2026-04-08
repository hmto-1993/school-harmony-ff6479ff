import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckSquare, XCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassOption, StudentRow } from "@/hooks/useFormsPageData";

interface Props {
  classes: ClassOption[];
  filteredStudents: StudentRow[];
  selectedStudentIds: string[];
  studentSearch: string;
  studentClassFilter: string;
  onToggleStudent: (id: string) => void;
  onToggleAll: () => void;
  onClearSelection: () => void;
  onSearchChange: (q: string) => void;
  onClassFilterChange: (classId: string) => void;
}

export default function FormsStudentList({
  classes, filteredStudents, selectedStudentIds,
  studentSearch, studentClassFilter,
  onToggleStudent, onToggleAll, onClearSelection,
  onSearchChange, onClassFilterChange,
}: Props) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-base font-bold text-foreground">قائمة الطلاب</h2>
          {selectedStudentIds.length > 0 && (
            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
              <CheckSquare className="h-3 w-3 ml-1" />
              {selectedStudentIds.length} مختار
            </Badge>
          )}
        </div>
        {selectedStudentIds.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={onClearSelection}>
            <XCircle className="h-3 w-3" /> إلغاء التحديد
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={studentClassFilter} onValueChange={onClassFilterChange}>
          <SelectTrigger className="w-[130px] text-xs h-8">
            <SelectValue placeholder="كل الفصول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفصول</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={studentSearch}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="ابحث بالاسم أو الهوية..."
            className="pr-8 h-8 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[10px] shrink-0" onClick={onToggleAll}>
          تحديد الكل
        </Button>
      </div>

      {/* Student rows */}
      <ScrollArea className="max-h-[300px]">
        <div className="border rounded-lg divide-y divide-border/50">
          {filteredStudents.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">لا يوجد طلاب</p>
          ) : (
            filteredStudents.map(s => {
              const isChecked = selectedStudentIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-accent/50",
                    isChecked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggleStudent(s.id)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.national_id || "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                    {s.className || "بدون فصل"}
                  </Badge>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
      <p className="text-[10px] text-muted-foreground text-center">{filteredStudents.length} طالب معروض</p>
    </Card>
  );
}
