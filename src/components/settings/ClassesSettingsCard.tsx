import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Pencil, Check, X, Download, FileSpreadsheet, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ClassScheduleDialog from "@/components/settings/ClassScheduleDialog";
import type { SettingsData } from "./settings-types";

const GRADES = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي", "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"];

export function ClassesSettingsCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "classes") {
    return s.scheduleDialogClass ? (
      <ClassScheduleDialog
        open={!!s.scheduleDialogClass}
        onOpenChange={(open) => { if (!open) s.setScheduleDialogClass(null); }}
        classId={s.scheduleDialogClass.id}
        className={s.scheduleDialogClass.name}
      />
    ) : null;
  }

  return (
    <>
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
                          {GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
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
                  <TableRow key={cls.id} className="group" onDoubleClick={() => { if (!s.isAdmin) return; s.startEditingClass(cls); }}>
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
                            {GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
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
                                    <AlertDialogDescription>سيتم حذف الفصل وفصل ربطه بالطلاب. فئات التقييم ستبقى محفوظة ويمكن إعادة ربطها لاحقاً.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => s.handleDeleteClass(cls.id)}>حذف</AlertDialogAction>
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

      {s.scheduleDialogClass && (
        <ClassScheduleDialog
          open={!!s.scheduleDialogClass}
          onOpenChange={(open) => { if (!open) s.setScheduleDialogClass(null); }}
          classId={s.scheduleDialogClass.id}
          className={s.scheduleDialogClass.name}
        />
      )}
    </>
  );
}
