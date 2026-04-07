import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, BookOpen, UserCheck, Clock, FileText, AlertTriangle, Eye, Shield, FileBarChart, ChevronDown, Loader2, Sparkles, Share2, Sun, Moon, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SharedData } from "@/components/shared-view/types";
import { TAB_COLORS } from "@/components/shared-view/helpers";
import { StatCard } from "@/components/shared-view/SharedUIComponents";
import { OverviewTab } from "@/components/shared-view/OverviewTab";
import { AttendanceTab } from "@/components/shared-view/AttendanceTab";
import { GradesTab } from "@/components/shared-view/GradesTab";
import { WeeklyAttendanceTab } from "@/components/shared-view/WeeklyAttendanceTab";
import { ReportsTab } from "@/components/shared-view/ReportsTab";
import { LessonsTab } from "@/components/shared-view/LessonsTab";
import { useSharedViewPDF } from "@/hooks/useSharedViewPDF";

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: BarChart3 },
  { id: "attendance", label: "الحضور", icon: UserCheck },
  { id: "weekly", label: "الأسبوعي", icon: CalendarDays },
  { id: "grades", label: "الدرجات", icon: BookOpen },
  { id: "reports", label: "التقارير", icon: FileBarChart },
  { id: "lessons", label: "خطط الدروس", icon: Clock },
] as const;

export default function SharedViewPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'light') return false;
      if (urlTheme === 'dark') return true;
      const saved = localStorage.getItem('shared-view-theme');
      if (saved) return saved !== 'light';
    }
    return true;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('shared-view-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const pdf = useSharedViewPDF(data, token);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    supabase.functions.invoke("get-shared-data", { body: { token } }).then(({ data: res, error: err }) => {
      if (err || res?.error) {
        setError(res?.error || "حدث خطأ في تحميل البيانات");
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [token]);

  const themeClass = isDark ? 'sv-dark' : 'sv-light';

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", themeClass)} style={{ background: 'var(--sv-page-from)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[hsl(195,100%,50%)/0.2]" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[hsl(195,100%,50%)] animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-[hsl(270,75%,55%)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--sv-text-muted)' }}>جارٍ تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-6", themeClass)} style={{ background: 'var(--sv-page-from)' }}>
        <div className="text-center space-y-4 max-w-md rounded-3xl p-10" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--sv-text)' }}>{error}</h1>
          <p style={{ color: 'var(--sv-text-faint)' }}>تأكد من صحة الرابط أو تواصل مع المعلم للحصول على رابط جديد</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const expiryDate = new Date(data.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));

  return (
    <div className={cn("min-h-screen print:bg-white transition-colors duration-500", themeClass)} style={{ background: `linear-gradient(to bottom right, var(--sv-page-from), var(--sv-page-via), var(--sv-page-to))` }} dir="rtl">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none print:hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px]" style={{ background: 'var(--sv-glow1)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px]" style={{ background: 'var(--sv-glow2)' }} />
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl sticky top-0 z-10 print:static transition-colors duration-500" style={{ background: 'var(--sv-header)', borderBottom: '1px solid var(--sv-header-border)' }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, var(--sv-header-overlay-l), transparent, var(--sv-header-overlay-r))` }} />
        <div className="relative max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {data.schoolName && <p className="text-sm font-medium" style={{ color: 'var(--sv-text-faint)' }}>{data.schoolName}</p>}
              <h1 className="text-xl font-bold" style={{ color: 'var(--sv-text)' }}>عرض أعمال: <span className="bg-gradient-to-l from-[hsl(195,100%,60%)] to-[hsl(270,75%,65%)] bg-clip-text text-transparent">{data.teacherName}</span></h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-view-bg)', color: 'var(--sv-badge-view-text)', border: '1px solid var(--sv-badge-view-border)' }}>
                  <Eye className="h-3 w-3" /> عرض فقط
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-exp-bg)', color: 'var(--sv-badge-exp-text)', border: '1px solid var(--sv-badge-exp-border)' }}>
                  <Shield className="h-3 w-3" /> متبقي {daysLeft} يوم
                </span>
                {data.viewCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--sv-badge-count-bg)', color: 'var(--sv-badge-count-text)', border: '1px solid var(--sv-badge-count-border)' }}>
                    <Eye className="h-3 w-3" /> {data.viewCount} مشاهدة
                  </span>
                )}
                {data.label && <span className="text-xs" style={{ color: 'var(--sv-text-dim)' }}>{data.label}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button onClick={toggleTheme} className="p-2.5 rounded-xl transition-all duration-300 hover:scale-110" style={{ background: 'var(--sv-toggle-bg)', color: 'var(--sv-toggle-text)' }} title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {data.canPrint && (
                <div className="relative">
                  <div className="flex">
                    <button onClick={() => pdf.exportPDF()} disabled={pdf.exporting} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] hover:from-[hsl(195,100%,50%)] hover:to-[hsl(210,90%,55%)] rounded-r-xl transition-all text-white disabled:opacity-50 shadow-lg shadow-[hsl(195,100%,50%)/0.2]">
                      {pdf.exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {pdf.exporting ? "جارٍ التصدير..." : "تصدير PDF"}
                    </button>
                    <button onClick={() => setShowExportMenu(prev => !prev)} disabled={pdf.exporting} className="flex items-center px-2.5 py-2.5 text-sm font-medium bg-gradient-to-l from-[hsl(210,90%,50%)] to-[hsl(230,80%,50%)] hover:from-[hsl(210,90%,55%)] rounded-l-xl transition-all text-white disabled:opacity-50 border-r border-white/20">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {showExportMenu && (
                    <div className="absolute left-0 top-full mt-2 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-20 min-w-[220px]" style={{ background: 'var(--sv-dropdown)', border: '1px solid var(--sv-dropdown-border)' }}>
                      <div className="px-4 py-1.5 text-xs font-semibold" style={{ color: 'var(--sv-dropdown-label)' }}>الملخص الذكي</div>
                      {([
                        { key: "comprehensive", label: "شامل", icon: "📊" },
                        { key: "attendance", label: "التركيز على الحضور", icon: "📋" },
                        { key: "grades", label: "التركيز على الدرجات", icon: "📝" },
                        { key: "none", label: "بدون ملخص ذكي", icon: "⏭️" },
                      ] as const).map(opt => (
                        <button key={opt.key} onClick={() => { pdf.setSummaryFocus(opt.key); setShowExportMenu(false); pdf.exportPDF(opt.key); }} className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors" style={{ color: pdf.summaryFocus === opt.key ? 'var(--sv-selected-text)' : 'var(--sv-dropdown-text)', background: pdf.summaryFocus === opt.key ? 'var(--sv-selected-bg)' : 'transparent', fontWeight: pdf.summaryFocus === opt.key ? 600 : 400 }}>
                          <span>{opt.icon}</span><span>{opt.label}</span>
                          {pdf.summaryFocus === opt.key && <Sparkles className="h-3 w-3 mr-auto" style={{ color: 'var(--sv-blue-accent)' }} />}
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid var(--sv-divider-subtle)' }} className="mt-1 pt-1">
                        <div className="px-4 py-1.5 text-xs font-semibold" style={{ color: 'var(--sv-dropdown-label)' }}>ملخص مختصر</div>
                        <button onClick={() => { setShowExportMenu(false); pdf.exportSummaryPDF(true); }} disabled={pdf.exporting} className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: 'var(--sv-dropdown-text)' }}>
                          <span>📋</span><span>ملخص مختصر + ذكي</span><Sparkles className="h-3 w-3 mr-auto" style={{ color: 'var(--sv-blue-accent)' }} />
                        </button>
                        <button onClick={() => { setShowExportMenu(false); pdf.exportSummaryPDF(false); }} disabled={pdf.exporting} className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: 'var(--sv-dropdown-text)' }}>
                          <span>📋</span><span>ملخص مختصر بدون ذكي</span>
                        </button>
                      </div>
                      <div style={{ borderTop: '1px solid var(--sv-divider-subtle)' }} className="mt-1 pt-1">
                        <button onClick={() => { setShowExportMenu(false); pdf.shareViaWhatsApp(); }} disabled={pdf.sharing} className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors" style={{ color: 'var(--sv-wa-text)' }}>
                          <span>💬</span><span>{pdf.sharing ? "جارٍ المشاركة..." : "مشاركة عبر واتساب"}</span>
                          {pdf.sharing ? <Loader2 className="h-3 w-3 mr-auto animate-spin" /> : <Share2 className="h-3 w-3 mr-auto" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
          <StatCard label="الفصول" value={data.classes.length} icon={Users} gradient="from-[hsl(195,100%,50%)] to-[hsl(210,90%,55%)]" />
          <StatCard label="الطلاب" value={data.totalStudents} icon={Users} gradient="from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)]" />
          <StatCard label="نسبة الحضور اليوم" value={`${data.attendanceRate}%`} icon={UserCheck} gradient="from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]" />
          <StatCard label="خطط الدروس" value={(() => { const t = data.classes.reduce((a, c) => a + c.lessonPlans.total, 0); const d = data.classes.reduce((a, c) => a + c.lessonPlans.completed, 0); return t > 0 ? `${Math.round((d / t) * 100)}%` : "—"; })()} icon={BookOpen} gradient="from-[hsl(340,75%,55%)] to-[hsl(320,70%,50%)]" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const colors = TAB_COLORS[tab.id];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300", activeTab === tab.id ? `bg-gradient-to-l ${colors.active} text-white shadow-lg ${colors.gradient}` : "")} style={activeTab !== tab.id ? { background: 'var(--sv-tab-inactive)', color: 'var(--sv-tab-inactive-text)', border: '1px solid var(--sv-tab-inactive-border)' } : undefined}>
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content — all tabs stay mounted for state persistence */}
        <div className="print:hidden">
          <div className={activeTab === "overview" ? "" : "hidden"}><OverviewTab data={data} /></div>
          <div className={activeTab === "attendance" ? "" : "hidden"}><AttendanceTab classes={data.classes} /></div>
          <div className={activeTab === "weekly" ? "" : "hidden"}><WeeklyAttendanceTab data={data} /></div>
          <div className={activeTab === "grades" ? "" : "hidden"}><GradesTab classes={data.classes} categories={data.categories} /></div>
          <div className={activeTab === "reports" ? "" : "hidden"}><ReportsTab data={data} /></div>
          <div className={activeTab === "lessons" ? "" : "hidden"}><LessonsTab classes={data.classes} /></div>
        </div>
      </main>
    </div>
  );
}
