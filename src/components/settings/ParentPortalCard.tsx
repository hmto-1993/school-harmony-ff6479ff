import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Eye, EyeOff, Save, GraduationCap, Printer, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import EvaluationToggles from "@/components/settings/EvaluationToggles";
import type { SettingsData } from "./settings-types";

export function ParentPortalCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "parent_portal" || !s.isAdmin) return null;

  const toggleItems = [
    { key: "national_id", label: "رقم الهوية", state: s.parentShowNationalId, setter: s.setParentShowNationalId },
    { key: "grades", label: "الدرجات", state: s.parentShowGrades, setter: s.setParentShowGrades },
    { key: "attendance", label: "الحضور", state: s.parentShowAttendance, setter: s.setParentShowAttendance },
    { key: "behavior", label: "السلوك", state: s.parentShowBehavior, setter: s.setParentShowBehavior },
    { key: "honor_roll", label: "لوحة الشرف", state: s.parentShowHonorRoll, setter: s.setParentShowHonorRoll },
    { key: "absence_warning", label: "تنبيه الغياب", state: s.parentShowAbsenceWarning, setter: s.setParentShowAbsenceWarning },
    { key: "contact_teacher", label: "التواصل مع المعلم", state: s.parentShowContactTeacher, setter: s.setParentShowContactTeacher },
    { key: "library", label: "المكتبة", state: s.parentShowLibrary, setter: s.setParentShowLibrary },
    { key: "activities", label: "الأنشطة", state: s.parentShowActivities, setter: s.setParentShowActivities },
  ];

  return (
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
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200", s.parentWelcomeEnabled ? "-translate-x-6" : "-translate-x-1")} />
              </button>
            </div>
            {s.parentWelcomeEnabled && (
              <Input value={s.parentWelcomeMessage} onChange={(e) => s.setParentWelcomeMessage(e.target.value)} placeholder="رسالة الترحيب..." className="text-xs" />
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
            <h4 className="text-sm font-bold mb-2">📱 الأقسام المعروضة</h4>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-auto">
              {toggleItems.map((item) => (
                <button key={item.key} onClick={() => item.setter(!item.state)}
                  className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all text-right",
                    item.state ? "border-success/40 bg-success/10 text-success" : "border-border/40 bg-muted/30 text-muted-foreground"
                  )}>
                  {item.state ? <Eye className="h-3 w-3 shrink-0" /> : <EyeOff className="h-3 w-3 shrink-0" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {s.parentShowGrades && (
          <Collapsible className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
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
              <button onClick={() => s.setParentPdfHeader(prev => ({ ...prev, showLogo: !prev.showLogo }))}
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
  );
}
