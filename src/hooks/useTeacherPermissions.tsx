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
  can_view_students: boolean;
  read_only_mode: boolean;
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
  can_view_students: true,
  read_only_mode: false,
};

const viewOnly: TeacherPerms = {
  can_print: true,
  can_export: true,
  can_send_notifications: false,
  can_delete_records: false,
  can_manage_grades: false,
  can_manage_attendance: false,
  can_view_grades: true,
  can_view_reports: true,
  can_view_attendance: true,
  can_view_activities: true,
  can_view_dashboard: true,
  can_view_students: true,
  read_only_mode: true,
};

export function useTeacherPermissions() {
  const { user, role } = useAuth();
  const [perms, setPerms] = useState<TeacherPerms>(allTrue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }

    if (role === "admin") {
      // Check if admin_read_only is enabled and this user is NOT the primary admin
      supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["admin_read_only", "admin_primary_id"])
        .then(({ data }) => {
          let readOnly = false;
          let primaryId = "";
          (data || []).forEach((s: any) => {
            if (s.id === "admin_read_only") readOnly = s.value === "true";
            if (s.id === "admin_primary_id") primaryId = s.value || "";
          });

          if (readOnly && primaryId && user.id !== primaryId) {
            setPerms(viewOnly);
          } else {
            setPerms(allTrue);
          }
          setLoaded(true);
        });
      return;
    }

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
            can_view_grades: data.can_view_grades,
            can_view_reports: data.can_view_reports,
            can_view_attendance: data.can_view_attendance,
            can_view_activities: data.can_view_activities,
            can_view_dashboard: data.can_view_dashboard,
            can_view_students: data.can_view_students,
            read_only_mode: data.read_only_mode,
          });
        }
        setLoaded(true);
      });
  }, [user, role]);

  return { perms, loaded };
}
