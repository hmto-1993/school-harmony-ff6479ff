import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TableCell, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeacherPermissionRowProps {
  teacher: { user_id: string; email: string; full_name: string };
}

interface Permissions {
  can_print: boolean;
  can_export: boolean;
  can_send_notifications: boolean;
  can_delete_records: boolean;
  can_manage_grades: boolean;
  can_manage_attendance: boolean;
}

const defaultPerms: Permissions = {
  can_print: true,
  can_export: true,
  can_send_notifications: true,
  can_delete_records: true,
  can_manage_grades: true,
  can_manage_attendance: true,
};

export default function TeacherPermissionRow({ teacher }: TeacherPermissionRowProps) {
  const [perms, setPerms] = useState<Permissions>(defaultPerms);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("teacher_permissions")
      .select("*")
      .eq("user_id", teacher.user_id)
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
          });
        }
        setLoaded(true);
      });
  }, [teacher.user_id]);

  const togglePerm = async (key: keyof Permissions) => {
    const newVal = !perms[key];
    setPerms((p) => ({ ...p, [key]: newVal }));
    setSaved(false);

    const { error } = await supabase
      .from("teacher_permissions")
      .upsert(
        { user_id: teacher.user_id, ...perms, [key]: newVal },
        { onConflict: "user_id" }
      );

    if (error) {
      setPerms((p) => ({ ...p, [key]: !newVal }));
      toast({ title: "خطأ", description: "فشل تحديث الصلاحية", variant: "destructive" });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (!loaded) return null;

  const permKeys: (keyof Permissions)[] = [
    "can_print",
    "can_export",
    "can_send_notifications",
    "can_delete_records",
    "can_manage_grades",
    "can_manage_attendance",
  ];

  return (
    <TableRow className="group">
      <TableCell className="font-medium text-sm">{teacher.full_name}</TableCell>
      <TableCell className="text-xs text-muted-foreground" dir="ltr">{teacher.email}</TableCell>
      {permKeys.map((key) => (
        <TableCell key={key} className="text-center">
          <Switch
            checked={perms[key]}
            onCheckedChange={() => togglePerm(key)}
            className="mx-auto"
          />
        </TableCell>
      ))}
      <TableCell className="text-center">
        {saved && <Check className="h-4 w-4 text-emerald-500 mx-auto animate-in fade-in" />}
      </TableCell>
    </TableRow>
  );
}
