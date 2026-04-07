import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, BookOpen, ChevronRight, ChevronLeft, Check, Loader2, FileUp, CopyPlus, CalendarDays, CalendarRange, Download, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLessonPlanData, DAY_NAMES, WEEKLY_DAY_INDEX } from "@/hooks/useLessonPlanData";
import type { ClassOption } from "@/hooks/useLessonPlanData";
import LessonPlanPreview from "./LessonPlanPreview";

export default function LessonPlanSettings({ classes }: { classes: ClassOption[] }) {
  const d = useLessonPlanData(classes);

  const hasContent = d.selectedClassId && !d.loading;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[180px]">
          <Label className="text-xs font-semibold">الفصل</Label>
          <Select value={d.selectedClassId} onValueChange={d.setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__"><span className="font-bold text-primary">🏫 الجميع</span></SelectItem>
              {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">الأسبوع</Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => d.setWeekNumber(Math.max(1, d.weekNumber - 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Badge variant="secondary" className="text-sm px-3 min-w-[40px] justify-center">{d.weekNumber}</Badge>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => d.setWeekNumber(d.weekNumber + 1)}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
        <Button onClick={d.handleSave} disabled={d.saving || !d.selectedClassId} className="gap-1.5">
          {d.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {d.isAllClasses ? "حفظ للجميع" : "حفظ الخطة"}
        </Button>
        {!d.isAllClasses && (
          <Button variant="secondary" disabled={d.saving || !d.selectedClassId || Object.keys(d.slots).length === 0} className="gap-1.5" onClick={d.handleBroadcast}>
            <BookOpen className="h-4 w-4" />تعميم على جميع الفصول
          </Button>
        )}
        <input ref={d.fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={d.handleFileImport} className="hidden" />
        <input ref={d.pdfInputRef} type="file" accept=".pdf" onChange={d.handlePdfImport} className="hidden" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!d.selectedClassId || d.importing || d.importingPdf}>
              {(d.importing || d.importingPdf) ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}استيراد خطة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => d.fileInputRef.current?.click()} className="gap-2"><Download className="h-4 w-4" />من ملف Excel / CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => d.pdfInputRef.current?.click()} className="gap-2"><FileText className="h-4 w-4" />من ملف PDF (ذكاء اصطناعي)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={d.handleDownloadTemplate}>
          <Download className="h-4 w-4" />تحميل النموذج
        </Button>
      </div>

      {d.isAllClasses && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <CopyPlus className="h-4 w-4 inline-block ml-1.5" />
          وضع الجميع: سيتم تطبيق الخطة والاستيراد على <strong>جميع الفصول ({classes.length})</strong> دفعة واحدة.
        </div>
      )}

      {/* Grid */}
      {hasContent && (
        <div className="overflow-auto rounded-xl border border-border/40">
          <table className="w-full border-collapse" dir="rtl" style={{ fontSize: 13 }}>
            <thead>
              <tr className="bg-muted">
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 80 }}>اليوم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 40 }}>الحصة</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>عنوان الدرس</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>الأهداف</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 150 }}>ملاحظات المعلم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 60 }}>مكتمل</th>
              </tr>
            </thead>
            <tbody>
              {/* Weekly lessons */}
              {Array.from({ length: d.slotsPerDay }, (_, slotIdx) => {
                if (!d.weeklySlots.has(slotIdx)) return null;
                const key = `${WEEKLY_DAY_INDEX}-${slotIdx}`;
                const slot = d.slots[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false };
                return (
                  <tr key={`weekly-${slotIdx}`} className="bg-accent/5">
                    <td className="border border-border/20 px-3 py-2 text-center">
                      <Tooltip><TooltipTrigger asChild>
                        <button onClick={() => d.toggleWeeklySlot(slotIdx)} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
                          <CalendarRange className="h-3.5 w-3.5" />أسبوعي
                        </button>
                      </TooltipTrigger><TooltipContent side="left"><p className="text-xs">اضغط للتحويل إلى يومي</p></TooltipContent></Tooltip>
                    </td>
                    <td className="border border-border/20 px-2 py-2 text-center font-semibold text-muted-foreground">{slotIdx + 1}</td>
                    <td className="border border-border/20 p-1"><Input value={slot.lesson_title} onChange={(e) => d.updateSlot(WEEKLY_DAY_INDEX, slotIdx, "lesson_title", e.target.value)} placeholder="عنوان الدرس (يمتد للأسبوع كاملاً)" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                    <td className="border border-border/20 p-1"><Input value={slot.objectives} onChange={(e) => d.updateSlot(WEEKLY_DAY_INDEX, slotIdx, "objectives", e.target.value)} placeholder="الأهداف" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                    <td className="border border-border/20 p-1"><Input value={slot.teacher_reflection} onChange={(e) => d.updateSlot(WEEKLY_DAY_INDEX, slotIdx, "teacher_reflection", e.target.value)} placeholder="ملاحظات" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                    <td className="border border-border/20 px-2 py-2 text-center">
                      <button onClick={() => d.updateSlot(WEEKLY_DAY_INDEX, slotIdx, "is_completed", !slot.is_completed)} className={cn("h-6 w-6 rounded-md border-2 inline-flex items-center justify-center transition-colors", slot.is_completed ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary/50")}>
                        {slot.is_completed && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Daily lessons */}
              {d.daysOfWeek.map((dayIdx) =>
                Array.from({ length: d.slotsPerDay }, (_, slotIdx) => {
                  if (d.weeklySlots.has(slotIdx)) return null;
                  const key = `${dayIdx}-${slotIdx}`;
                  const slot = d.slots[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false };
                  const isFirstSlotForDay = (() => { for (let s = 0; s < slotIdx; s++) { if (!d.weeklySlots.has(s)) return false; } return true; })();
                  const dailySlotsCount = Array.from({ length: d.slotsPerDay }, (_, i) => i).filter(i => !d.weeklySlots.has(i)).length;
                  return (
                    <tr key={key} className={cn(slotIdx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                      {isFirstSlotForDay && (
                        <td rowSpan={dailySlotsCount} className="border border-border/20 px-3 py-2 text-center font-bold text-foreground bg-muted/50">
                          {DAY_NAMES[dayIdx] || `يوم ${dayIdx + 1}`}
                        </td>
                      )}
                      <td className="border border-border/20 px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-muted-foreground">{slotIdx + 1}</span>
                          {dayIdx === d.daysOfWeek[0] && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => d.toggleWeeklySlot(slotIdx)} className="text-muted-foreground/50 hover:text-accent transition-colors"><CalendarRange className="h-3 w-3" /></button>
                            </TooltipTrigger><TooltipContent side="left"><p className="text-xs">تحويل إلى درس أسبوعي</p></TooltipContent></Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="border border-border/20 p-1"><Input value={slot.lesson_title} onChange={(e) => d.updateSlot(dayIdx, slotIdx, "lesson_title", e.target.value)} placeholder="عنوان الدرس" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                      <td className="border border-border/20 p-1"><Input value={slot.objectives} onChange={(e) => d.updateSlot(dayIdx, slotIdx, "objectives", e.target.value)} placeholder="الأهداف" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                      <td className="border border-border/20 p-1"><Input value={slot.teacher_reflection} onChange={(e) => d.updateSlot(dayIdx, slotIdx, "teacher_reflection", e.target.value)} placeholder="ملاحظات" className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1" /></td>
                      <td className="border border-border/20 px-2 py-2 text-center">
                        <button onClick={() => d.updateSlot(dayIdx, slotIdx, "is_completed", !slot.is_completed)} className={cn("h-6 w-6 rounded-md border-2 inline-flex items-center justify-center transition-colors", slot.is_completed ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary/50")}>
                          {slot.is_completed && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {d.selectedClassId && d.loading && (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}
      {!d.selectedClassId && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" /><p className="text-sm">اختر الفصل لبدء إعداد خطة الدروس</p>
        </div>
      )}

      {hasContent && Object.keys(d.slots).some(k => d.slots[k]?.lesson_title?.trim()) && (
        <LessonPlanPreview slots={d.slots} daysOfWeek={d.daysOfWeek} weekNumber={d.weekNumber} />
      )}
    </div>
  );
}
