import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, FileWarning, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/hooks/useStudentsData";
import type { TemplateType } from "@/components/whatsapp/WhatsAppMessageDialog";
import WhatsAppMessageDialog from "@/components/whatsapp/WhatsAppMessageDialog";
import StudentBulkActions from "./StudentBulkActions";

interface Props {
  filtered: Student[];
  students: Student[];
  classes: { id: string; name: string }[];
  search: string;
  setSearch: (v: string) => void;
  classFilter: string;
  setClassFilter: (v: string) => void;
  exceededStudents: Set<string>;
  role: string | null;
  // Selection
  selectedIds: Set<string>;
  setSelectedIds: (s: Set<string>) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  // Bulk
  bulkTransferClassId: string;
  setBulkTransferClassId: (v: string) => void;
  bulkTransferring: boolean;
  handleBulkTransfer: () => void;
  bulkDeleting: boolean;
  bulkDeleteConfirmOpen: boolean;
  setBulkDeleteConfirmOpen: (v: boolean) => void;
  handleBulkDelete: () => void;
  openEdit: (s: Student) => void;
  // Warning
  loadingWarning: string | null;
  openWarningSlip: (s: Student) => void;
  // Permissions
  readOnlyMode: boolean;
}

export default function StudentTable(props: Props) {
  const {
    filtered, students, classes, search, setSearch, classFilter, setClassFilter,
    exceededStudents, role, selectedIds, setSelectedIds, toggleSelect, toggleSelectAll,
    bulkTransferClassId, setBulkTransferClassId, bulkTransferring, handleBulkTransfer,
    bulkDeleting, bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen, handleBulkDelete,
    openEdit, loadingWarning, openWarningSlip, readOnlyMode,
  } = props;

  const [waOpen, setWaOpen] = useState(false);
  const [waStudent, setWaStudent] = useState<{ name: string; phone: string | null; absenceCount?: number; lastDate?: string } | null>(null);
  const [waTemplateType, setWaTemplateType] = useState<TemplateType>("absence");

  const handleWhatsApp = async (s: Student) => {
    const { data: att } = await supabase
      .from("attendance_records").select("status, date")
      .eq("student_id", s.id).eq("status", "absent").order("date", { ascending: false });
    const absences = att || [];
    setWaStudent({ name: s.full_name, phone: s.parent_phone, absenceCount: absences.length, lastDate: absences[0]?.date || "" });
    setWaTemplateType(absences.length > 0 ? "absence" : "full_mark");
    setWaOpen(true);
  };

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو رقم الهوية..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع الفصول" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفصول</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {role === "admin" && !readOnlyMode && (
          <StudentBulkActions
            selectedIds={selectedIds} setSelectedIds={setSelectedIds} classes={classes}
            bulkTransferClassId={bulkTransferClassId} setBulkTransferClassId={setBulkTransferClassId}
            bulkTransferring={bulkTransferring} handleBulkTransfer={handleBulkTransfer}
            bulkDeleting={bulkDeleting} bulkDeleteConfirmOpen={bulkDeleteConfirmOpen}
            setBulkDeleteConfirmOpen={setBulkDeleteConfirmOpen} handleBulkDelete={handleBulkDelete}
            students={students} openEdit={openEdit}
          />
        )}

        <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                {role === "admin" && (
                  <th className="p-3 border-b-2 border-primary/20 first:rounded-tr-xl w-10">
                    <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
                  </th>
                )}
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">#</th>
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[180px]">الاسم الكامل</th>
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">رقم الهوية</th>
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الفصل</th>
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">جوال ولي الأمر</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-20">إنذار</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl w-20">واتساب</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={role === "admin" ? 8 : 7} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
              ) : filtered.map((s, i) => {
                const isEven = i % 2 === 0;
                const isLast = i === filtered.length - 1;
                return (
                  <tr key={s.id} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20", "hover:bg-primary/10 transition-colors")}>
                    {role === "admin" && (
                      <td className="p-3 w-10"><Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></td>
                    )}
                    <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                    <td className="p-3 font-semibold border-l border-border/10">
                      <div className="flex items-center gap-2">
                        <span>{s.full_name}</span>
                        {exceededStudents.has(s.id) && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 shrink-0">محروم</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground border-l border-border/10">{s.national_id || "—"}</td>
                    <td className="p-3 border-l border-border/10">
                      {s.classes?.name ? <Badge variant="secondary" className="text-xs">{s.classes.name}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 border-l border-border/10 text-muted-foreground text-xs">{s.parent_phone || "—"}</td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title="توليد إنذار غياب" disabled={loadingWarning === s.id} onClick={() => openWarningSlip(s)}>
                        {loadingWarning === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                      </Button>
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30" title="إرسال واتساب" onClick={() => handleWhatsApp(s)}>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {waStudent && (
        <WhatsAppMessageDialog
          open={waOpen} onOpenChange={setWaOpen} studentName={waStudent.name} parentPhone={waStudent.phone}
          templateType={waTemplateType} templateData={{ student_name: waStudent.name, absence_count: waStudent.absenceCount, last_date: waStudent.lastDate }}
        />
      )}
    </Card>
  );
}
