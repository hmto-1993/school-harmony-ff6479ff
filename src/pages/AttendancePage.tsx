import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { useToast } from "@/hooks/use-toast";
import { Save, CheckCircle2, Filter, ClipboardCheck, Users, Search, CalendarIcon, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import EmptyState from "@/components/EmptyState";
import AcademicWeekBadge from "@/components/dashboard/AcademicWeekBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [savedDayNote, setSavedDayNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState<Date>(new Date());
  const [movingDate, setMovingDate] = useState(false);
  const date = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => {
      setClasses(data || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    loadStudents();
    loadDayNote();
  }, [selectedClass, date]);

  const loadDayNote = async () => {
    if (!selectedClass) return;
    const { data } = await supabase
      .from("attendance_schedule_exceptions")
      .select("reason")
      .eq("class_id", selectedClass)
      .eq("original_date", date)
      .eq("type", "note")
      .maybeSingle();
    const note = data?.reason || "";
    setSavedDayNote(note);
    setDayNote(note);
  };

  const saveDayNote = async () => {
    if (!user || !selectedClass) return;
    setSavingNote(true);
    
    // Check if note already exists
    const { data: existing } = await supabase
      .from("attendance_schedule_exceptions")
      .select("id")
      .eq("class_id", selectedClass)
      .eq("original_date", date)
      .eq("type", "note")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("attendance_schedule_exceptions")
        .update({ reason: dayNote })
        .eq("id", existing.id);
    } else {
      await supabase.from("attendance_schedule_exceptions").insert({
        class_id: selectedClass,
        original_date: date,
        type: "note",
        reason: dayNote,
        created_by: user.id,
      });
    }

    setSavedDayNote(dayNote);
    setSavingNote(false);
    toast({ title: "تم الحفظ", description: "تم حفظ ملاحظة اليوم" });
  };

  const loadStudents = async () => {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("class_id", selectedClass)
      .order("full_name");

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

  const handleMoveSession = async () => {
    if (!user || !selectedClass || records.length === 0) return;
    const newDate = format(moveTargetDate, "yyyy-MM-dd");
    if (newDate === date) return;
    setMovingDate(true);
    const { error } = await supabase
      .from("attendance_records")
      .update({ date: newDate })
      .eq("class_id", selectedClass)
      .eq("date", date);
    if (error) {
      toast({ title: "خطأ", description: "فشل نقل الحصة", variant: "destructive" });
    } else {
      toast({ title: "تم النقل", description: `تم نقل حصة التحضير إلى ${newDate}` });
      setSelectedDate(moveTargetDate);
    }
    setMovingDate(false);
    setMoveDialogOpen(false);
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" as AttendanceStatus })));
  };

  const handleSave = async () => {
    if (!user || !selectedClass) return;
    setSaving(true);

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
    loadStudents();
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) result = result.filter((r) => r.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return result;
  }, [records, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          التحضير
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-muted-foreground">التاريخ:</span>
          <HijriDatePicker
            date={selectedDate}
            onDateChange={(d) => setSelectedDate(d)}
          />
          <AcademicWeekBadge date={selectedDate} />
          {selectedClass && records.some(r => r.existing_id) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => { setMoveTargetDate(selectedDate); setMoveDialogOpen(true); }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              نقل الحصة
            </Button>
          )}
          {savedDayNote && (
            <span className="text-xs px-2 py-1 rounded-md bg-info/10 text-info border border-info/30">
              📝 {savedDayNote}
            </span>
          )}
        </div>
      </div>

      {/* Move Session Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>نقل حصة التحضير</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">اختر التاريخ الجديد لنقل سجلات الحضور إليه:</p>
          <HijriDatePicker
            date={moveTargetDate}
            onDateChange={setMoveTargetDate}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleMoveSession} disabled={movingDate || format(moveTargetDate, "yyyy-MM-dd") === date}>
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              {movingDate ? "جارٍ النقل..." : "نقل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Selection Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          اختر الفصل
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {classes.map((c, index) => {
            const isSelected = selectedClass === c.id;
            const colorPalette = [
              { gradient: "from-primary/15 to-primary/5", border: "border-primary/40", text: "text-primary", iconBg: "bg-primary/20" },
              { gradient: "from-accent/15 to-accent/5", border: "border-accent/40", text: "text-accent", iconBg: "bg-accent/20" },
              { gradient: "from-success/15 to-success/5", border: "border-success/40", text: "text-success", iconBg: "bg-success/20" },
              { gradient: "from-warning/15 to-warning/5", border: "border-warning/40", text: "text-warning", iconBg: "bg-warning/20" },
              { gradient: "from-info/15 to-info/5", border: "border-info/40", text: "text-info", iconBg: "bg-info/20" },
              { gradient: "from-destructive/15 to-destructive/5", border: "border-destructive/40", text: "text-destructive", iconBg: "bg-destructive/20" },
            ];
            const color = colorPalette[index % colorPalette.length];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-center transition-all duration-300 group cursor-pointer animate-fade-in",
                  `bg-gradient-to-br ${color.gradient}`,
                  isSelected
                    ? `${color.border} ring-2 ring-current/10 shadow-lg scale-[1.02]`
                    : "border-border/30 hover:border-border/60 hover:shadow-md hover:scale-[1.01]"
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
                  isSelected ? color.iconBg : "bg-muted/50"
                )}>
                  <Users className={cn("h-5 w-5", isSelected ? color.text : "text-muted-foreground")} />
                </div>
                <p className={cn(
                  "text-sm font-bold truncate",
                  isSelected ? color.text : "text-foreground"
                )}>{c.name}</p>
                {isSelected && (
                  <div className={cn("absolute top-2 left-2 w-2.5 h-2.5 rounded-full animate-pulse", "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Note Input */}
      {selectedClass && (
        <Card className="border-0 shadow-sm bg-card/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Input
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
                placeholder="ملاحظة اليوم (مثال: إجازة، مرضي، تأجيل...)"
                className="flex-1 h-9 text-sm"
              />
              <Button
                onClick={saveDayNote}
                disabled={savingNote || dayNote === savedDayNote}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                <Save className="h-4 w-4 ml-1" />
                حفظ الملاحظة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceStats
        total={records.length}
        present={records.filter((r) => r.status === "present").length}
        absent={records.filter((r) => r.status === "absent").length}
        late={records.filter((r) => r.status === "late").length}
        earlyLeave={records.filter((r) => r.status === "early_leave").length}
        sickLeave={records.filter((r) => r.status === "sick_leave").length}
      />

      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="pt-6">
          {records.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title={selectedClass ? "لا يوجد طلاب في هذا الفصل" : "اختر فصلاً لبدء تسجيل الحضور"}
              description={selectedClass ? "تأكد من إضافة طلاب لهذا الفصل أولاً" : "حدد الفصل من القائمة أعلاه لعرض قائمة الطلاب وتسجيل حضورهم"}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <Button variant="outline" size="sm" onClick={markAllPresent} className="backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  تحديد الكل حاضر
                </Button>
                <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="بحث عن طالب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs pr-8 backdrop-blur-sm"
                  />
                </div>
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
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
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
                                    ? opt.color + " font-medium ring-1 ring-current/20 shadow-sm"
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
                <Button onClick={handleSave} disabled={saving} className="shadow-md shadow-primary/20">
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
