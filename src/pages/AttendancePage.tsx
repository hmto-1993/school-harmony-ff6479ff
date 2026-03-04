import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Save, CheckCircle2, CalendarIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import AttendanceStats from "@/components/attendance/AttendanceStats";

type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "sick_leave";

interface StudentAttendance {
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  notes: string;
  existing_id?: string;
}

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "حاضر", color: "bg-success/10 text-success border-success/30" },
  { value: "absent", label: "غائب", color: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "late", label: "متأخر", color: "bg-warning/10 text-warning border-warning/30" },
  { value: "early_leave", label: "منصرف مبكرًا", color: "bg-muted text-muted-foreground border-border" },
  { value: "sick_leave", label: "إجازة مرضية", color: "bg-info/10 text-info border-info/30" },
];

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");

  const date = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => {
      setClasses(data || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    loadStudents();
  }, [selectedClass, date]);

  const loadStudents = async () => {
    // جلب طلاب الشعبة
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("class_id", selectedClass)
      .order("full_name");

    // جلب سجلات الحضور لليوم
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, notes")
      .eq("class_id", selectedClass)
      .eq("date", date);

    const attendanceMap = new Map(attendance?.map((a) => [a.student_id, a]));

    setRecords(
      (students || []).map((s) => {
        const existing = attendanceMap.get(s.id);
        return {
          student_id: s.id,
          full_name: s.full_name,
          status: (existing?.status as AttendanceStatus) || "present",
          notes: existing?.notes || "",
          existing_id: existing?.id,
        };
      })
    );
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const updateNotes = (studentId: string, notes: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, notes } : r))
    );
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" as AttendanceStatus })));
  };

  const handleSave = async () => {
    if (!user || !selectedClass) return;
    setSaving(true);

    // تحديث السجلات الموجودة
    const toUpdate = records.filter((r) => r.existing_id);
    const toInsert = records.filter((r) => !r.existing_id);

    for (const record of toUpdate) {
      await supabase
        .from("attendance_records")
        .update({ status: record.status, notes: record.notes })
        .eq("id", record.existing_id!);
    }

    if (toInsert.length > 0) {
      await supabase.from("attendance_records").insert(
        toInsert.map((r) => ({
          student_id: r.student_id,
          class_id: selectedClass,
          date,
          status: r.status,
          notes: r.notes,
          recorded_by: user.id,
        }))
      );
    }

    toast({ title: "تم الحفظ", description: "تم حفظ سجلات الحضور بنجاح" });
    setSaving(false);
    loadStudents(); // إعادة التحميل لتحديث المعرفات
  };

  const filteredRecords = statusFilter === "all" ? records : records.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تسجيل الحضور والغياب</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-muted-foreground">التاريخ:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 font-normal")}>
                <CalendarIcon className="h-4 w-4" />
                {new Date(date).toLocaleDateString("ar-SA")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AttendanceStats
        total={records.length}
        present={records.filter((r) => r.status === "present").length}
        absent={records.filter((r) => r.status === "absent").length}
        late={records.filter((r) => r.status === "late").length}
        earlyLeave={records.filter((r) => r.status === "early_leave").length}
        sickLeave={records.filter((r) => r.status === "sick_leave").length}
      />

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">اختر الشعبة</CardTitle>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="اختر الشعبة..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              {selectedClass ? "لا يوجد طلاب في هذه الشعبة" : "اختر شعبة لبدء تسجيل الحضور"}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  تحديد الكل حاضر
                </Button>
                <div className="flex items-center gap-1.5 mr-auto">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AttendanceStatus | "all")}>
                    <SelectTrigger className="w-40 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل ({records.length})</SelectItem>
                      {statusOptions.map((opt) => {
                        const count = records.filter((r) => r.status === opt.value).length;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl w-12">#</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطالب</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, i) => {
                      const idx = records.indexOf(record);
                      const isEven = i % 2 === 0;
                      const isLast = i === filteredRecords.length - 1;
                      return (
                      <tr
                        key={record.student_id}
                        className={cn(
                          "transition-colors hover:bg-primary/5 dark:hover:bg-primary/10",
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20"
                        )}
                      >
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{idx + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{record.full_name}</td>
                        <td className="p-3 border-l border-border/10">
                          <div className="flex flex-wrap gap-1">
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => updateStatus(record.student_id, opt.value)}
                                className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                                  record.status === opt.value
                                    ? opt.color + " font-medium ring-1 ring-current/20"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className={cn("p-3", isLast && "last:rounded-bl-xl")}>
                          <Textarea
                            value={record.notes}
                            onChange={(e) => updateNotes(record.student_id, e.target.value)}
                            placeholder="ملاحظات..."
                            className="min-h-[36px] h-9 resize-none text-xs"
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 ml-2" />
                  {saving ? "جارٍ الحفظ..." : "حفظ الحضور"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
