import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LogOut, GraduationCap, ClipboardCheck, ShieldCheck, CheckCircle, Clock, BookOpen,
  Globe, School, FolderOpen, FileText, Download, Loader2,
  Atom, FlaskConical, Microscope, Calculator, Brain, TestTube2, Ruler, Lightbulb,
  ClipboardList, Zap, Magnet, Waves, FileSpreadsheet, ArrowRight, Layers, Sun, Moon, Megaphone, X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StudentActivitiesTab from "@/components/activities/StudentActivitiesTab";
import schoolLogo from "@/assets/school-logo.jpg";
import { FilePreviewDialog, PreviewButton, isPreviewable, isImage } from "@/components/library/FilePreview";
import StudentAnnouncements from "@/components/announcements/StudentAnnouncements";
import StudentNotificationCards from "@/components/student/StudentNotificationCards";
import HonorRoll from "@/components/student/HonorRoll";
import { useTheme } from "@/hooks/use-theme";

const statusLabels: Record<string, { label: string; color: string }> = {
  present: { label: "حاضر", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  absent: { label: "غائب", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  late: { label: "متأخر", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  early_leave: { label: "خروج مبكر", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  sick_leave: { label: "إجازة مرضية", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
};

const ICON_MAP: Record<string, any> = {
  atom: Atom, book: BookOpen, graduation: GraduationCap, file: FileText,
  sheet: FileSpreadsheet, testtube: TestTube2, calculator: Calculator,
  ruler: Ruler, lightbulb: Lightbulb, brain: Brain, microscope: Microscope,
  clipboard: ClipboardList, flask: FlaskConical, zap: Zap, magnet: Magnet, waves: Waves,
};

function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] || FolderOpen;
}

interface ResourceFolder {
  id: string;
  title: string;
  icon: string;
  class_id: string | null;
  category: string;
  file_count: number;
}

interface ResourceFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function StudentDashboard() {
  const { student, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Resource library state
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ResourceFolder | null>(null);
  const [folderFiles, setFolderFiles] = useState<ResourceFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Popup message state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupAction, setPopupAction] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<string>("");


  useEffect(() => {
    if (student) {
      fetchFolders();
      fetchPopup();
    }
  }, [student]);

  const fetchPopup = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["student_popup_enabled", "student_popup_title", "student_popup_message", "student_popup_expiry", "student_popup_target_type", "student_popup_target_classes", "student_popup_action", "student_popup_repeat"]);
    let enabled = false;
    let title = "";
    let message = "";
    let expiry = "";
    let targetType = "all";
    let targetClassIds: string[] = [];
    let action = "none";
    let repeat = "none";
    (data || []).forEach((s: any) => {
      if (s.id === "student_popup_enabled") enabled = s.value === "true";
      if (s.id === "student_popup_title") title = s.value || "";
      if (s.id === "student_popup_message") message = s.value || "";
      if (s.id === "student_popup_expiry") expiry = s.value || "";
      if (s.id === "student_popup_target_type") targetType = s.value || "all";
      if (s.id === "student_popup_target_classes" && s.value) {
        try { targetClassIds = JSON.parse(s.value); } catch { targetClassIds = []; }
      }
      if (s.id === "student_popup_action") action = s.value || "none";
      if (s.id === "student_popup_repeat") repeat = s.value || "none";
    });

    // Check expiry
    if (expiry && new Date(expiry) < new Date()) enabled = false;

    // Check class targeting
    if (targetType === "specific" && student?.class_id) {
      if (!targetClassIds.includes(student.class_id)) enabled = false;
    }

    // Check repeat logic using localStorage
    if (enabled && message.trim()) {
      const storageKey = `popup_dismissed_${student?.id || "unknown"}`;
      const lastDismissed = localStorage.getItem(storageKey);
      
      if (lastDismissed && repeat !== "none") {
        const dismissedDate = new Date(lastDismissed);
        const now = new Date();
        
        if (repeat === "daily") {
          // Show again if dismissed on a different day
          const sameDay = dismissedDate.toDateString() === now.toDateString();
          if (sameDay) enabled = false;
        } else if (repeat === "weekly") {
          // Show again if 7+ days have passed
          const diffMs = now.getTime() - dismissedDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays < 7) enabled = false;
        }
      } else if (lastDismissed && repeat === "none") {
        // No repeat = show only once ever
        enabled = false;
      }
    }

    if (enabled && message.trim()) {
      setPopupTitle(title);
      setPopupMessage(message);
      setPopupAction(action);
      setPopupOpen(true);
    }
  };

  const fetchFolders = async () => {
    if (!student) return;
    setFoldersLoading(true);
    // Get folders visible to students: general (no class_id) + student's class
    const query = supabase
      .from("resource_folders")
      .select("id, title, icon, class_id, category")
      .eq("visible_to_students", true)
      .order("created_at", { ascending: false });

    const { data } = await query;
    if (data) {
      const filtered = data.filter((f: any) => !f.class_id || f.class_id === student.class_id);
      // Get file counts
      const { data: fileCounts } = await supabase.from("resource_files").select("folder_id");
      const countMap: Record<string, number> = {};
      fileCounts?.forEach((fc: any) => { countMap[fc.folder_id] = (countMap[fc.folder_id] || 0) + 1; });
      setFolders(filtered.map((f: any) => ({ ...f, file_count: countMap[f.id] || 0 })));
    }
    setFoldersLoading(false);
  };

  const openFolder = async (folder: ResourceFolder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    const { data } = await supabase
      .from("resource_files")
      .select("id, file_name, file_url, file_size")
      .eq("folder_id", folder.id)
      .order("created_at", { ascending: false });
    setFolderFiles(data || []);
    setFilesLoading(false);
  };

  // Print recovery: show a back button after printing to prevent blank screen
  const [showPrintRecovery, setShowPrintRecovery] = useState(false);
  useEffect(() => {
    const onBefore = () => setShowPrintRecovery(true);
    window.addEventListener("beforeprint", onBefore);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
    };
  }, []);

  const handlePrintRecovery = useCallback(() => {
    setShowPrintRecovery(false);
    document.body.style.display = "none";
    void document.body.offsetHeight;
    document.body.style.display = "";
    window.scrollTo(0, 0);
  }, []);

  if (!student) {
    navigate("/login");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const vis = student.visibility || { grades: true, attendance: true, behavior: true };

  const totalWeighted = vis.grades ? student.grades.reduce((sum, g) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + (g.score / cat.max_score) * cat.weight;
  }, 0) : 0;
  const totalWeight = vis.grades ? student.grades.reduce((sum, g) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + cat.weight;
  }, 0) : 0;
  const percentage = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;

  const presentCount = vis.attendance ? student.attendance.filter((a) => a.status === "present").length : 0;
  const absentCount = vis.attendance ? student.attendance.filter((a) => a.status === "absent").length : 0;
  const positiveCount = vis.behavior ? student.behaviors.filter((b) => b.type === "إيجابي").length : 0;
  const negativeCount = vis.behavior ? student.behaviors.filter((b) => b.type === "سلبي").length : 0;

  const generalFolders = folders.filter(f => !f.class_id);
  const classFolders = folders.filter(f => !!f.class_id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20" dir="rtl">
      {/* Print recovery button */}
      {showPrintRecovery && (
        <button
          onClick={handlePrintRecovery}
          className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground shadow-2xl font-bold text-base hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="h-5 w-5" />
          العودة للصفحة
        </button>
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={schoolLogo} alt="الشعار" className="h-10 w-10 rounded-xl object-contain shadow-md" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{student.full_name}</h1>
              {student.class && (
                <p className="text-xs text-muted-foreground">
                  {student.class.name} - {student.class.grade} ({student.class.section})
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-xl border-border/60 hover:bg-muted">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 rounded-xl border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className={cn("grid gap-4", 
          [vis.grades, vis.attendance, vis.attendance, vis.behavior].filter(Boolean).length <= 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
        )}>
          {vis.grades && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-card to-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/5 overflow-hidden">
              <CardContent className="flex flex-col items-center p-5">
                <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-md shadow-primary/25 mb-2">
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{percentage}%</p>
                <p className="text-xs text-muted-foreground">المعدل العام</p>
              </CardContent>
            </Card>
          )}
          {vis.attendance && (
            <>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 dark:from-emerald-500/10 dark:via-card dark:to-emerald-500/5 overflow-hidden">
                <CardContent className="flex flex-col items-center p-5">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-md shadow-emerald-500/25 mb-2">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{presentCount}</p>
                  <p className="text-xs text-muted-foreground">أيام الحضور</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500/5 via-card to-rose-500/10 dark:from-rose-500/10 dark:via-card dark:to-rose-500/5 overflow-hidden">
                <CardContent className="flex flex-col items-center p-5">
                  <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-3 shadow-md shadow-rose-500/25 mb-2">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{absentCount}</p>
                  <p className="text-xs text-muted-foreground">أيام الغياب</p>
                </CardContent>
              </Card>
            </>
          )}
          {vis.behavior && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 via-card to-blue-500/10 dark:from-blue-500/10 dark:via-card dark:to-blue-500/5 overflow-hidden">
              <CardContent className="flex flex-col items-center p-5">
                <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-md shadow-blue-500/25 mb-2">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground">{positiveCount}/{positiveCount + negativeCount}</p>
                <p className="text-xs text-muted-foreground">تقييم إيجابي</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notification Cards (Warnings + Achievements) */}
        <StudentNotificationCards
          studentId={student.id}
          studentName={student.full_name}
          className={student.class?.name || ""}
          grades={vis.grades ? student.grades : []}
          attendance={vis.attendance ? student.attendance : []}
        />

        {/* Honor Roll */}
        <HonorRoll classId={student.class_id} />

        {/* Announcements */}
        <StudentAnnouncements classId={student.class_id} />

        {/* Details Tabs */}
        {(() => {
          const visibleTabs = [
            ...(vis.grades ? [{ value: "grades", label: "الدرجات", icon: GraduationCap }] : []),
            ...(vis.attendance ? [{ value: "attendance", label: "الحضور", icon: ClipboardCheck }] : []),
            ...(vis.behavior ? [{ value: "behavior", label: "السلوك", icon: ShieldCheck }] : []),
            
            { value: "activities", label: "الأنشطة", icon: Layers },
            { value: "library", label: "المكتبة", icon: BookOpen },
          ];
          const defaultTab = visibleTabs[0]?.value || "activities";
          return (
        <Tabs value={activeTab || defaultTab} onValueChange={setActiveTab} dir="rtl">
          <div className="w-full overflow-x-auto scrollbar-none">
          <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 whitespace-nowrap gap-1 text-xs sm:text-sm px-3 py-1.5">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>

          {vis.grades && (
          <TabsContent value="grades">
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
                  تفاصيل الدرجات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.grades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد درجات مسجلة</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">المعيار</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الدرجة</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">من</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الوزن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.grades.map((g, i) => {
                          const isEven = i % 2 === 0;
                          const isLast = i === student.grades.length - 1;
                          return (
                            <tr key={i} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                              <td className={cn("p-3 text-right font-semibold border-l border-border/10", isLast && "first:rounded-br-xl")}>{g.grade_categories?.name || "-"}</td>
                              <td className="p-3 text-center border-l border-border/10">{g.score ?? "-"}</td>
                              <td className="p-3 text-center border-l border-border/10">{g.grade_categories?.max_score || "-"}</td>
                              <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>{g.grade_categories?.weight || "-"}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {vis.attendance && (
          <TabsContent value="attendance">
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                  سجل الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.attendance.map((a, i) => {
                          const s = statusLabels[a.status] || { label: a.status, color: "bg-muted text-muted-foreground" };
                          const isEven = i % 2 === 0;
                          const isLast = i === student.attendance.length - 1;
                          return (
                            <tr key={i} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                              <td className={cn("p-3 text-right border-l border-border/10", isLast && "first:rounded-br-xl")}>{a.date}</td>
                              <td className="p-3 text-center border-l border-border/10">
                                <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", s.color)}>
                                  {s.label}
                                </span>
                              </td>
                              <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>{a.notes || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {vis.behavior && (
          <TabsContent value="behavior">
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-accent to-primary" />
                  التقييمات السلوكية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.behaviors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد تقييمات</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">النوع</th>
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الملاحظة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.behaviors.map((b, i) => {
                          const isEven = i % 2 === 0;
                          const isLast = i === student.behaviors.length - 1;
                          return (
                            <tr key={i} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                              <td className={cn("p-3 text-right border-l border-border/10", isLast && "first:rounded-br-xl")}>{b.date}</td>
                              <td className="p-3 text-center border-l border-border/10">
                                <span className={cn(
                                  "inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                  b.type === "إيجابي"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                )}>
                                  {b.type}
                                </span>
                              </td>
                              <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>{b.note || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="activities">
            <StudentActivitiesTab studentId={student.id} classId={student.class_id} />
          </TabsContent>

          <TabsContent value="library">
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-blue-500" />
                  المكتبة التعليمية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {foldersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedFolder ? (
                  /* Folder files view */
                  <div className="space-y-4">
                    <button
                      onClick={() => { setSelectedFolder(null); setFolderFiles([]); }}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                      العودة للمكتبة
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      {(() => { const IC = getIconComponent(selectedFolder.icon); return (
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <IC className="h-6 w-6 text-primary" />
                        </div>
                      ); })()}
                      <div>
                        <h3 className="font-bold text-foreground">{selectedFolder.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {!selectedFolder.class_id ? "عام" : student.class?.name || ""}
                        </p>
                      </div>
                    </div>
                    {filesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : folderFiles.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">لا توجد ملفات بعد</p>
                    ) : (
                      <div className="space-y-2">
                        {folderFiles.map(file => {
                          const previewable = isPreviewable(file.file_name);
                          const isImg = isImage(file.file_name);
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors border border-border/20",
                                previewable && "cursor-pointer"
                              )}
                              onClick={() => previewable && setPreviewFile({ url: file.file_url, name: file.file_name })}
                            >
                              {isImg ? (
                                <img src={file.file_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/30" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                                <p className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <PreviewButton fileName={file.file_name} fileUrl={file.file_url} onPreview={() => setPreviewFile({ url: file.file_url, name: file.file_name })} />
                                <a
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-2 rounded-xl bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : folders.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <FolderOpen className="h-14 w-14 text-muted-foreground/30" />
                    <p className="text-muted-foreground">لا توجد مصادر متاحة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* General folders */}
                    {generalFolders.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Globe className="h-5 w-5 text-amber-500" />
                          <h3 className="font-bold text-foreground text-sm">عام</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {generalFolders.map(folder => {
                            const IC = getIconComponent(folder.icon);
                            return (
                              <Card
                                key={folder.id}
                                className="group cursor-pointer border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10"
                                onClick={() => openFolder(folder)}
                              >
                                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <IC className="h-6 w-6 text-amber-500" />
                                  </div>
                                  <h4 className="font-semibold text-foreground text-sm leading-tight">{folder.title}</h4>
                                  <span className="text-[11px] text-muted-foreground">{folder.file_count} ملف</span>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Class folders */}
                    {classFolders.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <School className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-foreground text-sm">{student.class?.name || "فصلي"}</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {classFolders.map(folder => {
                            const IC = getIconComponent(folder.icon);
                            return (
                              <Card
                                key={folder.id}
                                className="group cursor-pointer border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10"
                                onClick={() => openFolder(folder)}
                              >
                                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                                  <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <IC className="h-6 w-6 text-primary" />
                                  </div>
                                  <h4 className="font-semibold text-foreground text-sm leading-tight">{folder.title}</h4>
                                  <span className="text-[11px] text-muted-foreground">{folder.file_count} ملف</span>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          );
        })()}
      </main>

      {previewFile && (
        <FilePreviewDialog
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Popup Message Dialog */}
      <Dialog open={popupOpen} onOpenChange={(open) => {
        if (!open) {
          const storageKey = `popup_dismissed_${student?.id || "unknown"}`;
          localStorage.setItem(storageKey, new Date().toISOString());
        }
        setPopupOpen(open);
      }}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Megaphone className="h-7 w-7 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {popupTitle || "رسالة من الإدارة"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-center">{popupMessage}</p>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              {popupAction && popupAction !== "none" && (
                <Button
                  onClick={() => {
                    setActiveTab(popupAction);
                    setPopupOpen(false);
                    // Scroll to tabs
                    setTimeout(() => {
                      document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }}
                  className="w-full rounded-2xl h-11 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90"
                >
                  <ArrowRight className="h-4 w-4" />
                  {{
                    grades: "عرض الدرجات",
                    attendance: "عرض الحضور",
                    behavior: "عرض السلوك",
                    activities: "عرض الأنشطة",
                    library: "عرض المكتبة",
                  }[popupAction] || "الانتقال"}
                </Button>
              )}
              <Button
                variant={popupAction && popupAction !== "none" ? "outline" : "default"}
                onClick={() => setPopupOpen(false)}
                className={cn(
                  "w-full rounded-2xl h-11 text-base font-bold",
                  (!popupAction || popupAction === "none") && "bg-gradient-to-l from-primary to-accent hover:opacity-90"
                )}
              >
                حسناً
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}