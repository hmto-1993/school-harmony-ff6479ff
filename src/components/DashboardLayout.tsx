import { Outlet, useLocation, Link } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import schoolLogo from "@/assets/school-logo.png";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import BackToTop from "@/components/BackToTop";
import SubscriptionExpiryBadge from "@/components/SubscriptionExpiryBadge";

export default function DashboardLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      <main className="flex-1 overflow-x-hidden overflow-y-auto min-w-0" dir="rtl">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="sticky top-0 z-30 w-full flex items-center gap-2.5 px-4 py-3 bg-background/95 dark:bg-background/95 border-b border-primary/15 text-foreground"
          >
            <Menu className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">القائمة</span>
            <Link to="/dashboard" onClick={(e) => e.stopPropagation()} className="mr-auto inline-flex">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out hover:scale-105 bg-white/50 ring-1 ring-primary/20 shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.3)] dark:bg-white dark:ring-primary/30 dark:shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]">
                <img
                  src={schoolLogo}
                  alt="شعار منصة المتميز التعليمية"
                  className="h-11 w-11 object-contain drop-shadow-sm"
                />
              </div>
            </Link>
          </button>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden min-h-[calc(100vh-60px)]">
          <div className="flex justify-end mb-3">
            <SubscriptionExpiryBadge />
          </div>
          <Outlet />
        </div>
      </main>
      <BackToTop />
    </div>
  );
}
