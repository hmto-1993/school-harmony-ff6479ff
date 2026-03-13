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
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";

const adminLinks = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/students", label: "الطلاب", icon: Users },
  { to: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { to: "/grades", label: "الدرجات", icon: GraduationCap },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/activities", label: "الأنشطة", icon: Layers },
  { to: "/student-logins", label: "دخول الطلاب", icon: UserCheck },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

const teacherLinks = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/attendance", label: "التحضير", icon: ClipboardCheck },
  { to: "/grades", label: "الدرجات", icon: GraduationCap },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
  { to: "/library", label: "المكتبة", icon: BookOpen },
  { to: "/activities", label: "الأنشطة", icon: Layers },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { role, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [schoolName, setSchoolName] = useState("ثانوية الفيصلية");
  const [schoolSubtitle, setSchoolSubtitle] = useState("نظام الإدارة");

  useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", ["school_name", "school_subtitle"]).then(({ data }) => {
      data?.forEach((row) => {
        if (row.id === "school_name" && row.value) setSchoolName(row.value);
        if (row.id === "school_subtitle" && row.value) setSchoolSubtitle(row.value);
      });
    });
  }, []);

  const links = role === "admin" ? adminLinks : teacherLinks;
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
          <img src={schoolLogo} alt="الشعار" className="h-10 w-10 rounded-xl object-contain bg-sidebar-accent p-1 ring-1 ring-sidebar-border/30" />
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
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold shadow-glow"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <link.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "drop-shadow-sm")} />
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

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
