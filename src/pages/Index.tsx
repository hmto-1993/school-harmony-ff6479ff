import { Navigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// الصفحة الرئيسية تحول إلى لوحة التحكم أو تسجيل الدخول
const Index = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-card">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold">جارٍ تحميل لوحة التحكم</p>
                <p className="text-sm text-primary-foreground/80">يتم تجهيز البيانات وعرض الصفحة</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-card"
              >
                <div className="mb-3 h-10 w-10 rounded-xl bg-muted animate-pulse" />
                <div className="mb-2 h-5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export default Index;
