import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import schoolLogo from "@/assets/school-logo.jpg";
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
            <img src={schoolLogo} alt="شعار المدرسة" className="h-8 w-8 rounded-lg object-cover mr-auto" />
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
