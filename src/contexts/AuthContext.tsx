import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "teacher";
export type ApprovalStatus = "pending" | "approved" | "rejected";

interface StudentData {
  id: string;
  full_name: string;
  national_id: string;
  academic_number: string | null;
  class_id: string | null;
  class: { name: string; grade: string; section: string } | null;
  grades: any[];
  behaviors: any[];
  attendance: any[];
  visibility?: { grades: boolean; attendance: boolean; behavior: boolean };
  evalSettings?: { showDaily: boolean; showClasswork: boolean; iconsCount: number };
  session_token?: string;
  session_issued_at?: number;
  login_type?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  approvalStatus: ApprovalStatus | null;
  subscriptionEnd: string | null;
  organizationId: string | null;
  subscriptionExpired: boolean;
  nationalId: string | null;
  isSuperOwner: boolean;
  loading: boolean;
  student: StudentData | null;
  isStudent: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInStudent: (national_id: string, login_type?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [nationalId, setNationalId] = useState<string | null>(null);
  const [isSuperOwnerFlag, setIsSuperOwnerFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [studentRestoring, setStudentRestoring] = useState(() => !!sessionStorage.getItem("student_session"));

  const isStudent = !!student && !user;
  const isSuperOwner = isSuperOwnerFlag;
  const subscriptionExpired = !isSuperOwner && !!subscriptionEnd && new Date(subscriptionEnd).getTime() <= Date.now();

  const PROFILE_CACHE_KEY = (uid: string) => `auth_profile_cache_v1:${uid}`;

  const fetchRole = async (userId: string) => {
    // Helper: one attempt with a hard timeout
    const attempt = async (timeoutMs: number) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("fetchRole timeout")), timeoutMs)
      );
      const query = Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("approval_status, subscription_end, national_id, role, organization_id, is_super_owner_flag").eq("user_id", userId).maybeSingle(),
      ]);
      return (await Promise.race([query, timeout])) as any;
    };

    // Retry up to 3 times with increasing timeouts to survive flaky mobile networks
    let lastErr: unknown = null;
    for (let i = 0; i < 3; i++) {
      try {
        const [roleRes, profileRes] = await attempt(i === 0 ? 8000 : 12000);
        const rawGlobalRole = roleRes.data?.role as string | undefined;
        const globalRole: AppRole | null = rawGlobalRole === "admin" || rawGlobalRole === "teacher" ? rawGlobalRole : null;
        const orgRole = (profileRes.data as any)?.role as string | undefined;
        const effectiveRole: AppRole | null = globalRole || (orgRole === "owner" ? "admin" : (orgRole === "teacher" ? "teacher" : null));
        const approval = ((profileRes.data as any)?.approval_status as ApprovalStatus) || "pending";
        const subEnd = ((profileRes.data as any)?.subscription_end as string) || null;
        const orgId = ((profileRes.data as any)?.organization_id as string) || null;
        const natId = ((profileRes.data as any)?.national_id as string) || null;
        const superFlag = !!(profileRes.data as any)?.is_super_owner_flag;

        setRole(effectiveRole);
        setApprovalStatus(approval);
        setSubscriptionEnd(subEnd);
        setOrganizationId(orgId);
        setNationalId(natId);
        setIsSuperOwnerFlag(superFlag);

        // Cache the last good profile so transient failures don't kick the user to /pending
        try {
          localStorage.setItem(PROFILE_CACHE_KEY(userId), JSON.stringify({
            role: effectiveRole, approval, subEnd, orgId, natId, superFlag, at: Date.now(),
          }));
        } catch { /* ignore quota */ }
        return;
      } catch (err) {
        lastErr = err;
        // Small backoff before retrying
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }

    console.error("[AuthContext] fetchRole failed after retries:", lastErr);
    // CRITICAL: do NOT default to "pending" on network failure — that wrongly
    // redirects already-approved users (incl. owners) to the pending-approval page.
    // Fall back to last-known cached profile if available; otherwise keep approvalStatus
    // null so ProtectedRoute keeps showing the loader instead of misrouting.
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY(userId));
      if (raw) {
        const c = JSON.parse(raw);
        setRole(c.role ?? null);
        setApprovalStatus(c.approval ?? null);
        setSubscriptionEnd(c.subEnd ?? null);
        setOrganizationId(c.orgId ?? null);
        setNationalId(c.natId ?? null);
        setIsSuperOwnerFlag(!!c.superFlag);
        return;
      }
    } catch { /* ignore */ }
    // No cache — leave approvalStatus null (loader stays) rather than misclassifying as pending.
    setRole(null);
    setApprovalStatus(null);
    setSubscriptionEnd(null);
    setOrganizationId(null);
    setNationalId(null);
    setIsSuperOwnerFlag(false);
  };

  // Restore student session using HMAC token (no PII in storage)
  useEffect(() => {
    const saved = sessionStorage.getItem("student_session");
    if (!saved) return;
    
    // Hard timeout: never let restore block the UI more than 7s on poor networks.
    const failsafe = setTimeout(() => setStudentRestoring(false), 7000);
    
    try {
      const parsed = JSON.parse(saved);
      const { student_id, session_token, session_issued_at, login_type } = parsed;
      
      if (student_id && session_token && session_issued_at) {
        // Secure restore via HMAC token verification
        supabase.functions.invoke("restore-student-session", {
          body: { student_id, session_token, session_issued_at, login_type: login_type || "student" },
        }).then(({ data, error }) => {
          if (!error && data && !data.error) {
            setStudent({
              id: data.student.id,
              full_name: data.student.full_name,
              national_id: data.student.national_id,
              academic_number: data.student.academic_number || null,
              class_id: data.student.class_id || null,
              class: data.student.class,
              grades: data.grades,
              behaviors: data.behaviors,
              attendance: data.attendance,
              visibility: data.visibility || { grades: true, attendance: true, behavior: true },
              evalSettings: data.evalSettings || { showDaily: true, showClasswork: true, iconsCount: 10 },
              session_token: data.session_token,
              session_issued_at: data.session_issued_at,
              login_type: login_type || "student",
            });
            sessionStorage.setItem("student_session", JSON.stringify({
              student_id: data.student.id,
              session_token: data.session_token,
              session_issued_at: data.session_issued_at,
              login_type: login_type || "student",
            }));
          } else {
            sessionStorage.removeItem("student_session");
          }
        }).catch((err) => {
          console.error("[AuthContext] restore student session failed:", err);
          sessionStorage.removeItem("student_session");
        }).finally(() => {
          clearTimeout(failsafe);
          setStudentRestoring(false);
        });
      } else {
        sessionStorage.removeItem("student_session");
        clearTimeout(failsafe);
        setStudentRestoring(false);
      }
    } catch {
      sessionStorage.removeItem("student_session");
      clearTimeout(failsafe);
      setStudentRestoring(false);
    }
    
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    // Hard failsafe: if anything stalls (Service Worker, blocked storage, dead network),
    // never keep the splash screen up for more than 10s.
    const failsafe = setTimeout(() => {
      if (!cancelled) {
        console.warn("[AuthContext] Auth init timeout — releasing loading state");
        setLoading(false);
      }
    }, 10000);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Do NOT await inside the callback — Supabase docs warn this can deadlock.
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRole(session.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          setRole(null);
          setApprovalStatus(null);
          setSubscriptionEnd(null);
          setOrganizationId(null);
          setNationalId(null);
          if (!cancelled) setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("[AuthContext] getSession failed:", err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      // Record staff login (fire and forget)
      supabase.from("staff_logins").insert({ user_id: data.user.id }).then(() => {});
    }
    return { error: error as Error | null };
  };

  const signInStudent = async (national_id: string, login_type?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("student-login", {
        body: { national_id, login_type: login_type || "student" },
      });
      if (error) return { error: "حدث خطأ في الاتصال" };
      if (data?.error) return { error: data.error as string };
      
      const studentData: StudentData = {
        id: data.student.id,
        full_name: data.student.full_name,
        national_id: data.student.national_id,
        academic_number: data.student.academic_number || null,
        class_id: data.student.class_id || null,
        class: data.student.class,
        grades: data.grades,
        behaviors: data.behaviors,
        attendance: data.attendance,
        visibility: data.visibility || { grades: true, attendance: true, behavior: true },
        evalSettings: data.evalSettings || { showDaily: true, showClasswork: true, iconsCount: 10 },
        session_token: data.session_token,
        session_issued_at: data.session_issued_at,
        login_type: login_type || "student",
      };
      setStudent(studentData);
      // Store session with HMAC token — no PII (national_id) in browser storage
      sessionStorage.setItem("student_session", JSON.stringify({
        student_id: studentData.id,
        session_token: studentData.session_token,
        session_issued_at: studentData.session_issued_at,
        login_type: login_type || "student",
      }));
      return { error: null };
    } catch {
      return { error: "حدث خطأ غير متوقع" };
    }
  };

  const signOut = async () => {
    // Drop any tenant-scoped print header cache so the next sign-in fetches fresh data
    try {
      const [{ clearPrintHeaderOrgCache }, { clearPrintHeaderCache }] = await Promise.all([
        import("@/lib/print-header-fetch"),
        import("@/lib/grades-print-helpers"),
      ]);
      clearPrintHeaderOrgCache();
      clearPrintHeaderCache();
    } catch { /* ignore */ }
    if (student) {
      setStudent(null);
      sessionStorage.removeItem("student_session");
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setApprovalStatus(null);
      setSubscriptionEnd(null);
      setOrganizationId(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, approvalStatus, subscriptionEnd, organizationId, subscriptionExpired, nationalId, isSuperOwner, loading: loading || studentRestoring, student, isStudent, signIn, signInStudent, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
