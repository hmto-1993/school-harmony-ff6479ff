import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "teacher";

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
  session_token?: string;
  session_issued_at?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
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
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [studentRestoring, setStudentRestoring] = useState(() => !!sessionStorage.getItem("student_session"));

  const isStudent = !!student && !user;

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    setRole((data?.role as AppRole) || null);
  };

  // Restore student session using HMAC token (no PII in storage)
  useEffect(() => {
    const saved = sessionStorage.getItem("student_session");
    if (saved) {
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
                session_token: data.session_token,
                session_issued_at: data.session_issued_at,
              });
              // Update stored token with the fresh one
              sessionStorage.setItem("student_session", JSON.stringify({
                student_id: data.student.id,
                session_token: data.session_token,
                session_issued_at: data.session_issued_at,
                login_type: login_type || "student",
              }));
            } else {
              sessionStorage.removeItem("student_session");
            }
            setStudentRestoring(false);
          });
        } else {
          // Invalid or legacy format — require re-login
          sessionStorage.removeItem("student_session");
          setStudentRestoring(false);
        }
      } catch {
        sessionStorage.removeItem("student_session");
        setStudentRestoring(false);
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
        session_token: data.session_token,
        session_issued_at: data.session_issued_at,
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
    if (student) {
      setStudent(null);
      sessionStorage.removeItem("student_session");
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading: loading || studentRestoring, student, isStudent, signIn, signInStudent, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
