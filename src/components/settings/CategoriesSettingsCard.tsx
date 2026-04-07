import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Save, X, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CategoryTable from "@/components/settings/CategoryTable";
import type { SettingsData } from "./settings-types";

export function CategoriesSettingsCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "categories") return null;

  return (
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
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
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
                      toast({ title: "تم الاستيراد", description: "تم استيراد الفئات بنجاح" });
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

        {s.isAdmin && s.orphanedCategories.length > 0 && s.catClassFilter !== "orphaned" && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-amber-800 dark:text-amber-300">يوجد {s.orphanedCategories.length} فئة غير مرتبطة بفصل (محفوظة من فصول محذوفة)</span>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={s.handleReassignOrphanedCategories}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="ربط بفصل..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_classes">جميع الفصول</SelectItem>
                  {s.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <CategoryTable title="المهام الأدائية والمشاركة والتفاعل" emoji="📝" colorScheme="emerald"
          emptyText="لا توجد فئات — أضف: المشاركة، الواجبات، الأعمال والمشاريع"
          categories={s.classworkCategories} allCategories={s.categories} classes={s.classes}
          editingCats={s.editingCats} setEditingCats={s.setEditingCats} isAdmin={s.isAdmin}
          catClassFilter={s.catClassFilter} targetGroupLabel="الاختبارات" targetGroupKey="exam"
          onReorder={s.handleReorderCategory} onDelete={s.handleDeleteCategory} />

        <CategoryTable title="الاختبارات" emoji="📋" colorScheme="amber"
          emptyText="لا توجد فئات — أضف: اختبار عملي، اختبار الفترة"
          categories={s.examCategories} allCategories={s.categories} classes={s.classes}
          editingCats={s.editingCats} setEditingCats={s.setEditingCats} isAdmin={s.isAdmin}
          catClassFilter={s.catClassFilter} targetGroupLabel="المهام الأدائية" targetGroupKey="classwork"
          onReorder={s.handleReorderCategory} onDelete={s.handleDeleteCategory} />

        {s.catClassFilter === "all" && (
          <p className="text-xs text-muted-foreground text-center">
            💡 أي تعديل سيُطبق على جميع الفصول تلقائياً — الفئات الناقصة ستُضاف للفصول المفقودة عند الحفظ
          </p>
        )}

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
                      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
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
                          if (!s.dailyExtraSlotsEnabled) { toast({ title: "يجب فتح زيادة الرموز أولاً", variant: "destructive" }); return; }
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
                      <Select value={String(isDisabled ? 1 : catMax)} disabled={isDisabled}
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
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
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
  );
}
