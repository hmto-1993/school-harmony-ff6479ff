import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "teacher")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, isStudent, approvalStatus, subscriptionExpired, isSuperOwner } = useAuth();

  // Show loader only while:
  // - Initial auth state is resolving, OR
  // - We have a user but their profile (approvalStatus) hasn't loaded yet.
  // Do NOT block on `!role`: a logged-in user may legitimately have no role
  // (e.g. teacher in an org without admin rights) — the role-mismatch check
  // below handles redirection.
  if (loading || (user && approvalStatus === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (isStudent) return <Navigate to="/student" replace />;
  if (!user) return <Navigate to="/login" replace />;

  // Super owner bypasses ALL approval/subscription/role restrictions
  if (isSuperOwner) return <>{children}</>;

  if (approvalStatus !== "approved" && role !== "admin") {
    return <Navigate to="/pending" replace />;
  }

  if (subscriptionExpired && role !== "admin") {
    return <Navigate to="/expired" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
