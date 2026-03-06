import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import schoolLogo from "@/assets/school-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function DashboardLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background" dir="rtl">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        isMobile
          ? "fixed inset-y-0 right-0 z-50 transition-transform duration-300"
          : "relative",
        isMobile && !mobileOpen && "translate-x-full"
      )}>
        <AppSidebar onNavigate={() => isMobile && setMobileOpen(false)} />
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0" dir="rtl">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="sticky top-0 z-30 w-full flex items-center gap-2.5 px-4 py-3 nav-blur text-foreground"
          >
            <Menu className="h-5 w-5 text-neon" />
            <span className="text-sm font-bold font-display text-gold">Alpha Physics</span>
            <img src={schoolLogo} alt="شعار المدرسة" className="h-11 w-11 rounded-lg object-contain mr-auto ring-1 ring-neon/20" />
          </button>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
