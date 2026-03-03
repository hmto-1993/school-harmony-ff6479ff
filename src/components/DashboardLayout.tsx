import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full bg-background" dir="rtl">
      <AppSidebar />
      <main className="flex-1 overflow-auto" dir="rtl">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
