import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TeacherPerms {
  can_print: boolean;
  can_export: boolean;
  can_send_notifications: boolean;
  can_delete_records: boolean;
  can_manage_grades: boolean;
  can_manage_attendance: boolean;
  can_view_grades: boolean;
  can_view_reports: boolean;
  can_view_attendance: boolean;
  can_view_activities: boolean;
  can_view_dashboard: boolean;
}

const allTrue: TeacherPerms = {
  can_print: true,
  can_export: true,
  can_send_notifications: true,
  can_delete_records: true,
  can_manage_grades: true,
  can_manage_attendance: true,
  can_view_grades: true,
  can_view_reports: true,
  can_view_attendance: true,
  can_view_activities: true,
  can_view_dashboard: true,
};

export function useTeacherPermissions() {
  const { user, role } = useAuth();
  const [perms, setPerms] = useState<TeacherPerms>(allTrue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    if (role === "admin") { setPerms(allTrue); setLoaded(true); return; }

    supabase
      .from("teacher_permissions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPerms({
            can_print: data.can_print,
            can_export: data.can_export,
            can_send_notifications: data.can_send_notifications,
            can_delete_records: data.can_delete_records,
            can_manage_grades: data.can_manage_grades,
            can_manage_attendance: data.can_manage_attendance,
            can_view_grades: (data as any).can_view_grades ?? true,
            can_view_reports: (data as any).can_view_reports ?? true,
            can_view_attendance: (data as any).can_view_attendance ?? true,
            can_view_activities: (data as any).can_view_activities ?? true,
            can_view_dashboard: (data as any).can_view_dashboard ?? true,
          });
        }
        setLoaded(true);
      });
  }, [user, role]);

  return { perms, loaded };
}
