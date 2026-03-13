import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import PageTransition from "@/components/PageTransition";
import schoolLogo from "@/assets/school-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import BackToTop from "@/components/BackToTop";

export default function DashboardLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [useLocation().pathname]);

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
            className="sticky top-0 z-30 w-full flex items-center gap-2.5 px-4 py-3 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent border-b border-primary/15 text-foreground backdrop-blur-sm"
          >
            <Menu className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">القائمة</span>
            <img src={schoolLogo} alt="شعار المدرسة" className="h-8 w-8 rounded-lg object-contain mr-auto" />
          </button>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
      <BackToTop />
    </div>
  );
}
