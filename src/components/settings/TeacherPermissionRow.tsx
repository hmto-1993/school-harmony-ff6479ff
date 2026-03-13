import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TableCell, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Pencil, UserCircle, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface TeacherPermissionRowProps {
  teacher: { user_id: string; email: string; full_name: string; national_id?: string };
  onDeleted?: () => void;
  onUpdated?: (userId: string, newName: string, newNationalId: string) => void;
}

interface Permissions {
  can_print: boolean;
  can_export: boolean;
  can_send_notifications: boolean;
  can_delete_records: boolean;
  can_manage_grades: boolean;
  can_manage_attendance: boolean;
  can_view_grades: boolean;
  can_view_reports: boolean;
}

const defaultPerms: Permissions = {
  can_print: true,
  can_export: true,
  can_send_notifications: true,
  can_delete_records: true,
  can_manage_grades: true,
  can_manage_attendance: true,
  can_view_grades: true,
  can_view_reports: true,
};

export default function TeacherPermissionRow({ teacher, onDeleted, onUpdated }: TeacherPermissionRowProps) {
  const [perms, setPerms] = useState<Permissions>(defaultPerms);
  const [originalPerms, setOriginalPerms] = useState<Permissions>(defaultPerms);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(teacher.full_name);
  const [editNationalId, setEditNationalId] = useState(teacher.national_id || "");
  const [editRole, setEditRole] = useState<"admin" | "teacher">("teacher");
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentRole, setCurrentRole] = useState<"admin" | "teacher">("teacher");

  // Fetch current role
  useEffect(() => {
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", teacher.user_id)
      .single()
      .then(({ data }) => {
        if (data?.role) {
          setCurrentRole(data.role as "admin" | "teacher");
          setEditRole(data.role as "admin" | "teacher");
        }
      });
  }, [teacher.user_id]);

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
            can_view_grades: (data as any).can_view_grades ?? true,
            can_view_reports: (data as any).can_view_reports ?? true,
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

  const handleDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete_user", email: teacher.email },
    });

    setDeleting(false);
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل حذف المعلم", variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: `تم حذف حساب ${teacher.full_name} بنجاح` });
      onDeleted?.();
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "update_teacher",
        user_id: teacher.user_id,
        full_name: editName.trim(),
        national_id: editNationalId.trim(),
        role: editRole,
      },
    });
    setSavingEdit(false);

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل تحديث البيانات", variant: "destructive" });
    } else {
      toast({ title: "تم التحديث", description: "تم تحديث بيانات المعلم بنجاح" });
      setCurrentRole(editRole);
      onUpdated?.(teacher.user_id, editName.trim(), editNationalId.trim());
      setEditOpen(false);
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
      <TableCell className="font-medium text-sm">
        <div className="flex items-center gap-1.5">
          {teacher.full_name}
          <Dialog open={editOpen} onOpenChange={(open) => {
            setEditOpen(open);
            if (open) {
              setEditName(teacher.full_name);
              setEditNationalId(teacher.national_id || "");
              setEditRole(currentRole);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  تعديل بيانات المعلم
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Teacher info display */}
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">البريد الإلكتروني</span>
                    <Badge variant="secondary" className="font-mono text-xs" dir="ltr">
                      {teacher.email}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">معرف المستخدم</span>
                    <span className="font-mono text-xs text-muted-foreground/70 truncate max-w-[180px]" dir="ltr">
                      {teacher.user_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-1.5">
                  <Label className="text-sm">الاسم الكامل</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="اسم المعلم"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">رقم الهوية</Label>
                  <Input
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    placeholder="رقم الهوية الوطنية"
                    dir="ltr"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    الصلاحية
                  </Label>
                  <Select value={editRole} onValueChange={(v: "admin" | "teacher") => setEditRole(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">معلم</SelectItem>
                      <SelectItem value="admin">مدير (صلاحيات كاملة)</SelectItem>
                    </SelectContent>
                  </Select>
                  {editRole !== currentRole && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ سيتم تغيير صلاحية المستخدم من {currentRole === "admin" ? "مدير" : "معلم"} إلى {editRole === "admin" ? "مدير" : "معلم"}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">إلغاء</Button>
                </DialogClose>
                <Button
                  size="sm"
                  onClick={handleEditSave}
                  disabled={savingEdit || !editName.trim()}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingEdit ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground" dir="ltr">{teacher.national_id || "—"}</TableCell>
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
        <div className="flex items-center justify-center gap-1">
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>حذف المعلم</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف حساب <strong>{teacher.full_name}</strong>؟ سيتم حذف جميع بياناته وصلاحياته نهائياً ولا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "جارٍ الحذف..." : "حذف نهائي"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
