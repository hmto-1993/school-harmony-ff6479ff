import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { StudentOption, ClassOption } from "@/hooks/useFormDialog";

interface StudentPickerProps {
  students: StudentOption[];
  classes: ClassOption[];
  filteredStudents: StudentOption[];
  selectedStudent: StudentOption | undefined;
  showStudentList: boolean;
  searchQuery: string;
  filterClassId: string;
  onSelectStudent: (id: string) => void;
  onShowList: () => void;
  onSearchChange: (q: string) => void;
  onFilterChange: (classId: string) => void;
}

export default function StudentPicker({
  classes, filteredStudents, selectedStudent, showStudentList,
  searchQuery, filterClassId,
  onSelectStudent, onShowList, onSearchChange, onFilterChange,
}: StudentPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">اختيار الطالب</Label>
      {selectedStudent && !showStudentList ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{selectedStudent.full_name}</p>
            <p className="text-[11px] text-muted-foreground">{selectedStudent.className} — {selectedStudent.national_id || "بدون هوية"}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onShowList}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={filterClassId} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[130px] shrink-0 text-xs h-9"><SelectValue placeholder="كل الفصول" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفصول</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="ابحث بالاسم أو الهوية..." className="pr-8 h-9 text-xs" />
            </div>
          </div>
          <div className="border rounded-lg max-h-48 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">{searchQuery ? "لا توجد نتائج" : "لا يوجد طلاب"}</p>
            ) : (
              filteredStudents.map(s => (
                <button key={s.id} type="button" onClick={() => onSelectStudent(s.id)} className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-accent/50 active:bg-accent transition-colors border-b border-border/50 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.national_id || "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-normal">{s.className || "بدون فصل"}</Badge>
                </button>
              ))
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">{filteredStudents.length} طالب</p>
        </div>
      )}
    </div>
  );
}
