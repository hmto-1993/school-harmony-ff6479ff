import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TableCell, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeacherPermissionRowProps {
  teacher: { user_id: string; email: string; full_name: string; national_id?: string };
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
  const [originalPerms, setOriginalPerms] = useState<Permissions>(defaultPerms);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasChanges = loaded && JSON.stringify(perms) !== JSON.stringify(originalPerms);

  useEffect(() => {
    supabase
      .from("teacher_permissions")
      .select("*")
      .eq("user_id", teacher.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p: Permissions = {
            can_print: data.can_print,
            can_export: data.can_export,
            can_send_notifications: data.can_send_notifications,
            can_delete_records: data.can_delete_records,
            can_manage_grades: data.can_manage_grades,
            can_manage_attendance: data.can_manage_attendance,
          };
          setPerms(p);
          setOriginalPerms(p);
        }
        setLoaded(true);
      });
  }, [teacher.user_id]);

  const togglePerm = (key: keyof Permissions) => {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("teacher_permissions")
      .upsert(
        { user_id: teacher.user_id, ...perms },
        { onConflict: "user_id" }
      );
    setSaving(false);

    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ الصلاحيات", variant: "destructive" });
    } else {
      setOriginalPerms({ ...perms });
      toast({ title: "تم الحفظ", description: `تم تحديث صلاحيات ${teacher.full_name}` });
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
        <Button
          variant={hasChanges ? "default" : "ghost"}
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "..." : "حفظ"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
