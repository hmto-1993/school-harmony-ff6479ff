import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "teacher")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, isStudent, approvalStatus } = useAuth();

  if (loading || (user && approvalStatus === null) || (allowedRoles && !role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // If student is logged in, redirect to student dashboard
  if (isStudent) return <Navigate to="/student" replace />;

  if (!user) return <Navigate to="/login" replace />;

  // Block users not yet approved (except admins, who are auto-approved by DB)
  if (approvalStatus !== "approved" && role !== "admin") {
    return <Navigate to="/pending" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
