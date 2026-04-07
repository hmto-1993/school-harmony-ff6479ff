import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon, Plus, Trash2, Save, GraduationCap, Users,
  Eye, EyeOff, UserCircle, KeyRound, Printer, Upload, Download,
  FileSpreadsheet, Pencil, Check, X, MessageSquare, Megaphone,
  ChevronDown, ArrowUp, ArrowDown, Palette, History, RotateCcw,
  CalendarDays, ClipboardCheck, Lock, LockOpen, Trophy, Crown,
  AlertTriangle, Heart, ClipboardList, Table2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import AcademicCalendarSettings from "@/components/dashboard/AcademicCalendarSettings";
import ClassScheduleDialog from "@/components/settings/ClassScheduleDialog";
import LessonPlanSettings from "@/components/settings/LessonPlanSettings";
import WhatsAppTemplatesSettings from "@/components/settings/WhatsAppTemplatesSettings";
import TimetableEditor from "@/components/settings/TimetableEditor";
import BehaviorSuggestionsSettings from "@/components/settings/BehaviorSuggestionsSettings";
import TeacherManagementCard from "@/components/settings/TeacherManagementCard";
import StaffLoginHistory from "@/components/settings/StaffLoginHistory";
import CategoryTable from "@/components/settings/CategoryTable";
import DataPurgeSection from "@/components/settings/DataPurgeSection";
import EvaluationToggles from "@/components/settings/EvaluationToggles";
import CollapsibleSettingsCard from "@/components/settings/CollapsibleSettingsCard";
import { QUIZ_COLOR_OPTIONS } from "@/hooks/use-quiz-colors";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSettingsData } from "@/hooks/useSettingsData";

export default function SettingsPage() {
  const s = useSettingsData();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">الإعدادات</h1>
          <p className="text-muted-foreground">
            {s.isAdmin ? "إدارة الفصول وفئات التقييم" : "عرض إحصائيات الفصول والتقييمات"}
          </p>
        </div>
        {!s.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            للاطلاع فقط
          </span>
        )}
      </div>

      {/* ===== البطاقات الرئيسية ===== */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
        <h2 className="text-sm font-bold text-primary tracking-wide">⚙️ الإعدادات الأساسية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "classes", icon: Users, label: "الفصول الدراسية", desc: `${s.classes.length} فصل`, gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/20" },
          { key: "categories", icon: GraduationCap, label: "فئات التقييم", desc: `${s.categories.length} فئة`, gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
          { key: "print", icon: Printer, label: "ورقة الطباعة والتصدير", desc: "ترويسة وتنسيق مشترك", gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20", adminOnly: true },
          { key: "colors", icon: Palette, label: "ألوان الاختبارات", desc: "تخصيص الألوان", gradient: "", shadow: "", customBg: "linear-gradient(135deg, #0ea5e9, #f59e0b, #14b8a6)", adminOnly: true },
          { key: "visibility", icon: Eye, label: "عرض الطالب", desc: s.honorRollEnabled ? "لوحة الشرف مفعّلة" : "التحكم بالبيانات", gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", adminOnly: true },
          { key: "popup", icon: Megaphone, label: "رسالة منبثقة", desc: s.popupEnabled ? (s.popupRepeat === "daily" ? "مفعّلة · يومياً" : s.popupRepeat === "weekly" ? "مفعّلة · أسبوعياً" : "مفعّلة · مرة واحدة") : "معطّلة", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20", adminOnly: true },
          { key: "calendar_year", icon: CalendarDays, label: "التقويم والعام الدراسي", desc: `${s.calendarTypeLocal === "hijri" ? "هجري" : "ميلادي"} · ${s.defaultAcademicYear}`, gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20", adminOnly: true },
          { key: "academic_calendar", icon: CalendarDays, label: "التقويم الأكاديمي", desc: "الأسابيع والاختبارات", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", adminOnly: true },
          { key: "attendance_settings", icon: ClipboardCheck, label: "إعدادات التحضير", desc: `${s.attendanceOverrideLock ? "القفل معطّل" : "قفل تلقائي"} · حد الإنذار: ${s.absenceMode === "sessions" && s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`}`, gradient: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/20", adminOnly: true },
          { key: "parent_portal", icon: Heart, label: "بوابة ولي الأمر", desc: s.parentWelcomeEnabled ? "مفعّلة" : "معطّلة", gradient: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/20", adminOnly: true },
          { key: "lesson_plans", icon: CalendarDays, label: "خطة الدروس", desc: "تخطيط الحصص الأسبوعية", gradient: "from-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20", adminOnly: false },
          { key: "timetable", icon: Table2, label: "جدول الحصص", desc: "تصميم الجدول الأسبوعي", gradient: "from-sky-500 to-cyan-600", shadow: "shadow-sky-500/20", adminOnly: false },
          { key: "behavior_suggestions", icon: Heart, label: "وصف السلوك", desc: "مقترحات وصف السلوك", gradient: "from-green-500 to-emerald-600", shadow: "shadow-green-500/20", adminOnly: true },
        ].filter(c => !c.adminOnly || s.isAdmin).map((card) => (
          <button
            key={card.key}
            onClick={() => s.setActiveCard(s.activeCard === card.key ? null : card.key)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-300 text-center group",
              s.activeCard === card.key
                ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                : "border-border/50 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl shadow-lg text-white transition-transform duration-300 group-hover:scale-110",
                !card.customBg && `bg-gradient-to-br ${card.gradient} ${card.shadow}`
              )}
              style={card.customBg ? { background: card.customBg } : undefined}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              {card.key === "popup" && s.popupCountdown && (
                <div className={cn(
                  "mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                  s.popupCountdown === "منتهية" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                )}>
                  ⏱ {s.popupCountdown === "منتهية" ? "منتهية الصلاحية" : `متبقي: ${s.popupCountdown}`}
                </div>
              )}
            </div>
            {s.activeCard === card.key && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-b-2 border-r-2 border-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Active Card Content - Full Width */}
      {s.activeCard === "classes" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                الفصول الدراسية
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog open={s.importClassesOpen} onOpenChange={(v) => { s.setImportClassesOpen(v); if (!v) s.setImportedClasses([]); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Download className="h-4 w-4" />
                      استيراد من Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        استيراد الفصول من ملف Excel
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                        الأعمدة المدعومة: <strong>اسم الفصل</strong> (مطلوب)، الصف، رقم الفصل
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملف Excel أو CSV</Label>
                        <Input ref={s.classFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={s.handleClassFileSelect} className="cursor-pointer" />
                      </div>
                      {s.importedClasses.length > 0 && (
                        <div className="space-y-2">
                          <Label>معاينة ({s.importedClasses.length} فصل)</Label>
                          <div className="max-h-[200px] overflow-auto rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                   <TableHead className="text-right">الفصل</TableHead>
                                   <TableHead className="text-right">الصف</TableHead>
                                   <TableHead className="text-right">رقم الفصل</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {s.importedClasses.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell>
                                      <Input
                                        value={c.name}
                                        onChange={(e) => {
                                          const updated = [...s.importedClasses];
                                          updated[i] = { ...updated[i], name: e.target.value };
                                          s.setImportedClasses(updated);
                                        }}
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>{c.grade}</TableCell>
                                    <TableCell>{c.section || "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">إلغاء</Button>
                      </DialogClose>
                      {s.importedClasses.length > 0 && (
                        <Button onClick={s.handleImportClasses} disabled={s.importingClasses}>
                          <Download className="h-4 w-4 ml-1.5" />
                          {s.importingClasses ? "جارٍ الاستيراد..." : `استيراد ${s.importedClasses.length} فصل`}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                       إضافة فصل
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة فصل جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label>اسم الفصل</Label>
                        <Input value={s.newClassName} onChange={(e) => s.setNewClassName(e.target.value)} placeholder="مثال: 1/1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>الصف</Label>
                        <Select value={s.newGrade} onValueChange={s.setNewGrade}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>رقم الفصل</Label>
                          <Input value={s.newSection} onChange={(e) => s.setNewSection(e.target.value)} placeholder="1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>السنة</Label>
                          <Input value={s.newYear} onChange={(e) => s.setNewYear(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">إلغاء</Button>
                      </DialogClose>
                      <Button onClick={s.handleAddClass}>
                        <Plus className="h-4 w-4 ml-1.5" />
                        إضافة
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">الفصل</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">رقم الفصل</TableHead>
                    <TableHead className="text-right">السنة</TableHead>
                    <TableHead className="text-right">الطلاب</TableHead>
                    {s.isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.classes.map((cls) => (
                    <TableRow key={cls.id} className="group" onDoubleClick={() => {
                      if (!s.isAdmin) return;
                      s.startEditingClass(cls);
                    }}>
                      <TableCell className="font-medium">
                        {s.isAdmin && s.editingClassId === cls.id ? (
                          <Input value={s.editingClassName} onChange={(e) => s.setEditingClassName(e.target.value)} className="h-8 w-28"
                            onKeyDown={(e) => { if (e.key === "Enter") s.handleSaveClassEdit(cls.id); if (e.key === "Escape") s.setEditingClassId(null); }} />
                        ) : cls.name}
                      </TableCell>
                      <TableCell>
                        {s.isAdmin && s.editingClassId === cls.id ? (
                          <Select value={s.editingClassGrade} onValueChange={s.setEditingClassGrade}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : cls.grade}
                      </TableCell>
                      <TableCell>
                        {s.isAdmin && s.editingClassId === cls.id ? (
                          <Input value={s.editingClassSection} onChange={(e) => s.setEditingClassSection(e.target.value)} className="h-8 w-16" />
                        ) : cls.section}
                      </TableCell>
                      <TableCell>
                        {s.isAdmin && s.editingClassId === cls.id ? (
                          <Input value={s.editingClassYear} onChange={(e) => s.setEditingClassYear(e.target.value)} className="h-8 w-24" />
                        ) : cls.academic_year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{cls.studentCount || 0}</Badge>
                      </TableCell>
                      {s.isAdmin && (
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {s.editingClassId === cls.id ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => s.handleSaveClassEdit(cls.id)}>
                                  <Check className="h-3.5 w-3.5 text-success" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => s.setEditingClassId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => s.startEditingClass(cls)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => s.setScheduleDialogClass({ id: cls.id, name: cls.name })}>
                                  <CalendarDays className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent dir="rtl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>حذف الفصل {cls.name}؟</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        سيتم حذف الفصل وفصل ربطه بالطلاب. فئات التقييم ستبقى محفوظة ويمكن إعادة ربطها لاحقاً.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => s.handleDeleteClass(cls.id)}>
                                        حذف
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {s.scheduleDialogClass && (
        <ClassScheduleDialog
          open={!!s.scheduleDialogClass}
          onOpenChange={(open) => { if (!open) s.setScheduleDialogClass(null); }}
          classId={s.scheduleDialogClass.id}
          className={s.scheduleDialogClass.name}
        />
      )}

      {s.activeCard === "categories" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                فئات التقييم
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-bold shrink-0">الفصل:</Label>
              <Select value={s.catClassFilter} onValueChange={s.setCatClassFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  {s.orphanedCategories.length > 0 && (
                    <SelectItem value="orphaned">فئات غير مرتبطة ({s.orphanedCategories.length})</SelectItem>
                  )}
                  {s.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {s.isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" />
                      استيراد من Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader><DialogTitle>استيراد فئات التقييم</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                        الأعمدة المطلوبة: <strong>اسم الفئة</strong>، <strong>الدرجة القصوى</strong>. اختياري: الترتيب، القسم
                      </div>
                      <div className="space-y-1.5">
                        <Label>الفصل الدراسي</Label>
                        <Select value={s.newCatClassId} onValueChange={s.setNewCatClassId}>
                          <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الفصول</SelectItem>
                            {s.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملف Excel أو CSV</Label>
                        <Input type="file" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !s.newCatClassId) return;
                          const XLSX = await import("xlsx");
                          const data = await file.arrayBuffer();
                          const wb = XLSX.read(data);
                          const ws = wb.Sheets[wb.SheetNames[0]];
                          const json: any[] = XLSX.utils.sheet_to_json(ws);
                          let order = s.categories.filter(c => c.class_id === s.newCatClassId).length;
                          for (const row of json) {
                            const name = row["اسم الفئة"] || row["name"] || row["الفئة"];
                            const max = parseFloat(row["الدرجة القصوى"] || row["max_score"] || row["الدرجة"] || 100);
                            if (!name) continue;
                            order++;
                            await supabase.from("grade_categories").insert({
                              name, max_score: max, class_id: s.newCatClassId, sort_order: order, category_group: "classwork", weight: 10
                            });
                          }
                          toast({ title: "تم الاستيراد", description: `تم استيراد الفئات بنجاح` });
                          s.fetchData();
                        }} className="cursor-pointer" />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      إضافة فئة
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader><DialogTitle>إضافة فئة تقييم</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label>الفصل الدراسي</Label>
                        <Select value={s.newCatClassId} onValueChange={s.setNewCatClassId}>
                          <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الفصول</SelectItem>
                            {s.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>القسم</Label>
                        <Select value={s.newCatGroup} onValueChange={s.setNewCatGroup}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classwork">المهام الأدائية والمشاركة والتفاعل</SelectItem>
                            <SelectItem value="exam">الاختبارات</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>اسم الفئة</Label>
                        <Input value={s.newCatName} onChange={(e) => s.setNewCatName(e.target.value)} placeholder="مثال: المشاركة" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>الدرجة القصوى</Label>
                        <Input type="number" value={s.newCatMaxScore} onChange={(e) => s.setNewCatMaxScore(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                      <Button onClick={s.handleAddCategory}><Plus className="h-4 w-4 ml-1.5" />إضافة</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {Object.keys(s.editingCats).length > 0 && (
                  <Button size="sm" variant="default" className="gap-1.5" onClick={s.handleSaveCategories} disabled={s.savingCats}>
                    <Save className="h-4 w-4" />
                    {s.savingCats ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                  </Button>
                )}
              </div>
            )}

            {/* Orphaned categories notice */}
            {s.isAdmin && s.orphanedCategories.length > 0 && s.catClassFilter !== "orphaned" && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300">
                    يوجد {s.orphanedCategories.length} فئة غير مرتبطة بفصل (محفوظة من فصول محذوفة)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select onValueChange={s.handleReassignOrphanedCategories}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="ربط بفصل..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_classes">جميع الفصول</SelectItem>
                      {s.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <CategoryTable
              title="المهام الأدائية والمشاركة والتفاعل"
              emoji="📝"
              colorScheme="emerald"
              emptyText="لا توجد فئات — أضف: المشاركة، الواجبات، الأعمال والمشاريع"
              categories={s.classworkCategories}
              allCategories={s.categories}
              classes={s.classes}
              editingCats={s.editingCats}
              setEditingCats={s.setEditingCats}
              isAdmin={s.isAdmin}
              catClassFilter={s.catClassFilter}
              targetGroupLabel="الاختبارات"
              targetGroupKey="exam"
              onReorder={s.handleReorderCategory}
              onDelete={s.handleDeleteCategory}
            />

            <CategoryTable
              title="الاختبارات"
              emoji="📋"
              colorScheme="amber"
              emptyText="لا توجد فئات — أضف: اختبار عملي، اختبار الفترة"
              categories={s.examCategories}
              allCategories={s.categories}
              classes={s.classes}
              editingCats={s.editingCats}
              setEditingCats={s.setEditingCats}
              isAdmin={s.isAdmin}
              catClassFilter={s.catClassFilter}
              targetGroupLabel="المهام الأدائية"
              targetGroupKey="classwork"
              onReorder={s.handleReorderCategory}
              onDelete={s.handleDeleteCategory}
            />

            {s.catClassFilter === "all" && (
              <p className="text-xs text-muted-foreground text-center">
                💡 أي تعديل سيُطبق على جميع الفصول تلقائياً — الفئات الناقصة ستُضاف للفصول المفقودة عند الحفظ
              </p>
            )}

            {/* Extra Slots Toggle */}
            {s.isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10">
                  <div>
                    <h4 className="text-sm font-bold">{s.dailyExtraSlotsEnabled ? "🔓" : "🔒"} زيادة رموز التقييم</h4>
                    <p className="text-[11px] text-muted-foreground">السماح بإضافة رموز تقييم إضافية في الإدخال اليومي</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.dailyExtraSlotsEnabled && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">الحد الأقصى:</span>
                        <Select value={String(s.dailyMaxSlots)} onValueChange={async (val) => {
                          const num = Number(val);
                          s.setDailyMaxSlots(num);
                          await supabase.from("site_settings").upsert({ id: "daily_max_slots", value: val });
                          toast({ title: `تم تحديد الحد الأقصى إلى ${num} رموز` });
                        }}>
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        const newVal = !s.dailyExtraSlotsEnabled;
                        s.setDailyExtraSlotsEnabled(newVal);
                        await supabase.from("site_settings").upsert({ id: "daily_extra_slots_enabled", value: String(newVal) });
                        toast({ title: newVal ? "تم الفتح" : "تم القفل", description: newVal ? "يمكن الآن إضافة رموز تقييم إضافية" : "تم قفل الرموز الإضافية — رمز واحد فقط" });
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        s.dailyExtraSlotsEnabled ? "bg-success text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.dailyExtraSlotsEnabled ? "مفتوح للكل" : "مقفل للكل"}
                    </button>
                  </div>
                </div>

                {s.classworkCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/30 bg-muted/5">
                    <p className="w-full text-[11px] text-muted-foreground mb-1">تخصيص عدد الرموز لكل فئة (اضغط للقفل/الفتح، واختر العدد):</p>
                    {(() => {
                      const seen = new Set<string>();
                      return s.classworkCategories.filter(cat => {
                        if (seen.has(cat.name)) return false;
                        seen.add(cat.name);
                        return true;
                      });
                    })().map((cat) => {
                      const catKey = cat.name;
                      const isDisabled = !s.dailyExtraSlotsEnabled || s.dailyExtraSlotsDisabledCats.includes(catKey);
                      const catMax = s.dailyMaxSlotsPerCat[catKey] ?? s.dailyMaxSlots;
                      return (
                        <div key={catKey} className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              if (!s.dailyExtraSlotsEnabled) {
                                toast({ title: "يجب فتح زيادة الرموز أولاً", variant: "destructive" });
                                return;
                              }
                              const newList = s.dailyExtraSlotsDisabledCats.includes(catKey)
                                ? s.dailyExtraSlotsDisabledCats.filter(k => k !== catKey)
                                : [...s.dailyExtraSlotsDisabledCats, catKey];
                              s.setDailyExtraSlotsDisabledCats(newList);
                              await supabase.from("site_settings").upsert({ id: "daily_extra_slots_disabled_cats", value: JSON.stringify(newList) });
                              toast({ title: s.dailyExtraSlotsDisabledCats.includes(catKey) ? `تم فتح الزيادة لـ "${cat.name}"` : `تم قفل الزيادة لـ "${cat.name}"` });
                            }}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 rounded-r-lg text-xs font-medium transition-all border border-l-0",
                              isDisabled
                                ? "bg-muted/50 text-muted-foreground border-border/50"
                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                            )}
                          >
                            {isDisabled ? "🔒" : "🔓"} {cat.name}
                          </button>
                          <Select
                            value={String(isDisabled ? 1 : catMax)}
                            disabled={isDisabled}
                            onValueChange={async (val) => {
                              const newMap = { ...s.dailyMaxSlotsPerCat, [catKey]: Number(val) };
                              s.setDailyMaxSlotsPerCat(newMap);
                              await supabase.from("site_settings").upsert({ id: "daily_max_slots_per_cat", value: JSON.stringify(newMap) });
                              toast({ title: `حد "${cat.name}" = ${val} رموز` });
                            }}>
                            <SelectTrigger className={cn("h-7 w-14 text-xs rounded-l-lg rounded-r-none border-r-0", isDisabled && "opacity-50")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {s.activeCard === "print" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Printer className="h-5 w-5 text-primary" />
                ورقة الطباعة والتصدير
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PrintHeaderEditor />
          </CardContent>
        </Card>
      )}

      {s.activeCard === "colors" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                ألوان الاختبارات
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "لون أسئلة الاختيار من متعدد", value: s.quizColorMcq, setter: s.setQuizColorMcq },
                { label: "لون أسئلة الصح والخطأ", value: s.quizColorTf, setter: s.setQuizColorTf },
                { label: "لون الإجابة المختارة", value: s.quizColorSelected, setter: s.setQuizColorSelected },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <Label className="text-sm font-semibold">{item.label}</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUIZ_COLOR_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => item.setter(opt.value)}
                        className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                          item.value === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: opt.value }}
                        title={opt.label} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: item.value }} />
                    <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === item.value)?.label || item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة:</p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorMcq }}>اختياري</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorTf }}>صح/خطأ</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorSelected }}>الإجابة</div>
              </div>
            </div>
            <Button disabled={s.savingQuizColors} className="gap-1.5"
              onClick={async () => {
                s.setSavingQuizColors(true);
                const results = await Promise.all([
                  supabase.from("site_settings").upsert({ id: "quiz_color_mcq", value: s.quizColorMcq }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_tf", value: s.quizColorTf }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_selected", value: s.quizColorSelected }),
                ]);
                s.setSavingQuizColors(false);
                if (results.some(r => r.error)) {
                  toast({ title: "خطأ", description: "فشل حفظ ألوان الاختبارات", variant: "destructive" });
                } else {
                  toast({ title: "تم الحفظ", description: "تم تحديث ألوان الاختبارات بنجاح" });
                }
              }}>
              <Save className="h-4 w-4" />
              {s.savingQuizColors ? "جارٍ الحفظ..." : "حفظ الألوان"}
            </Button>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "visibility" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" />
                التحكم بعرض بيانات الطالب
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <h4 className="text-sm font-bold mb-2">👁️ الأقسام المعروضة</h4>
                <div className="space-y-1.5">
                  {[
                    { key: "grades" as const, label: "الدرجات", icon: GraduationCap, state: s.showGrades, setter: s.setShowGrades },
                    { key: "attendance" as const, label: "الحضور والغياب", icon: Users, state: s.showAttendance, setter: s.setShowAttendance },
                    { key: "behavior" as const, label: "السلوك", icon: Eye, state: s.showBehavior, setter: s.setShowBehavior },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => item.setter(!item.state)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-right",
                        item.state
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border/40 bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.state ? <Eye className="h-3 w-3 shrink-0" /> : <EyeOff className="h-3 w-3 shrink-0" />}
                      <span className="text-[10px]">{item.state ? "ظاهر" : "مخفي"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <EvaluationToggles
                showDailyGrades={s.studentShowDailyGrades}
                setShowDailyGrades={s.setStudentShowDailyGrades}
                showClassworkIcons={s.studentShowClassworkIcons}
                setShowClassworkIcons={s.setStudentShowClassworkIcons}
                classworkIconsCount={s.studentClassworkIconsCount}
                setClassworkIconsCount={s.setStudentClassworkIconsCount}
              />
            </div>

            {s.showGrades && (() => {
              const uniqueNames = Array.from(new Set(s.categories.map(c => c.name)));
              if (uniqueNames.length === 0) return null;
              const currentHidden = s.hiddenCategories[s.visibilityPeriod];
              return (
                <Collapsible defaultOpen className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/20 transition-colors">
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      فئات التقييم المعروضة
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5 flex-1">
                        {([
                          { key: "p1" as const, label: "الفترة الأولى" },
                          { key: "p2" as const, label: "الفترة الثانية" },
                        ]).map(p => (
                          <button
                            key={p.key}
                            onClick={() => s.setVisibilityPeriod(p.key)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-bold transition-all",
                              s.visibilityPeriod === p.key
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {p.label}
                            {s.hiddenCategories[p.key].length > 0 && (
                              <span className="text-[9px] bg-destructive/20 text-destructive px-1 rounded-full">{s.hiddenCategories[p.key].length}</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-[10px] h-7 shrink-0"
                        onClick={() => {
                          const source = s.hiddenCategories[s.visibilityPeriod];
                          const targetPeriod = s.visibilityPeriod === "p1" ? "p2" : "p1";
                          s.setHiddenCategories(prev => ({ ...prev, [targetPeriod]: [...source] }));
                          toast({ title: "تم النسخ", description: `تم تطبيق على الفترتين` });
                        }}
                      >
                        <Check className="h-3 w-3" />
                        للفترتين
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-auto">
                      {uniqueNames.map(name => {
                        const isHidden = currentHidden.includes(name);
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              s.setHiddenCategories(prev => ({
                                ...prev,
                                [s.visibilityPeriod]: isHidden
                                  ? prev[s.visibilityPeriod].filter(n => n !== name)
                                  : [...prev[s.visibilityPeriod], name]
                              }));
                            }}
                            className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-all",
                              isHidden
                                ? "bg-destructive/10 text-destructive border-destructive/30 line-through"
                                : "bg-success/10 text-success border-success/30"
                            )}
                          >
                            {isHidden ? <EyeOff className="inline h-2.5 w-2.5 ml-0.5" /> : <Eye className="inline h-2.5 w-2.5 ml-0.5" />}
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })()}

            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div>
                  <h4 className="text-sm font-bold">لوحة الشرف</h4>
                  <p className="text-[10px] text-muted-foreground">عرض الطلاب المتميزين (انتظام كامل + درجة كاملة)</p>
                </div>
              </div>
              <Button
                variant={s.honorRollEnabled ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5 min-w-[90px]", s.honorRollEnabled && "bg-amber-500 hover:bg-amber-600 text-amber-950")}
                disabled={s.savingHonorRoll}
                onClick={async () => {
                  s.setSavingHonorRoll(true);
                  const newVal = !s.honorRollEnabled;
                  await supabase.from("site_settings").upsert({ id: "honor_roll_enabled", value: String(newVal) });
                  s.setHonorRollEnabled(newVal);
                  s.setSavingHonorRoll(false);
                  toast({ title: newVal ? "تم التفعيل" : "تم التعطيل", description: newVal ? "لوحة الشرف مرئية للطلاب" : "تم إخفاء لوحة الشرف" });
                }}
              >
                {s.honorRollEnabled ? <><Eye className="h-3.5 w-3.5" /> مفعّلة</> : <><EyeOff className="h-3.5 w-3.5" /> معطّلة</>}
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                disabled={s.savingVisibility}
                className="gap-1.5"
                onClick={async () => {
                  s.setSavingVisibility(true);
                  const results = await Promise.all([
                    supabase.from("site_settings").upsert({ id: "student_show_grades", value: String(s.showGrades) }),
                    supabase.from("site_settings").upsert({ id: "student_show_attendance", value: String(s.showAttendance) }),
                    supabase.from("site_settings").upsert({ id: "student_show_behavior", value: String(s.showBehavior) }),
                    supabase.from("site_settings").upsert({ id: "student_hidden_categories", value: JSON.stringify(s.hiddenCategories) }),
                    supabase.from("site_settings").upsert({ id: "student_show_daily_grades", value: String(s.studentShowDailyGrades) }),
                    supabase.from("site_settings").upsert({ id: "student_show_classwork_icons", value: String(s.studentShowClassworkIcons) }),
                    supabase.from("site_settings").upsert({ id: "student_classwork_icons_count", value: String(s.studentClassworkIconsCount) }),
                  ]);
                  s.setSavingVisibility(false);
                  if (results.some(r => r.error)) {
                    toast({ title: "خطأ", description: "فشل حفظ إعدادات العرض", variant: "destructive" });
                  } else {
                    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات عرض الطالب" });
                  }
                }}
              >
                <Save className="h-4 w-4" />
                {s.savingVisibility ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <Button variant="outline" className="gap-1.5 text-xs"
                onClick={() => {
                  s.setShowGrades(true); s.setShowAttendance(true); s.setShowBehavior(true);
                  s.setHiddenCategories({ p1: [], p2: [] });
                  s.setStudentShowDailyGrades(true); s.setStudentShowClassworkIcons(true); s.setStudentClassworkIconsCount(10);
                  toast({ title: "تم الاستعادة", description: "تم استعادة الإعدادات الافتراضية — اضغط حفظ لتأكيدها" });
                }}>
                <RotateCcw className="h-3.5 w-3.5" />
                استعادة الافتراضي
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "popup" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="h-5 w-5 text-primary" />
                رسالة منبثقة للطلاب
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-bold">تفعيل الرسالة المنبثقة</Label>
              <button
                onClick={() => s.setPopupEnabled(!s.popupEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                  s.popupEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                  s.popupEnabled ? "translate-x-1" : "translate-x-6"
                )} />
              </button>
            </div>
            <div className="space-y-2">
              <Label>عنوان الرسالة</Label>
              <Input value={s.popupTitle} onChange={(e) => s.setPopupTitle(e.target.value)} placeholder="مثال: تنبيه مهم" />
            </div>
            <div className="space-y-2">
              <Label>نص الرسالة</Label>
              <Textarea value={s.popupMessage} onChange={(e) => s.setPopupMessage(e.target.value)} placeholder="اكتب الرسالة التي تريد عرضها للطلاب..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ انتهاء الرسالة (اختياري)</Label>
              <Input type="datetime-local" value={s.popupExpiry} onChange={(e) => s.setPopupExpiry(e.target.value)} dir="ltr" className="text-right" />
              {s.popupExpiry && (
                <p className="text-xs text-muted-foreground">ستختفي الرسالة تلقائياً بعد: {new Date(s.popupExpiry).toLocaleString("ar-SA")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>استهداف الفصول</Label>
              <Select value={s.popupTargetType} onValueChange={(v: "all" | "specific") => { s.setPopupTargetType(v); if (v === "all") s.setPopupTargetClassIds([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطلاب</SelectItem>
                  <SelectItem value="specific">فصول محددة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {s.popupTargetType === "specific" && (
              <div className="space-y-2">
                <Label>اختر الفصول</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 max-h-40 overflow-y-auto">
                  {s.classes.map((c) => {
                    const isSelected = s.popupTargetClassIds.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => s.setPopupTargetClassIds((prev) => isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/40 hover:border-primary/40"
                        )}
                      >{c.name}</button>
                    );
                  })}
                </div>
                {s.popupTargetClassIds.length > 0 && <p className="text-xs text-muted-foreground">تم اختيار {s.popupTargetClassIds.length} فصل</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>التوجيه عند الضغط (اختياري)</Label>
              <Select value={s.popupAction} onValueChange={s.setPopupAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون توجيه</SelectItem>
                  <SelectItem value="grades">الدرجات</SelectItem>
                  <SelectItem value="attendance">الحضور</SelectItem>
                  <SelectItem value="behavior">السلوك</SelectItem>
                  <SelectItem value="activities">الأنشطة</SelectItem>
                  <SelectItem value="library">المكتبة</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">عند اختيار وجهة، سيظهر للطالب زر للانتقال مباشرة إلى القسم المحدد</p>
            </div>
            <div className="space-y-2">
              <Label>تكرار الرسالة</Label>
              <Select value={s.popupRepeat} onValueChange={s.setPopupRepeat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تكرار (مرة واحدة)</SelectItem>
                  <SelectItem value="daily">يومياً</SelectItem>
                  <SelectItem value="weekly">أسبوعياً</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {s.popupRepeat === "daily" && "ستظهر الرسالة للطالب مرة واحدة كل يوم"}
                {s.popupRepeat === "weekly" && "ستظهر الرسالة للطالب مرة واحدة كل أسبوع"}
                {s.popupRepeat === "none" && "ستظهر الرسالة مرة واحدة فقط للطالب"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={s.savingPopup} className="gap-1.5"
                onClick={async () => {
                  s.setSavingPopup(true);
                  const updates = [
                    supabase.from("site_settings").upsert({ id: "student_popup_enabled", value: String(s.popupEnabled) }),
                    supabase.from("site_settings").upsert({ id: "student_popup_title", value: s.popupTitle }),
                    supabase.from("site_settings").upsert({ id: "student_popup_message", value: s.popupMessage }),
                    supabase.from("site_settings").upsert({ id: "student_popup_expiry", value: s.popupExpiry }),
                    supabase.from("site_settings").upsert({ id: "student_popup_target_type", value: s.popupTargetType }),
                    supabase.from("site_settings").upsert({ id: "student_popup_target_classes", value: JSON.stringify(s.popupTargetClassIds) }),
                    supabase.from("site_settings").upsert({ id: "student_popup_action", value: s.popupAction }),
                    supabase.from("site_settings").upsert({ id: "student_popup_repeat", value: s.popupRepeat }),
                  ];
                  const results = await Promise.all(updates);
                  if (s.popupTitle.trim() && s.popupMessage.trim() && s.user) {
                    await supabase.from("popup_messages").insert({
                      title: s.popupTitle, message: s.popupMessage, expiry: s.popupExpiry || null,
                      target_type: s.popupTargetType, target_class_ids: s.popupTargetClassIds, created_by: s.user.id,
                    } as any);
                    const { data: historyData } = await supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20);
                    if (historyData) s.setPopupHistory(historyData as any);
                  }
                  s.setSavingPopup(false);
                  if (results.some((r) => r.error)) {
                    toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                  } else {
                    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الرسالة المنبثقة" });
                  }
                }}>
                <Save className="h-4 w-4" />
                {s.savingPopup ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" className="gap-1.5"
                onClick={() => { s.setPreviewTitle(s.popupTitle); s.setPreviewMessage(s.popupMessage); s.setPopupPreviewOpen(true); }}
                disabled={!s.popupTitle.trim() && !s.popupMessage.trim()}>
                <Eye className="h-4 w-4" />
                معاينة
              </Button>
            </div>
            {s.popupHistory.length > 0 && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  سجل الرسائل السابقة
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {s.popupHistory.map((msg) => (
                    <div key={msg.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{new Date(msg.created_at).toLocaleDateString("ar-SA")}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.target_type === "all" ? "جميع الطلاب" : `${(msg.target_class_ids || []).length} فصل`}</Badge>
                          {msg.expiry && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ينتهي: {new Date(msg.expiry).toLocaleDateString("ar-SA")}</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7"
                          onClick={() => {
                            s.setPopupTitle(msg.title); s.setPopupMessage(msg.message); s.setPopupExpiry(msg.expiry || "");
                            s.setPopupTargetType(msg.target_type as "all" | "specific"); s.setPopupTargetClassIds(msg.target_class_ids || []);
                            s.setPopupEnabled(true); toast({ title: "تم تحميل الرسالة", description: "اضغط حفظ لتفعيلها" });
                          }}>
                          <RotateCcw className="h-3 w-3" />
                          تفعيل
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الرسالة المنبثقة؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم حذف الرسالة نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                await supabase.from("popup_messages").delete().eq("id", msg.id);
                                s.setPopupHistory((prev) => prev.filter((m) => m.id !== msg.id));
                                toast({ title: "تم الحذف" });
                              }}>حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {s.activeCard === "calendar_year" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                التقويم والعام الدراسي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">🗓️ نوع التقويم الافتراضي</h3>
              <p className="text-xs text-muted-foreground">يُستخدم في جميع صفحات التحضير والدرجات والتقارير.</p>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {[
                  { value: "gregorian" as const, label: "ميلادي", sub: "Gregorian", emoji: "🌍" },
                  { value: "hijri" as const, label: "هجري", sub: "Hijri (أم القرى)", emoji: "🕌" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => s.setGlobalCalendarType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                      s.calendarTypeLocal === opt.value
                        ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                        : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm font-bold text-foreground">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">{opt.sub}</span>
                    {s.calendarTypeLocal === opt.value && (
                      <Badge variant="default" className="text-[10px] px-2 py-0">
                        <Check className="h-3 w-3 ml-1" />
                        مُفعّل
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-border/50" />
            <div className="space-y-3 max-w-md">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">🎓 العام الدراسي الافتراضي</h3>
              <p className="text-xs text-muted-foreground">يُستخدم عند إنشاء فصول جديدة.</p>
              <div className="space-y-2">
                <Label>العام الدراسي</Label>
                <Input value={s.defaultAcademicYear} onChange={(e) => s.setDefaultAcademicYear(e.target.value)} placeholder="مثال: 1446-1447" dir="ltr" className="text-center text-lg font-bold" />
              </div>
              <div className="flex flex-wrap gap-2">
                {["1445-1446", "1446-1447", "1447-1448", "1448-1449"].map((yr) => (
                  <button key={yr} onClick={() => s.setDefaultAcademicYear(yr)}
                    className={cn("px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                      s.defaultAcademicYear === yr ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                    )}>{yr}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button disabled={s.savingAcademicYear || !s.defaultAcademicYear.trim()} className="gap-1.5"
                  onClick={async () => {
                    s.setSavingAcademicYear(true);
                    const { error } = await supabase.from("site_settings").upsert({ id: "default_academic_year", value: s.defaultAcademicYear }, { onConflict: "id" });
                    s.setSavingAcademicYear(false);
                    if (error) {
                      toast({ title: "خطأ", description: "فشل حفظ العام الدراسي", variant: "destructive" });
                    } else {
                      s.setNewYear(s.defaultAcademicYear);
                      toast({ title: "تم الحفظ", description: `العام الدراسي الافتراضي: ${s.defaultAcademicYear}` });
                    }
                  }}>
                  <Save className="h-4 w-4" />
                  {s.savingAcademicYear ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                      <RotateCcw className="h-4 w-4" />
                      تحديث جميع الفصول ({s.classes.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>تحديث العام الدراسي لجميع الفصول؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم تحديث العام الدراسي لجميع الفصول ({s.classes.length} فصل) إلى "{s.defaultAcademicYear}". هل أنت متأكد؟
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        const updates = s.classes.map(cls =>
                          supabase.from("classes").update({ academic_year: s.defaultAcademicYear }).eq("id", cls.id)
                        );
                        const results = await Promise.all(updates);
                        if (results.some(r => r.error)) {
                          toast({ title: "خطأ", description: "فشل تحديث بعض الفصول", variant: "destructive" });
                        } else {
                          toast({ title: "تم التحديث", description: `تم تحديث ${s.classes.length} فصل إلى ${s.defaultAcademicYear}` });
                          s.fetchData();
                        }
                      }}>تحديث الكل</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "academic_calendar" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                التقويم الأكاديمي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AcademicCalendarSettings />
          </CardContent>
        </Card>
      )}

      {s.activeCard === "attendance_settings" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                إعدادات التحضير
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {s.attendanceOverrideLock ? <LockOpen className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-success" />}
                  قفل التحضير التلقائي
                </h3>
                <p className="text-xs text-muted-foreground mt-1">عند تفعيل القفل، لا يمكن تعديل التحضير بعد تسجيله — إلا بإلغاء القفل.</p>
              </div>
              <Switch
                checked={!s.attendanceOverrideLock}
                onCheckedChange={async (checked) => {
                  const newVal = !checked;
                  s.setAttendanceOverrideLock(newVal);
                  await supabase.from("site_settings").upsert({ id: "attendance_override_lock", value: String(newVal) });
                  toast({ title: checked ? "القفل مفعّل" : "القفل معطّل", description: checked ? "التحضير المسجل لن يمكن تعديله" : "يمكن تعديل التحضير في أي وقت" });
                }}
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                عدد الحصص الأسبوعية لكل فصل
              </h3>
              <p className="text-xs text-muted-foreground">حدد عدد الحصص المطلوبة أسبوعياً لكل فصل. عند الوصول للحد، سيتم قفل التحضير تلقائياً.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {s.classes.map((c) => {
                  const schedule = s.classSchedules[c.id];
                  const periodsPerWeek = schedule?.periodsPerWeek ?? 5;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
                      <span className="font-medium text-sm truncate flex-1">{c.name}</span>
                      <div className="flex items-center gap-2 mr-2">
                        <Button variant="outline" size="icon" className="h-7 w-7 text-xs"
                          onClick={() => s.saveClassSchedule(c.id, Math.max(1, periodsPerWeek - 1))}>−</Button>
                        <span className="w-8 text-center font-bold text-primary">{periodsPerWeek}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-xs"
                          onClick={() => s.saveClassSchedule(c.id, Math.min(20, periodsPerWeek + 1))}>+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>

          <CardContent className="space-y-5 border-t border-border/30 pt-5">
            <h3 className="font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              حد إنذار الغياب
            </h3>
            <div className="space-y-2">
              <Label>طريقة تحديد الحد</Label>
              <div className="flex gap-2">
                <Button variant={s.absenceMode === "percentage" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => s.setAbsenceMode("percentage")}>بالنسبة المئوية (%)</Button>
                <Button variant={s.absenceMode === "sessions" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => s.setAbsenceMode("sessions")}>بعدد الحصص</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>إجمالي حصص الفصل الدراسي</Label>
              <div className="flex items-center gap-3">
                <Input type="number" min={10} max={500} value={s.totalTermSessions || ""} onChange={(e) => { const val = Math.min(500, Math.max(0, Number(e.target.value) || 0)); s.setTotalTermSessions(val); if (s.absenceMode === "percentage" && val > 0) s.setAbsenceAllowedSessions(Math.round((s.absenceThreshold / 100) * val)); if (s.absenceMode === "sessions" && val > 0 && s.absenceAllowedSessions > 0) s.setAbsenceThreshold(Math.round((s.absenceAllowedSessions / val) * 100)); }} className="w-28 text-center font-bold text-lg" dir="ltr" placeholder="مثال: 90" />
                <span className="text-sm text-muted-foreground">حصة</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نسبة الغياب المسموح (%)</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={5} max={50} value={s.absenceThreshold} onChange={(e) => { const val = Math.min(50, Math.max(5, Number(e.target.value) || 20)); s.setAbsenceThreshold(val); if (s.totalTermSessions > 0) s.setAbsenceAllowedSessions(Math.round((val / 100) * s.totalTermSessions)); }} className={cn("w-24 text-center font-bold text-lg", s.absenceMode === "percentage" && "ring-2 ring-primary")} dir="ltr" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 25, 30].map((v) => (<Button key={v} variant={s.absenceThreshold === v ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => { s.setAbsenceThreshold(v); if (s.totalTermSessions > 0) s.setAbsenceAllowedSessions(Math.round((v / 100) * s.totalTermSessions)); }}>{v}%</Button>))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>عدد الحصص المسموح بها</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={1} max={200} value={s.absenceAllowedSessions || ""} onChange={(e) => { const val = Math.min(200, Math.max(0, Number(e.target.value) || 0)); s.setAbsenceAllowedSessions(val); if (s.totalTermSessions > 0 && val > 0) s.setAbsenceThreshold(Math.round((val / s.totalTermSessions) * 100)); }} className={cn("w-24 text-center font-bold text-lg", s.absenceMode === "sessions" && "ring-2 ring-primary")} dir="ltr" placeholder="مثال: 5" />
                  <span className="text-sm text-muted-foreground">حصة</span>
                </div>
                {s.totalTermSessions > 0 && s.absenceAllowedSessions > 0 && (<p className="text-xs text-info font-medium">= {Math.round((s.absenceAllowedSessions / s.totalTermSessions) * 100)}% من إجمالي {s.totalTermSessions} حصة</p>)}
              </div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />إجراء تلقائي عند التجاوز</p>
              <p className="text-xs text-muted-foreground">عند تجاوز الطالب عدد الحصص المسموح بها ({s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`})، يتم تحويل حالته تلقائياً إلى <strong className="text-destructive">"محروم من دخول الاختبار"</strong>.</p>
            </div>
            <Button onClick={async () => { s.setSavingThreshold(true); await Promise.all([supabase.from("site_settings").upsert({ id: "absence_threshold", value: String(s.absenceThreshold) }), supabase.from("site_settings").upsert({ id: "absence_allowed_sessions", value: String(s.absenceAllowedSessions) }), supabase.from("site_settings").upsert({ id: "absence_mode", value: s.absenceMode }), supabase.from("site_settings").upsert({ id: "total_term_sessions", value: String(s.totalTermSessions) })]); s.setSavingThreshold(false); toast({ title: "تم الحفظ", description: `تم تعيين حد الإنذار: ${s.absenceMode === "sessions" && s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`}` }); }} disabled={s.savingThreshold} className="gap-1.5"><Save className="h-4 w-4" />{s.savingThreshold ? "جارٍ الحفظ..." : "حفظ حد الإنذار"}</Button>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "parent_portal" && s.isAdmin && (
        <Card className="border-2 border-pink-400/30 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-pink-500" />
                بوابة ولي الأمر
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">💬 رسالة الترحيب</h4>
                  <button onClick={() => s.setParentWelcomeEnabled(!s.parentWelcomeEnabled)}
                    className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200", s.parentWelcomeEnabled ? "bg-primary" : "bg-muted")}>
                    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200", s.parentWelcomeEnabled ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
                {s.parentWelcomeEnabled && (
                  <>
                    <Textarea value={s.parentWelcomeMessage} onChange={(e) => s.setParentWelcomeMessage(e.target.value)} placeholder="مرحباً بك ولي أمر الطالب / {name}..." className="min-h-[60px] text-xs" dir="rtl" />
                    <p className="text-[10px] text-muted-foreground">
                      استخدم <code className="bg-muted px-1 rounded text-primary font-mono">{"{name}"}</code> ليتم استبداله باسم الطالب
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <h4 className="text-sm font-bold mb-2">👁️ التحكم بالعرض</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "national_id", label: "الهوية الوطنية", icon: KeyRound, state: s.parentShowNationalId, setter: s.setParentShowNationalId },
                    { key: "grades", label: "الدرجات", icon: GraduationCap, state: s.parentShowGrades, setter: s.setParentShowGrades },
                    { key: "attendance", label: "الحضور والغياب", icon: ClipboardCheck, state: s.parentShowAttendance, setter: s.setParentShowAttendance },
                    { key: "behavior", label: "السلوك", icon: Eye, state: s.parentShowBehavior, setter: s.setParentShowBehavior },
                    { key: "honor_roll", label: "لوحة الشرف", icon: Trophy, state: s.parentShowHonorRoll, setter: s.setParentShowHonorRoll },
                    { key: "absence_warning", label: "تنبيه الغياب", icon: AlertTriangle, state: s.parentShowAbsenceWarning, setter: s.setParentShowAbsenceWarning },
                    { key: "contact_teacher", label: "التواصل", icon: MessageSquare, state: s.parentShowContactTeacher, setter: s.setParentShowContactTeacher },
                    { key: "library", label: "المكتبة", icon: Eye, state: s.parentShowLibrary, setter: s.setParentShowLibrary },
                    { key: "activities", label: "الأنشطة", icon: Eye, state: s.parentShowActivities, setter: s.setParentShowActivities },
                  ].map((item) => (
                    <button key={item.key} onClick={() => item.setter(!item.state)}
                      className={cn("flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all text-right",
                        item.state ? "border-success/40 bg-success/10 text-success" : "border-border/40 bg-muted/30 text-muted-foreground"
                      )}>
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.state ? <Eye className="h-3 w-3 mr-auto shrink-0" /> : <EyeOff className="h-3 w-3 mr-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {s.parentShowGrades && (
                <Collapsible defaultOpen className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/20 transition-colors">
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      إعدادات الدرجات
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card">
                      <span className="text-xs font-bold">العرض الافتراضي</span>
                      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
                        <button onClick={() => s.setParentGradesDefaultView("cards")}
                          className={cn("px-2.5 py-1 rounded text-[11px] font-bold transition-all", s.parentGradesDefaultView === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>بطاقات</button>
                        <button onClick={() => s.setParentGradesDefaultView("table")}
                          className={cn("px-2.5 py-1 rounded text-[11px] font-bold transition-all", s.parentGradesDefaultView === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>جدول</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card">
                      <span className="text-xs font-bold">الفترة المعروضة</span>
                      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
                        {[{ v: "both" as const, l: "كلاهما" }, { v: "1" as const, l: "الأولى" }, { v: "2" as const, l: "الثانية" }].map(opt => (
                          <button key={opt.v} onClick={() => s.setParentGradesVisiblePeriods(opt.v)}
                            className={cn("px-2 py-1 rounded text-[11px] font-bold transition-all", s.parentGradesVisiblePeriods === opt.v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { key: "percentage", label: "النسبة المئوية", state: s.parentGradesShowPercentage, setter: s.setParentGradesShowPercentage },
                        { key: "eval", label: "التقييم بالنجوم", state: s.parentGradesShowEval, setter: s.setParentGradesShowEval },
                      ].map(col => (
                        <button key={col.key} onClick={() => col.setter(!col.state)}
                          className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all",
                            col.state ? "border-success/40 bg-success/10 text-success" : "border-border/40 bg-card text-muted-foreground"
                          )}>
                          {col.state ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {col.label}
                        </button>
                      ))}
                    </div>
                    {s.categories.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted-foreground">إخفاء فئات محددة</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => s.setHiddenCatScope("global")}
                            className={cn("px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                              s.hiddenCatScope === "global" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border/40"
                            )}>عام</button>
                          {s.classes.map(cls => (
                            <button key={cls.id} onClick={() => s.setHiddenCatScope(cls.id)}
                              className={cn("px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                                s.hiddenCatScope === cls.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border/40"
                              )}>{cls.name}</button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(new Set(s.categories.map(c => c.name))).map(name => {
                            const hiddenList = s.hiddenCatScope === "global"
                              ? s.parentGradesHiddenCategories.global
                              : (s.parentGradesHiddenCategories.classes[s.hiddenCatScope] || []);
                            const isHidden = hiddenList.includes(name);
                            return (
                              <button key={name} onClick={() => {
                                s.setParentGradesHiddenCategories(prev => {
                                  if (s.hiddenCatScope === "global") {
                                    return { ...prev, global: isHidden ? prev.global.filter(n => n !== name) : [...prev.global, name] };
                                  } else {
                                    const classHidden = prev.classes[s.hiddenCatScope] || [];
                                    return { ...prev, classes: { ...prev.classes, [s.hiddenCatScope]: isHidden ? classHidden.filter(n => n !== name) : [...classHidden, name] } };
                                  }
                                });
                              }}
                                className={cn("px-2 py-1 rounded-md text-[10px] font-bold border transition-all",
                                  isHidden ? "bg-destructive/10 text-destructive border-destructive/30 line-through" : "bg-success/10 text-success border-success/30"
                                )}>
                                {isHidden ? <EyeOff className="inline h-2.5 w-2.5 ml-0.5" /> : <Eye className="inline h-2.5 w-2.5 ml-0.5" />}
                                {name}
                              </button>
                            );
                          })}
                        </div>
                        {s.hiddenCatScope !== "global" && (
                          <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1"
                              onClick={() => {
                                s.setParentGradesHiddenCategories(prev => {
                                  const newClasses = { ...prev.classes };
                                  s.classes.forEach(cls => { newClasses[cls.id] = [...(prev.classes[s.hiddenCatScope] || [])]; });
                                  return { ...prev, classes: newClasses };
                                });
                                toast({ title: "تم النسخ للكل" });
                              }}>النسخ للكل</Button>
                            <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1"
                              onClick={() => {
                                s.setParentGradesHiddenCategories(prev => ({ ...prev, global: [...(prev.classes[s.hiddenCatScope] || [])] }));
                                toast({ title: "تم التعميم" });
                              }}>تعميم على العام</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              <EvaluationToggles
                showDailyGrades={s.parentShowDailyGrades}
                setShowDailyGrades={s.setParentShowDailyGrades}
                showClassworkIcons={s.parentShowClassworkIcons}
                setShowClassworkIcons={s.setParentShowClassworkIcons}
                classworkIconsCount={s.parentClassworkIconsCount}
                setClassworkIconsCount={s.setParentClassworkIconsCount}
              />
            </div>

            <Collapsible className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/20 transition-colors">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-primary" />
                  ترويسة PDF ولي الأمر
                </h4>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">السطر الأول</Label>
                  <Input value={s.parentPdfHeader.line1} onChange={(e) => s.setParentPdfHeader(prev => ({ ...prev, line1: e.target.value }))} placeholder="المملكة العربية السعودية" className="text-xs h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">السطر الثاني</Label>
                  <Input value={s.parentPdfHeader.line2} onChange={(e) => s.setParentPdfHeader(prev => ({ ...prev, line2: e.target.value }))} placeholder="وزارة التعليم" className="text-xs h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">السطر الثالث</Label>
                  <Input value={s.parentPdfHeader.line3} onChange={(e) => s.setParentPdfHeader(prev => ({ ...prev, line3: e.target.value }))} placeholder="اسم المدرسة" className="text-xs h-8" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">إظهار الشعار</Label>
                  <button
                    onClick={() => s.setParentPdfHeader(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                    className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200", s.parentPdfHeader.showLogo ? "bg-primary" : "bg-muted")}>
                    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200", s.parentPdfHeader.showLogo ? "-translate-x-6" : "-translate-x-1")} />
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-3 pt-2">
              <Button disabled={s.savingParentWelcome} className="gap-1.5"
                onClick={async () => {
                  s.setSavingParentWelcome(true);
                  const results = await Promise.all([
                    supabase.from("site_settings").upsert({ id: "parent_welcome_enabled", value: String(s.parentWelcomeEnabled) }),
                    supabase.from("site_settings").upsert({ id: "parent_welcome_message", value: s.parentWelcomeMessage }),
                    supabase.from("site_settings").upsert({ id: "parent_show_national_id", value: String(s.parentShowNationalId) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_grades", value: String(s.parentShowGrades) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_attendance", value: String(s.parentShowAttendance) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_behavior", value: String(s.parentShowBehavior) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_honor_roll", value: String(s.parentShowHonorRoll) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_absence_warning", value: String(s.parentShowAbsenceWarning) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_contact_teacher", value: String(s.parentShowContactTeacher) }),
                    supabase.from("site_settings").upsert({ id: "parent_grades_default_view", value: s.parentGradesDefaultView }),
                    supabase.from("site_settings").upsert({ id: "parent_grades_show_percentage", value: String(s.parentGradesShowPercentage) }),
                    supabase.from("site_settings").upsert({ id: "parent_grades_show_eval", value: String(s.parentGradesShowEval) }),
                    supabase.from("site_settings").upsert({ id: "parent_grades_visible_periods", value: s.parentGradesVisiblePeriods }),
                    supabase.from("site_settings").upsert({ id: "parent_grades_hidden_categories", value: JSON.stringify(s.parentGradesHiddenCategories) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_daily_grades", value: String(s.parentShowDailyGrades) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_classwork_icons", value: String(s.parentShowClassworkIcons) }),
                    supabase.from("site_settings").upsert({ id: "parent_classwork_icons_count", value: String(s.parentClassworkIconsCount) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_library", value: String(s.parentShowLibrary) }),
                    supabase.from("site_settings").upsert({ id: "parent_show_activities", value: String(s.parentShowActivities) }),
                    supabase.from("site_settings").upsert({ id: "parent_pdf_header", value: JSON.stringify(s.parentPdfHeader) }),
                  ]);
                  s.setSavingParentWelcome(false);
                  if (results.some(r => r.error)) {
                    toast({ title: "خطأ", description: "فشل حفظ إعدادات بوابة ولي الأمر", variant: "destructive" });
                  } else {
                    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات بوابة ولي الأمر بنجاح" });
                  }
                }}>
                <Save className="h-4 w-4" />
                {s.savingParentWelcome ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <p className="text-[10px] text-muted-foreground">🔒 ولي الأمر يشاهد فقط (Read-Only)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "lesson_plans" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                خطة الدروس الأسبوعية
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LessonPlanSettings classes={s.classes.map((c) => ({ id: c.id, name: c.name }))} />
          </CardContent>
        </Card>
      )}

      {s.activeCard === "timetable" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Table2 className="h-5 w-5 text-primary" />
                جدول الحصص الأسبوعي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TimetableEditor classes={s.classes.map(c => ({ id: c.id, name: c.name }))} />
          </CardContent>
        </Card>
      )}

      {s.activeCard === "behavior_suggestions" && s.isAdmin && (
        <BehaviorSuggestionsSettings onClose={() => s.setActiveCard(null)} />
      )}

      <div className="flex items-center gap-3 mb-2 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent" />
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide">🔧 إعدادات إضافية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      </div>
      <div className="space-y-4">
        <CollapsibleSettingsCard
          icon={UserCircle}
          iconGradient="from-pink-500 to-rose-600"
          iconShadow="shadow-lg shadow-pink-500/20"
          title="الملف الشخصي"
          description="تعديل بياناتك الشخصية وكلمة المرور"
        >
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={s.profileName} onChange={(e) => s.setProfileName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input value={s.profilePhone} onChange={(e) => s.setProfilePhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية الوطنية</Label>
              <Input value={s.profileNationalId} onChange={(e) => s.setProfileNationalId(e.target.value)} placeholder="1XXXXXXXXX" dir="ltr" className="text-right" inputMode="numeric" />
              <p className="text-xs text-muted-foreground">يُستخدم لتسجيل الدخول بدلاً من البريد الإلكتروني</p>
            </div>
            <Button onClick={s.handleSaveProfile} disabled={s.savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />
              {s.savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-base font-semibold">تغيير كلمة المرور</h3>
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" value={s.currentPassword} onChange={(e) => s.setCurrentPassword(e.target.value)} placeholder="أدخل كلمة المرور الحالية" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={s.newOwnPassword} onChange={(e) => s.setNewOwnPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور الجديدة</Label>
                <Input type="password" value={s.confirmOwnPassword} onChange={(e) => s.setConfirmOwnPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور الجديدة" dir="ltr" />
              </div>
              <Button onClick={s.handleChangeOwnPassword}
                disabled={s.changingOwnPassword || !s.currentPassword.trim() || !s.newOwnPassword.trim() || !s.confirmOwnPassword.trim()}
                className="gap-1.5">
                <KeyRound className="h-4 w-4" />
                {s.changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </div>
          </div>
        </CollapsibleSettingsCard>

        {s.isAdmin && (
          <>
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 text-white">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <h3 className="text-base font-bold text-foreground">تقييد المدير للاطلاع فقط</h3>
                      <p className="text-xs text-muted-foreground">عند التفعيل، يستطيع المدير الآخر الاطلاع على جميع البيانات دون تعديل أو حذف</p>
                    </div>
                  </div>
                  <Switch
                    checked={s.adminReadOnly}
                    disabled={s.savingAdminReadOnly}
                    onCheckedChange={async (checked) => {
                      s.setSavingAdminReadOnly(true);
                      s.setAdminReadOnly(checked);
                      await Promise.all([
                        supabase.from("site_settings").upsert({ id: "admin_read_only", value: String(checked) }),
                        supabase.from("site_settings").upsert({ id: "admin_primary_id", value: s.user?.id || "" }),
                      ]);
                      s.setSavingAdminReadOnly(false);
                      toast({
                        title: checked ? "تم التفعيل" : "تم التعطيل",
                        description: checked ? "المديرون الآخرون يمكنهم الاطلاع فقط بدون تعديل" : "تم إلغاء تقييد المديرين",
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <TeacherManagementCard teachers={s.teachers} setTeachers={s.setTeachers} />

            <CollapsibleSettingsCard
              icon={History}
              iconGradient="from-cyan-500 to-blue-600"
              iconShadow="shadow-lg shadow-cyan-500/20"
              title="سجل الدخول"
              description="استعراض تاريخ دخول المعلمين والمديرين"
            >
              <StaffLoginHistory teachers={s.teachers} currentUserId={s.user?.id || ""} currentUserName={s.profileName || "المدير"} />
            </CollapsibleSettingsCard>

            <WhatsAppTemplatesSettings />

            <CollapsibleSettingsCard
              icon={MessageSquare}
              iconGradient="from-cyan-500 to-blue-600"
              iconShadow="shadow-lg shadow-cyan-500/20"
              title="إعدادات مزود خدمة SMS"
              description="ربط مزود الرسائل النصية"
            >
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>المزود</Label>
                  <Select value={s.smsProvider} onValueChange={s.setSmsProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msegat">MSEGAT</SelectItem>
                      <SelectItem value="unifonic">Unifonic</SelectItem>
                      <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {s.smsProvider === "msegat" && (
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={s.providerUsername} onChange={(e) => s.setProviderUsername(e.target.value)} placeholder="اسم مستخدم MSEGAT" dir="ltr" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{s.smsProvider === "msegat" ? "مفتاح API" : s.smsProvider === "unifonic" ? "App SID" : "Bearer Token"}</Label>
                  <Input type="password" value={s.providerApiKey} onChange={(e) => s.setProviderApiKey(e.target.value)}
                    placeholder={s.smsProvider === "unifonic" ? "App SID" : s.smsProvider === "taqnyat" ? "Bearer Token" : "API Key"} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>اسم المرسل (Sender ID)</Label>
                  <Input value={s.providerSender} onChange={(e) => s.setProviderSender(e.target.value)} placeholder="Sender Name" dir="ltr" />
                  {s.smsProvider === "unifonic" && <p className="text-xs text-muted-foreground">اختياري - سيُستخدم الافتراضي إن ترك فارغاً</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={s.handleSaveProvider} disabled={s.savingProvider} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    {s.savingProvider ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                  <Button variant="outline" disabled={s.testingSms || !s.providerApiKey || !s.providerSender} className="gap-1.5"
                    onClick={async () => {
                      s.setTestingSms(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("send-sms", {
                          body: { phone: s.providerSender, message: "رسالة اختبارية من النظام - Test SMS" },
                        });
                        if (error) {
                          toast({ title: "فشل الاختبار", description: error.message, variant: "destructive" });
                        } else if (data?.success) {
                          toast({ title: "نجح الاختبار ✅", description: "تم إرسال الرسالة الاختبارية بنجاح" });
                        } else {
                          toast({ title: "فشل الاختبار", description: data?.error || "لم يتم الإرسال", variant: "destructive" });
                        }
                      } catch (err: any) {
                        toast({ title: "خطأ", description: err.message, variant: "destructive" });
                      }
                      s.setTestingSms(false);
                    }}>
                    <MessageSquare className="h-4 w-4" />
                    {s.testingSms ? "جارٍ الاختبار..." : "اختبار الاتصال"}
                  </Button>
                </div>
              </div>
            </CollapsibleSettingsCard>

            <CollapsibleSettingsCard
              icon={Trash2}
              iconGradient="from-red-500 to-rose-600"
              iconShadow="shadow-lg shadow-red-500/20"
              title="تفريغ البيانات"
              description="حذف جميع سجلات الدرجات أو الحضور"
              className="border-destructive/20"
            >
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>تحذير: هذه العمليات لا يمكن التراجع عنها. تأكد قبل المتابعة.</span>
                </div>
                <DataPurgeSection />
              </div>
            </CollapsibleSettingsCard>

            {/* Popup Preview Dialog */}
            <Dialog open={s.popupPreviewOpen} onOpenChange={s.setPopupPreviewOpen}>
              <DialogContent dir="rtl" className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="h-7 w-7 text-white" />
                  </div>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                      {s.previewTitle || "رسالة من الإدارة"}
                    </DialogTitle>
                  </DialogHeader>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap text-center">{s.previewMessage}</p>
                  <DialogFooter>
                    <Button onClick={() => s.setPopupPreviewOpen(false)} className="w-full rounded-2xl h-11 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90">
                      حسناً
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            <CollapsibleSettingsCard
              icon={SettingsIcon}
              iconGradient="from-indigo-500 to-violet-600"
              iconShadow="shadow-lg shadow-indigo-500/20"
              title="إعدادات صفحة تسجيل الدخول"
              description="تخصيص شعار واسم المدرسة"
            >
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>شعار المدرسة</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                      {s.schoolLogoUrl ? (
                        <img src={s.schoolLogoUrl} alt="شعار المدرسة" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input ref={s.logoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          s.setUploadingLogo(true);
                          const filePath = `school-logo-${Date.now()}.${file.name.split('.').pop()}`;
                          const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
                          if (uploadError) {
                            toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" });
                            s.setUploadingLogo(false);
                            return;
                          }
                          const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
                          const logoUrl = urlData.publicUrl;
                          await supabase.from("site_settings").upsert({ id: "school_logo_url", value: logoUrl });
                          s.setSchoolLogoUrl(logoUrl);
                          s.setUploadingLogo(false);
                          toast({ title: "تم رفع الشعار بنجاح" });
                          e.target.value = "";
                        }} />
                      <Button type="button" variant="outline" size="sm" disabled={s.uploadingLogo}
                        onClick={() => s.logoInputRef.current?.click()} className="gap-1.5">
                        <Upload className="h-4 w-4" />
                        {s.uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
                      </Button>
                      {s.schoolLogoUrl && (
                        <Button type="button" variant="ghost" size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={async () => {
                            await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" });
                            s.setSchoolLogoUrl("");
                            toast({ title: "تم إزالة الشعار", description: "سيتم استخدام الشعار الافتراضي" });
                          }}>
                          <Trash2 className="h-4 w-4" />
                          إزالة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>اسم المدرسة</Label>
                  <Input value={s.loginSchoolName} onChange={(e) => s.setLoginSchoolName(e.target.value)} placeholder="مثال: ثانوية الفيصلية" />
                </div>
                <div className="space-y-2">
                  <Label>الوصف الفرعي</Label>
                  <Input value={s.loginSubtitle} onChange={(e) => s.setLoginSubtitle(e.target.value)} placeholder="مثال: نظام إدارة المدرسة" />
                </div>
                <div className="space-y-2">
                  <Label>عنوان لوحة التحكم</Label>
                  <Input value={s.dashboardTitle} onChange={(e) => s.setDashboardTitle(e.target.value)} placeholder="لوحة التحكم" />
                  <p className="text-[11px] text-muted-foreground">يظهر في أعلى لوحة التحكم الرئيسية</p>
                </div>
                <Button disabled={s.savingLogin} className="gap-1.5"
                  onClick={async () => {
                    s.setSavingLogin(true);
                    const updates = [
                      supabase.from("site_settings").upsert({ id: "school_name", value: s.loginSchoolName }),
                      supabase.from("site_settings").upsert({ id: "school_subtitle", value: s.loginSubtitle }),
                      supabase.from("site_settings").upsert({ id: "dashboard_title", value: s.dashboardTitle }),
                    ];
                    const results = await Promise.all(updates);
                    s.setSavingLogin(false);
                    if (results.some((r) => r.error)) {
                      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                    } else {
                      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" });
                    }
                  }}>
                  <Save className="h-4 w-4" />
                  {s.savingLogin ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </CollapsibleSettingsCard>
          </>
        )}
      </div>
    </div>
  );
}
