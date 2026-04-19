import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import schoolLogo from "@/assets/school-logo.jpg";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  UserCheck,
  Layers,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { useSubscriberStatus } from "@/hooks/useSubscriberStatus";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Lock } from "lucide-react";
import { UpgradeDialog } from "@/components/subscription/PremiumGate";

const adminLinks = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { to: "/grades", label: "الدرجات", icon: GraduationCap },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/activities", label: "الأنشطة", icon: Layers },
  { to: "/student-logins", label: "سجل الزيارات", icon: UserCheck },
  { to: "/forms", label: "النماذج الرسمية", icon: FileText },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

const teacherLinks = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { to: "/grades", label: "الدرجات", icon: GraduationCap },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/activities", label: "الأنشطة", icon: Layers },
  { to: "/forms", label: "النماذج الرسمية", icon: FileText },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { role, signOut, user } = useAuth();
  const { perms } = useTeacherPermissions();
  const { isSubscriber } = useSubscriberStatus();
  const { isPremium, loaded: tierLoaded } = useSubscriptionTier();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolSubtitle, setSchoolSubtitle] = useState("");
  const [unreadParentMessages, setUnreadParentMessages] = useState(0);

  useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", ["school_name", "school_subtitle"]).then(({ data }) => {
      data?.forEach((row) => {
        if (row.id === "school_name" && row.value) setSchoolName(row.value);
        if (row.id === "school_subtitle" && row.value) setSchoolSubtitle(row.value);
      });
    });
  }, []);

  // Fetch unread parent messages count
  const refreshParentMessages = () => {
    if (!user) return;
    supabase
      .from("parent_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        setUnreadParentMessages(count || 0);
      });
  };

  useEffect(() => {
    if (!user) return;
    refreshParentMessages();
    const interval = setInterval(refreshParentMessages, 120000); // every 2 minutes
    return () => clearInterval(interval);
  }, [user]);

  const baseLinks = role === "admin" ? adminLinks : teacherLinks;
  // Subscribers (non-primary owners) cannot see system-wide tools:
  // - Visit logs (/student-logins): system-level analytics for primary owner only
  // - Notifications page (/notifications): platform-wide notifications, isolated workspace doesn't need it
  const subscriberBlacklist = new Set(["/student-logins", "/notifications"]);
  let links = isSubscriber
    ? baseLinks.filter(l => !subscriberBlacklist.has(l.to))
    : baseLinks;
  // Hide settings for read-only teachers
  if (perms.read_only_mode && role !== "admin") {
    links = links.filter(l => l.to !== "/settings");
  }
  const isCollapsed = !isMobile && collapsed;

  return (
    <aside
      className={cn(
        "gradient-sidebar flex flex-col text-sidebar-foreground transition-all duration-300 min-h-screen",
        isMobile ? "w-64" : (isCollapsed ? "w-[72px]" : "w-64"),
        isMobile && "sticky top-0"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b border-sidebar-border/50",
        isCollapsed && "justify-center"
      )}>
        <div className="relative">
          <img src={schoolLogo} alt="الشعار" className="h-10 w-10 rounded-xl object-cover" />
          <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-success border-2 border-sidebar-background" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">{schoolName}</h2>
            <p className="text-[11px] text-sidebar-foreground/50 font-light">{schoolSubtitle}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const showBadge = link.to === "/notifications" && unreadParentMessages > 0;
          // Premium-gated routes (basic users see lock and upgrade dialog)
          const isPremiumRoute = link.to === "/student-logins";
          const isLocked = isPremiumRoute && tierLoaded && !isPremium;

          if (isLocked) {
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 relative",
                  isCollapsed && "justify-center px-2",
                  "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                title="ميزة بريميوم"
              >
                <link.icon className="h-[18px] w-[18px] shrink-0" />
                {!isCollapsed && <span>{link.label}</span>}
                <Lock className={cn("h-3.5 w-3.5 text-amber-500", isCollapsed ? "absolute -top-0.5 -right-0.5" : "mr-auto")} />
              </button>
            );
          }

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => {
                onNavigate?.();
                if (link.to === "/notifications") refreshParentMessages();
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 relative",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold shadow-glow"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <link.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "drop-shadow-sm")} />
              {!isCollapsed && <span>{link.label}</span>}
              {showBadge && (
                <span className={cn(
                  "flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1",
                  isCollapsed ? "absolute -top-0.5 -right-0.5" : "mr-auto"
                )}>
                  {unreadParentMessages > 99 ? "99+" : unreadParentMessages}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        featureName="سجل الزيارات والتقارير المتقدمة"
        description="تتبع زيارات الطلاب وأولياء الأمور وتحليلات الاستخدام متاحة حصرياً ضمن باقة ألفا بريميوم."
      />

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/50 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200",
            isCollapsed && "justify-center px-2"
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" />
          )}
          {!isCollapsed && <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>}
        </button>
        <button
          onClick={signOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-destructive/15 hover:text-destructive transition-all duration-200",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span>تسجيل الخروج</span>}
        </button>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </aside>
  );
}
