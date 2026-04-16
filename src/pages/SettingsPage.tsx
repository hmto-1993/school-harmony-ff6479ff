import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon, Save, GraduationCap, Users,
  Eye, UserCircle, KeyRound, Printer,
  Pencil, Megaphone, X,
  Palette, History,
  CalendarDays, ClipboardCheck, Lock,
  AlertTriangle, Heart, Table2, Trash2, Radar,
} from "lucide-react";
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import FormIdentitySettings from "@/components/settings/FormIdentitySettings";
import AcademicCalendarSettings from "@/components/dashboard/AcademicCalendarSettings";
import LessonPlanSettings from "@/components/settings/LessonPlanSettings";
import WhatsAppTemplatesSettings from "@/components/settings/WhatsAppTemplatesSettings";
import TimetableEditor from "@/components/settings/TimetableEditor";
import BehaviorSuggestionsSettings from "@/components/settings/BehaviorSuggestionsSettings";
import TeacherManagementCard from "@/components/settings/TeacherManagementCard";
import AdminRestrictionsCard from "@/components/settings/AdminRestrictionsCard";
import StaffLoginHistory from "@/components/settings/StaffLoginHistory";
import DataPurgeSection from "@/components/settings/DataPurgeSection";
import CollapsibleSettingsCard from "@/components/settings/CollapsibleSettingsCard";
import RadarSettingsCard from "@/components/settings/RadarSettingsCard";
import { useSettingsData } from "@/hooks/useSettingsData";
import { useAdminPerms } from "@/hooks/useAdminPerms";

import { ClassesSettingsCard } from "@/components/settings/ClassesSettingsCard";
import { CategoriesSettingsCard } from "@/components/settings/CategoriesSettingsCard";
import { StudentVisibilityCard } from "@/components/settings/StudentVisibilityCard";
import { PopupSettingsCard } from "@/components/settings/PopupSettingsCard";
import { CalendarYearCard } from "@/components/settings/CalendarYearCard";
import { AttendanceSettingsCard } from "@/components/settings/AttendanceSettingsCard";
import { ParentPortalCard } from "@/components/settings/ParentPortalCard";
import { QuizColorsCard } from "@/components/settings/QuizColorsCard";
import { LoginSettingsCard } from "@/components/settings/LoginSettingsCard";
import { SmsSettingsCard } from "@/components/settings/SmsSettingsCard";

export default function SettingsPage() {
  const s = useSettingsData();
  const adminPerms = useAdminPerms();

  if (s.loading || !adminPerms.loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Check if this admin can access settings at all
  if (s.isAdmin && !adminPerms.isPrimaryAdmin && !adminPerms.can_access_settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">الوصول مقيّد</h2>
        <p className="text-sm text-muted-foreground">ليس لديك صلاحية الوصول لصفحة الإعدادات</p>
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
          { key: "visibility", icon: Eye, label: "بوابة الطالب", desc: "التحكم بالبيانات", gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", adminOnly: true },
          { key: "popup", icon: Megaphone, label: "رسالة منبثقة", desc: s.popupEnabled ? (s.popupRepeat === "daily" ? "مفعّلة · يومياً" : s.popupRepeat === "weekly" ? "مفعّلة · أسبوعياً" : "مفعّلة · مرة واحدة") : "معطّلة", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20", adminOnly: true },
          { key: "calendar_year", icon: CalendarDays, label: "التقويم والعام الدراسي", desc: `${s.calendarTypeLocal === "hijri" ? "هجري" : "ميلادي"} · ${s.defaultAcademicYear}`, gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20", adminOnly: true },
          { key: "academic_calendar", icon: CalendarDays, label: "التقويم الأكاديمي", desc: "الأسابيع والاختبارات", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", adminOnly: true },
          { key: "attendance_settings", icon: ClipboardCheck, label: "إعدادات التحضير", desc: `${s.attendanceOverrideLock ? "القفل معطّل" : "قفل تلقائي"} · حد الإنذار: ${s.absenceMode === "sessions" && s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`}`, gradient: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/20", adminOnly: true },
          { key: "parent_portal", icon: Heart, label: "بوابة ولي الأمر", desc: "التحكم بالبيانات", gradient: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/20", adminOnly: true },
          { key: "lesson_plans", icon: CalendarDays, label: "خطة الدروس", desc: "تخطيط الحصص الأسبوعية", gradient: "from-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20", adminOnly: false },
          { key: "timetable", icon: Table2, label: "جدول الحصص", desc: "تصميم الجدول الأسبوعي", gradient: "from-sky-500 to-cyan-600", shadow: "shadow-sky-500/20", adminOnly: false },
          { key: "behavior_suggestions", icon: Heart, label: "وصف السلوك", desc: "مقترحات وصف السلوك", gradient: "from-green-500 to-emerald-600", shadow: "shadow-green-500/20", adminOnly: true },
          { key: "form_identity", icon: Pencil, label: "هوية النماذج", desc: "ترويسة وتوقيع النماذج", gradient: "from-purple-500 to-violet-600", shadow: "shadow-purple-500/20", adminOnly: true },
          { key: "radar_settings", icon: Radar, label: "الرادار الذكي", desc: "سرعة الرادار وذاكرة الحصة", gradient: "from-cyan-500 to-teal-600", shadow: "shadow-cyan-500/20", adminOnly: true },
        ].filter(c => !c.adminOnly || s.isAdmin).map((card) => (
          <button
            key={card.key}
            onClick={() => s.setActiveCard(s.activeCard === card.key ? null : card.key)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-300 text-center group",
              s.activeCard === card.key
                ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                : "border-border/50 bg-card shadow-md hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
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

      {/* ===== Extracted Card Components ===== */}
      <ClassesSettingsCard s={s} />
      <CategoriesSettingsCard s={s} />
      <StudentVisibilityCard s={s} />
      <PopupSettingsCard s={s} />
      <CalendarYearCard s={s} />
      <AttendanceSettingsCard s={s} />
      <ParentPortalCard s={s} />

      {/* ===== Inline Cards ===== */}
      {s.activeCard === "print" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Printer className="h-5 w-5 text-primary" />ورقة الطباعة والتصدير</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><PrintHeaderEditor /></CardContent>
        </Card>
      )}

      {s.activeCard === "colors" && s.isAdmin && (
        <QuizColorsCard
          quizColorMcq={s.quizColorMcq} setQuizColorMcq={s.setQuizColorMcq}
          quizColorTf={s.quizColorTf} setQuizColorTf={s.setQuizColorTf}
          quizColorSelected={s.quizColorSelected} setQuizColorSelected={s.setQuizColorSelected}
          savingQuizColors={s.savingQuizColors} setSavingQuizColors={s.setSavingQuizColors}
          onClose={() => s.setActiveCard(null)}
        />
      )}

      {s.activeCard === "academic_calendar" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" />التقويم الأكاديمي</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><AcademicCalendarSettings onClose={() => s.setActiveCard(null)} /></CardContent>
        </Card>
      )}

      {s.activeCard === "lesson_plans" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" />خطة الدروس الأسبوعية</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><LessonPlanSettings classes={s.classes.map((c) => ({ id: c.id, name: c.name }))} /></CardContent>
        </Card>
      )}

      {s.activeCard === "timetable" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Table2 className="h-5 w-5 text-primary" />جدول الحصص الأسبوعي</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><TimetableEditor classes={s.classes.map(c => ({ id: c.id, name: c.name }))} /></CardContent>
        </Card>
      )}

      {s.activeCard === "behavior_suggestions" && s.isAdmin && (
        <BehaviorSuggestionsSettings onClose={() => s.setActiveCard(null)} />
      )}

      {s.activeCard === "form_identity" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Pencil className="h-5 w-5 text-primary" />إعدادات الهوية والنماذج</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><FormIdentitySettings onClose={() => s.setActiveCard(null)} /></CardContent>
        </Card>
      )}

      {s.activeCard === "radar_settings" && s.isAdmin && (
        <RadarSettingsCard onClose={() => s.setActiveCard(null)} />
      )}

      {/* ===== إعدادات إضافية ===== */}
      <div className="flex items-center gap-3 mb-2 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent" />
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide">🔧 إعدادات إضافية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      </div>
      <div className="space-y-4">
        <CollapsibleSettingsCard icon={UserCircle} iconGradient="from-pink-500 to-rose-600" iconShadow="shadow-lg shadow-pink-500/20" title="الملف الشخصي" description="تعديل بياناتك الشخصية وكلمة المرور">
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
            </div>
            <Button onClick={s.handleSaveProfile} disabled={s.savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />{s.savingProfile ? "جارٍ الحفظ..." : "حفظ الملف الشخصي"}
            </Button>
            <div className="border-t pt-4 mt-4 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2"><KeyRound className="h-4 w-4" />تغيير كلمة المرور</h4>
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" value={s.currentPassword} onChange={(e) => s.setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={s.newOwnPassword} onChange={(e) => s.setNewOwnPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <Input type="password" value={s.confirmOwnPassword} onChange={(e) => s.setConfirmOwnPassword(e.target.value)} />
              </div>
              <Button onClick={s.handleChangeOwnPassword} disabled={s.changingOwnPassword} variant="outline" className="gap-1.5">
                <KeyRound className="h-4 w-4" />{s.changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </div>
          </div>
        </CollapsibleSettingsCard>

        {s.isAdmin && (
          <>
            <Card className="border border-border/50 bg-card shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl shadow-lg text-white bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">وضع القراءة فقط للمديرين</h3>
                      <p className="text-xs text-muted-foreground">{s.adminReadOnly ? "مفعّل — المديرون الآخرون للاطلاع فقط" : "معطّل — الكل يمكنه التعديل"}</p>
                    </div>
                  </div>
                  <Switch checked={s.adminReadOnly} disabled={s.savingAdminReadOnly}
                    onCheckedChange={async (checked) => {
                      s.setSavingAdminReadOnly(true); s.setAdminReadOnly(checked);
                      await Promise.all([
                        supabase.from("site_settings").upsert({ id: "admin_read_only", value: String(checked) }),
                        supabase.from("site_settings").upsert({ id: "admin_primary_id", value: s.user?.id || "" }),
                      ]);
                      s.setSavingAdminReadOnly(false);
                      toast({ title: checked ? "تم التفعيل" : "تم التعطيل", description: checked ? "المديرون الآخرون يمكنهم الاطلاع فقط بدون تعديل" : "تم إلغاء تقييد المديرين" });
                    }} />
                </div>
              </CardContent>
            </Card>

            <TeacherManagementCard teachers={s.teachers} setTeachers={s.setTeachers} />

            <CollapsibleSettingsCard icon={History} iconGradient="from-cyan-500 to-blue-600" iconShadow="shadow-lg shadow-cyan-500/20" title="سجل الدخول" description="استعراض تاريخ دخول المعلمين والمديرين">
              <StaffLoginHistory teachers={s.teachers} currentUserId={s.user?.id || ""} currentUserName={s.profileName || "المدير"} />
            </CollapsibleSettingsCard>

            <WhatsAppTemplatesSettings />

            <SmsSettingsCard
              smsProvider={s.smsProvider} setSmsProvider={s.setSmsProvider}
              providerUsername={s.providerUsername} setProviderUsername={s.setProviderUsername}
              providerApiKey={s.providerApiKey} setProviderApiKey={s.setProviderApiKey}
              providerSender={s.providerSender} setProviderSender={s.setProviderSender}
              savingProvider={s.savingProvider} handleSaveProvider={s.handleSaveProvider}
              testingSms={s.testingSms} setTestingSms={s.setTestingSms}
            />

            <CollapsibleSettingsCard icon={Trash2} iconGradient="from-red-500 to-rose-600" iconShadow="shadow-lg shadow-red-500/20" title="تفريغ البيانات" description="حذف جميع سجلات الدرجات أو الحضور" className="border-destructive/20">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>تحذير: هذه العمليات لا يمكن التراجع عنها. تأكد قبل المتابعة.</span>
                </div>
                <DataPurgeSection />
              </div>
            </CollapsibleSettingsCard>

            <LoginSettingsCard
              schoolLogoUrl={s.schoolLogoUrl} setSchoolLogoUrl={s.setSchoolLogoUrl}
              uploadingLogo={s.uploadingLogo} setUploadingLogo={s.setUploadingLogo}
              logoInputRef={s.logoInputRef}
              loginSchoolName={s.loginSchoolName} setLoginSchoolName={s.setLoginSchoolName}
              loginSubtitle={s.loginSubtitle} setLoginSubtitle={s.setLoginSubtitle}
              dashboardTitle={s.dashboardTitle} setDashboardTitle={s.setDashboardTitle}
              savingLogin={s.savingLogin} setSavingLogin={s.setSavingLogin}
            />
          </>
        )}
      </div>
    </div>
  );
}
