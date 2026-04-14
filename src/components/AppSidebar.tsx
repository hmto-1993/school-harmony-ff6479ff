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
  Brain,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";

type SidebarLink = {
  path: string;
  label: string;
  icon: LucideIcon;
  search?: string;
};

const adminLinks: SidebarLink[] = [
  { path: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/students", label: "الطلاب", icon: Users },
  { path: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { path: "/grades", label: "الدرجات", icon: GraduationCap },
  { path: "/grades", search: "tool=radar", label: "الرادار", icon: Radar },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/notifications", label: "الإشعارات", icon: Bell },
  { path: "/library", label: "المكتبة", icon: BookOpen },
  { path: "/library", search: "tab=questionbank", label: "بنك الأسئلة", icon: Brain },
  { path: "/activities", label: "الأنشطة", icon: Layers },
  { path: "/student-logins", label: "سجل الزيارات", icon: UserCheck },
  { path: "/forms", label: "النماذج الرسمية", icon: FileText },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

const teacherLinks: SidebarLink[] = [
  { path: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/students", label: "الطلاب", icon: Users },
  { path: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { path: "/grades", label: "الدرجات", icon: GraduationCap },
  { path: "/grades", search: "tool=radar", label: "الرادار", icon: Radar },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/notifications", label: "الإشعارات", icon: Bell },
  { path: "/library", label: "المكتبة", icon: BookOpen },
  { path: "/library", search: "tab=questionbank", label: "بنك الأسئلة", icon: Brain },
  { path: "/activities", label: "الأنشطة", icon: Layers },
  { path: "/forms", label: "النماذج الرسمية", icon: FileText },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { role, signOut, user } = useAuth();
  const { perms } = useTeacherPermissions();
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
    const interval = setInterval(refreshParentMessages, 120000);
    return () => clearInterval(interval);
  }, [user]);

  const baseLinks = role === "admin" ? adminLinks : teacherLinks;
  const links = perms.read_only_mode && role !== "admin"
    ? baseLinks.filter((link) => link.path !== "/settings")
    : baseLinks;
  const isCollapsed = !isMobile && collapsed;

  const buildLinkHref = (link: SidebarLink) => (link.search ? `${link.path}?${link.search}` : link.path);
  const isLinkActive = (link: SidebarLink) => {
    if (location.pathname !== link.path) return false;
    if (link.search) return location.search === `?${link.search}`;

    const variantSearches = links
      .filter((item) => item.path === link.path && item.search)
      .map((item) => `?${item.search}`);

    return !variantSearches.includes(location.search);
  };

  return (
    <aside
      className={cn(
        "gradient-sidebar flex flex-col text-sidebar-foreground transition-all duration-300 min-h-screen",
        isMobile ? "w-64" : (isCollapsed ? "w-[72px]" : "w-64"),
        isMobile && "sticky top-0"
      )}
    >
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

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const href = buildLinkHref(link);
          const isActive = isLinkActive(link);
          const showBadge = link.path === "/notifications" && unreadParentMessages > 0;

          return (
            <Link
              key={href}
              to={href}
              onClick={() => {
                onNavigate?.();
                if (link.path === "/notifications") refreshParentMessages();
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

      <div className="p-3 border-t border-sidebar-border/50 space-y-1">
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
