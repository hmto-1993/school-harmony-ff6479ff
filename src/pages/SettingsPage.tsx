import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  GraduationCap,
  Users,
  Eye,
  UserCircle,
  KeyRound,
  Printer,
  Upload,
  FileSpreadsheet,
  Pencil,
  Check,
  X,
  MessageSquare,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ClassRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  academic_year: string;
  created_at: string;
  studentCount?: number;
}

interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
  class_id: string | null;
  class_name?: string;
  category_group: string;
}

export default function SettingsPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNationalId, setProfileNationalId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Teacher password management
  const [teachers, setTeachers] = useState<{ user_id: string; email: string; full_name: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // New teacher form
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherNationalId, setNewTeacherNationalId] = useState("");
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [newTeacherRole, setNewTeacherRole] = useState<"admin" | "teacher">("teacher");

  // Letterhead
  const [letterheadUrl, setLetterheadUrl] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

  // Change own password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newOwnPassword, setNewOwnPassword] = useState("");
  const [confirmOwnPassword, setConfirmOwnPassword] = useState("");
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // New class form
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newGrade, setNewGrade] = useState("الأول الثانوي");
  const [newYear, setNewYear] = useState("1446-1447");

  // Edit class inline
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [editingClassGrade, setEditingClassGrade] = useState("");
  const [editingClassSection, setEditingClassSection] = useState("");
  const [editingClassYear, setEditingClassYear] = useState("");

  // Import classes from Excel
  const [importClassesOpen, setImportClassesOpen] = useState(false);
  const [importedClasses, setImportedClasses] = useState<{ name: string; grade: string; section: string }[]>([]);
  const [importingClasses, setImportingClasses] = useState(false);
  const classFileRef = useRef<HTMLInputElement>(null);

  // Edit category
  const [editingCats, setEditingCats] = useState<Record<string, { weight: number; max_score: number; name?: string; category_group?: string }>>({});
  const [savingCats, setSavingCats] = useState(false);

  // SMS Provider settings
  const [smsProvider, setSmsProvider] = useState("msegat");
  const [providerUsername, setProviderUsername] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerSender, setProviderSender] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  // Login page settings
  const [loginSchoolName, setLoginSchoolName] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // New category form
  const [newCatClassId, setNewCatClassId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [newCatMaxScore, setNewCatMaxScore] = useState(100);
  const [newCatGroup, setNewCatGroup] = useState("classwork");

  const fetchData = async () => {
    setLoading(true);
    const [classesRes, catsRes, studentsRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("grade_categories").select("*, classes(name)").order("sort_order"),
      supabase.from("students").select("id, class_id"),
    ]);

    const classData = (classesRes.data || []) as ClassRow[];
    const studentCounts: Record<string, number> = {};
    (studentsRes.data || []).forEach((s: any) => {
      if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1;
    });
    classData.forEach((c) => (c.studentCount = studentCounts[c.id] || 0));

    setClasses(classData);

    const catData = (catsRes.data || []).map((c: any) => ({
      ...c,
      class_name: c.classes?.name || "—",
    }));
    setCategories(catData);

    // Init editing state
    const edits: Record<string, { weight: number; max_score: number }> = {};
    catData.forEach((c: GradeCategory) => {
      edits[c.id] = { weight: c.weight, max_score: c.max_score };
    });
    setEditingCats(edits);

    // Fetch profile
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, national_id")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setProfileName(profile.full_name || "");
        setProfilePhone(profile.phone || "");
        setProfileNationalId(profile.national_id || "");
      }
    }

    // Fetch teachers list for admin
    if (user && isAdmin) {
      const { data: teachersData } = await supabase.functions.invoke("manage-users", {
        body: { action: "list_teachers" },
      });
      if (teachersData?.teachers) {
        setTeachers(teachersData.teachers);
      }
    }

    // Fetch letterhead URL
    const { data: lhSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_letterhead_url")
      .single();
    if (lhSetting?.value) setLetterheadUrl(lhSetting.value);

    // Fetch SMS provider settings
    if (isAdmin) {
      const { data: smsData } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["sms_provider", "sms_provider_username", "sms_provider_api_key", "sms_provider_sender"]);
      (smsData || []).forEach((s: any) => {
        if (s.id === "sms_provider") setSmsProvider(s.value || "msegat");
        if (s.id === "sms_provider_username") setProviderUsername(s.value || "");
        if (s.id === "sms_provider_api_key") setProviderApiKey(s.value || "");
        if (s.id === "sms_provider_sender") setProviderSender(s.value || "");
      });
    }

    // Fetch login page settings
    if (isAdmin) {
      const { data: loginData } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["school_name", "school_subtitle", "school_logo_url"]);
      (loginData || []).forEach((s: any) => {
        if (s.id === "school_name") setLoginSchoolName(s.value || "");
        if (s.id === "school_subtitle") setLoginSubtitle(s.value || "");
        if (s.id === "school_logo_url") setSchoolLogoUrl(s.value || "");
      });
    }

    setLoading(false);
  };

  const handleSaveProvider = async () => {
    setSavingProvider(true);
    const updates = [
      supabase.from("site_settings").update({ value: smsProvider }).eq("id", "sms_provider"),
      supabase.from("site_settings").update({ value: providerUsername }).eq("id", "sms_provider_username"),
      supabase.from("site_settings").update({ value: providerApiKey }).eq("id", "sms_provider_api_key"),
      supabase.from("site_settings").update({ value: providerSender }).eq("id", "sms_provider_sender"),
    ];
    const results = await Promise.all(updates);
    setSavingProvider(false);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast({ title: "خطأ", description: "فشل حفظ إعدادات المزود", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات مزود SMS" });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileName,
        phone: profilePhone,
        national_id: profileNationalId || null,
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي بنجاح" });
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!newOwnPassword.trim() || !currentPassword.trim()) return;
    if (newOwnPassword !== confirmOwnPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" });
      return;
    }
    setChangingOwnPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" });
      setChangingOwnPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newOwnPassword });
    setChangingOwnPassword(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewOwnPassword("");
      setConfirmOwnPassword("");
    }
  };

  const handleChangePassword = async () => {
    if (!selectedTeacher || !newPassword.trim()) return;
    const teacher = teachers.find((t) => t.user_id === selectedTeacher);
    if (!teacher) return;

    setChangingPassword(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "change_password", email: teacher.email, password: newPassword },
    });
    setChangingPassword(false);

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في تغيير كلمة المرور", variant: "destructive" });
    } else {
      toast({ title: "تم التغيير", description: `تم تغيير كلمة المرور لـ ${teacher.full_name}` });
      setNewPassword("");
      setSelectedTeacher("");
    }
  };

  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()) return;
    setCreatingTeacher(true);

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "create_user",
        email: newTeacherEmail,
        password: newTeacherPassword,
        full_name: newTeacherName,
        role: newTeacherRole,
      },
    });

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل في إنشاء الحساب", variant: "destructive" });
      setCreatingTeacher(false);
      return;
    }

    if (newTeacherNationalId.trim() && data?.user_id) {
      await supabase
        .from("profiles")
        .update({ national_id: newTeacherNationalId })
        .eq("user_id", data.user_id);
    }

    toast({ title: "تم الإنشاء", description: `تم إنشاء حساب ${newTeacherName} بنجاح` });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setNewTeacherNationalId("");
    setCreatingTeacher(false);
    fetchData();
  };

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);

    const formData = new FormData();
    formData.append("file", file);

    const { data, error } = await supabase.functions.invoke("upload-letterhead", {
      body: formData,
    });

    setUploadingLetterhead(false);
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || "فشل رفع الملف", variant: "destructive" });
    } else {
      setLetterheadUrl(data.url);
      toast({ title: "تم الرفع", description: "تم تحديث ورقة الطباعة بنجاح" });
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newSection.trim()) return;
    const { error } = await supabase.from("classes").insert({
      name: newClassName,
      section: newSection,
      grade: newGrade,
      academic_year: newYear,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت الإضافة", description: `تمت إضافة الفصل ${newClassName}` });
      setNewClassName("");
      setNewSection("");
      fetchData();
    }
  };

  const handleSaveClassEdit = async (id: string) => {
    if (!editingClassName.trim()) return;
    const { error } = await supabase.from("classes").update({
      name: editingClassName,
      grade: editingClassGrade,
      section: editingClassSection,
      academic_year: editingClassYear,
    }).eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التعديل", description: "تم تعديل بيانات الفصل" });
      setEditingClassId(null);
      fetchData();
    }
  };

  const startEditingClass = (cls: ClassRow) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
    setEditingClassGrade(cls.grade);
    setEditingClassSection(cls.section);
    setEditingClassYear(cls.academic_year);
  };

  const handleClassFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

    const columnMap: Record<string, string[]> = {
       name: ["الفصل", "اسم الفصل", "اسم الفصل", "الفصل", "Class", "Name", "name"],
       grade: ["الصف", "المرحلة", "Grade", "grade"],
       section: ["رقم الفصل", "الفصل رقم", "رقم الفصل", "Section", "section"],
    };

    const find = (row: Record<string, any>, keys: string[]): string => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
          return String(row[key]).trim();
        }
      }
      return "";
    };

    const rows = json
      .map((row) => ({
        name: find(row, columnMap.name),
        grade: find(row, columnMap.grade) || newGrade,
        section: find(row, columnMap.section) || "",
      }))
      .filter((r) => r.name);

    setImportedClasses(rows);
    if (classFileRef.current) classFileRef.current.value = "";
  };

  const handleImportClasses = async () => {
    if (importedClasses.length === 0) return;
    setImportingClasses(true);
    const inserts = importedClasses.map((c) => ({
      name: c.name,
      grade: c.grade,
      section: c.section || "1",
      academic_year: newYear,
    }));
    const { error } = await supabase.from("classes").insert(inserts);
    setImportingClasses(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت الإضافة", description: `تم استيراد ${inserts.length} فصل` });
      setImportedClasses([]);
      setImportClassesOpen(false);
      fetchData();
    }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف" });
      fetchData();
    }
  };

  const handleSaveCategories = async () => {
    setSavingCats(true);
    let hasError = false;

    if (catClassFilter === "all") {
      const firstClassId = classes[0]?.id;
      const templateCats = categories.filter((c) => c.class_id === firstClassId);

      for (const tpl of templateCats) {
        const editedVals = editingCats[tpl.id];
        if (!editedVals) continue;
        const originalName = tpl.name;
        const matchingCats = categories.filter((c) => c.name === originalName);
        for (const mc of matchingCats) {
          const updateData: Record<string, any> = { max_score: editedVals.max_score };
          if (editedVals.name && editedVals.name !== originalName) {
            updateData.name = editedVals.name;
          }
          if (editedVals.category_group) {
            updateData.category_group = editedVals.category_group;
          }
          const { error } = await supabase
            .from("grade_categories")
            .update(updateData)
            .eq("id", mc.id);
          if (error) hasError = true;
        }
      }
      if (hasError) {
        toast({ title: "خطأ في الحفظ", variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: "تم تعميم التغييرات على جميع الفصول" });
        fetchData();
      }
    } else {
      const filtered = categories.filter((c) => c.class_id === catClassFilter);
      const updates = filtered.map((cat) => {
        const edited = editingCats[cat.id];
        const updateData: Record<string, any> = { max_score: edited?.max_score ?? cat.max_score };
        if (edited?.name) updateData.name = edited.name;
        if (edited?.category_group) updateData.category_group = edited.category_group;
        return supabase
          .from("grade_categories")
          .update(updateData)
          .eq("id", cat.id);
      });
      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast({ title: "خطأ في الحفظ", variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: "تم تحديث فئات التقييم بنجاح" });
        fetchData();
      }
    }
    setSavingCats(false);
    setEditingCats({});
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatClassId) return;

    if (newCatClassId === "all") {
      // Add to ALL classes
      const inserts = classes.map((cls) => {
        const classCats = categories.filter((c) => c.class_id === cls.id);
        const maxOrder = classCats.length > 0 ? Math.max(...classCats.map((c) => c.sort_order)) : 0;
        return supabase.from("grade_categories").insert({
          name: newCatName,
          weight: newCatWeight,
          max_score: newCatMaxScore,
          class_id: cls.id,
          sort_order: maxOrder + 1,
          category_group: newCatGroup,
        });
      });
      const results = await Promise.all(inserts);
      const hasError = results.some((r) => r.error);
      if (hasError) {
         toast({ title: "خطأ", description: "فشل في الإضافة لبعض الفصول", variant: "destructive" });
       } else {
         toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}" لجميع الفصول` });
      }
    } else {
      const classCats = categories.filter((c) => c.class_id === newCatClassId);
      const maxOrder = classCats.length > 0 ? Math.max(...classCats.map((c) => c.sort_order)) : 0;
      const { error } = await supabase.from("grade_categories").insert({
        name: newCatName,
        weight: newCatWeight,
        max_score: newCatMaxScore,
        class_id: newCatClassId,
        sort_order: maxOrder + 1,
        category_group: newCatGroup,
      });
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تمت الإضافة", description: `تمت إضافة فئة "${newCatName}"` });
      }
    }
    setNewCatName("");
    setNewCatWeight(10);
    setNewCatMaxScore(100);
    setNewCatGroup("classwork");
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (catClassFilter === "all" && cat) {
      // Delete matching category name from ALL classes
      const matchingIds = categories.filter((c) => c.name === cat.name).map((c) => c.id);
      const deletes = matchingIds.map((mid) => supabase.from("grade_categories").delete().eq("id", mid));
      const results = await Promise.all(deletes);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast({ title: "خطأ", description: "فشل حذف بعض الفئات", variant: "destructive" });
      } else {
        toast({ title: "تم الحذف", description: `تم حذف "${cat.name}" من جميع الفصول` });
      }
    } else {
      const { error } = await supabase.from("grade_categories").delete().eq("id", id);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم الحذف" });
      }
    }
    fetchData();
  };

  const handleReorderCategory = async (catId: string, direction: "up" | "down", groupCats: GradeCategory[]) => {
    const idx = groupCats.findIndex(c => c.id === catId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;

    const catA = groupCats[idx];
    const catB = groupCats[swapIdx];

    // Swap sort_order values
    if (catClassFilter === "all") {
      // Apply to all classes by matching name
      const allCatsA = categories.filter(c => c.name === catA.name);
      const allCatsB = categories.filter(c => c.name === catB.name);
      const updates = [
        ...allCatsA.map(c => supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", c.id)),
        ...allCatsB.map(c => supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", c.id)),
      ];
      await Promise.all(updates);
    } else {
      await Promise.all([
        supabase.from("grade_categories").update({ sort_order: catB.sort_order }).eq("id", catA.id),
        supabase.from("grade_categories").update({ sort_order: catA.sort_order }).eq("id", catB.id),
      ]);
    }
    fetchData();
  };

  // Filter categories by selected class
  const [catClassFilter, setCatClassFilter] = useState("all");

  // When "all", show unique categories by name (from first class as template)
  const filteredCategories = catClassFilter === "all"
    ? (() => {
        const firstClassId = classes[0]?.id;
        return firstClassId ? categories.filter((c) => c.class_id === firstClassId) : [];
      })()
    : categories.filter((c) => c.class_id === catClassFilter);

  const getEffectiveGroup = (cat: GradeCategory) => editingCats[cat.id]?.category_group ?? cat.category_group;
  const classworkCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "classwork");
  const examCategories = filteredCategories.filter((c) => getEffectiveGroup(c) === "exams");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">الإعدادات</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "إدارة الفصول وفئات التقييم" : "عرض إحصائيات الفصول والتقييمات"}
          </p>
        </div>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            للاطلاع فقط
          </span>
        )}
      </div>

      <Tabs defaultValue="classes" dir="rtl">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap scrollbar-none">
          <TabsTrigger value="classes" className="gap-1.5">
            <Users className="h-4 w-4" />
             الفصول الدراسية
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            فئات التقييم
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="new-teacher" className="gap-1.5">
                <Plus className="h-4 w-4" />
                إضافة معلم
              </TabsTrigger>
              <TabsTrigger value="letterhead" className="gap-1.5">
                <Printer className="h-4 w-4" />
                ورقة الطباعة
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ===== الفصول ===== */}
        <TabsContent value="classes">
           <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">الفصول الدراسية ({classes.length})</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  {/* Import from Excel */}
                  <Dialog open={importClassesOpen} onOpenChange={(v) => { setImportClassesOpen(v); if (!v) setImportedClasses([]); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Upload className="h-4 w-4" />
                        استيراد من Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5" />
                          استيراد الفصول من ملف Excel
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                          الأعمدة المدعومة: <strong>اسم الفصل</strong> (مطلوب)، الصف، رقم الفصل
                        </div>
                        <div className="space-y-1.5">
                          <Label>ملف Excel أو CSV</Label>
                          <Input ref={classFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleClassFileSelect} className="cursor-pointer" />
                        </div>
                        {importedClasses.length > 0 && (
                          <div className="space-y-2">
                            <Label>معاينة ({importedClasses.length} فصل)</Label>
                            <div className="max-h-[200px] overflow-auto rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                     <TableHead className="text-right">الفصل</TableHead>
                                     <TableHead className="text-right">الصف</TableHead>
                                     <TableHead className="text-right">رقم الفصل</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {importedClasses.map((c, i) => (
                                    <TableRow key={i}>
                                      <TableCell>
                                        <Input
                                          value={c.name}
                                          onChange={(e) => {
                                            const updated = [...importedClasses];
                                            updated[i] = { ...updated[i], name: e.target.value };
                                            setImportedClasses(updated);
                                          }}
                                          className="h-8"
                                        />
                                      </TableCell>
                                      <TableCell>{c.grade}</TableCell>
                                      <TableCell>{c.section || "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        {importedClasses.length > 0 && (
                          <Button onClick={handleImportClasses} disabled={importingClasses}>
                            <Upload className="h-4 w-4 ml-1.5" />
                            {importingClasses ? "جارٍ الاستيراد..." : `استيراد ${importedClasses.length} فصل`}
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {/* Add single class */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                         إضافة فصل
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>إضافة فصل جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>اسم الفصل</Label>
                          <Input placeholder="مثال: أول/6" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>رقم الفصل</Label>
                          <Input placeholder="مثال: 6" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>الصف</Label>
                          <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>العام الدراسي</Label>
                          <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleAddClass}>إضافة</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-right">الفصل</TableHead>
                     <TableHead className="text-right">الصف</TableHead>
                     <TableHead className="text-right">رقم الفصل</TableHead>
                    <TableHead className="text-right">العام الدراسي</TableHead>
                    <TableHead className="text-right">عدد الطلاب</TableHead>
                    {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassName} onChange={(e) => setEditingClassName(e.target.value)} className="h-8 w-32"
                            autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : (
                          <span className={isAdmin ? "cursor-pointer hover:underline" : ""} onClick={() => isAdmin && startEditingClass(cls)}>
                            {cls.name}
                            {isAdmin && <Pencil className="inline h-3 w-3 mr-1 text-muted-foreground" />}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassGrade} onChange={(e) => setEditingClassGrade(e.target.value)} className="h-8 w-28"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.grade}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassSection} onChange={(e) => setEditingClassSection(e.target.value)} className="h-8 w-16"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.section}
                      </TableCell>
                      <TableCell>
                        {isAdmin && editingClassId === cls.id ? (
                          <Input value={editingClassYear} onChange={(e) => setEditingClassYear(e.target.value)} className="h-8 w-24"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveClassEdit(cls.id); if (e.key === "Escape") setEditingClassId(null); }} />
                        ) : cls.academic_year}
                      </TableCell>
                      <TableCell>{cls.studentCount}</TableCell>
                      {isAdmin && (
                        <TableCell className="flex items-center gap-1">
                          {editingClassId === cls.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveClassEdit(cls.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingClassId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                   <AlertDialogTitle>حذف الفصل {cls.name}؟</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     سيتم حذف الفصل وجميع البيانات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteClass(cls.id)}
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== فئات التقييم ===== */}
        <TabsContent value="categories">
           <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">فئات التقييم</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        إضافة فئة تقييم
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>إضافة فئة تقييم جديدة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>الفصل</Label>
                          <Select value={newCatClassId} onValueChange={setNewCatClassId}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الفصل" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">جميع الفصول</SelectItem>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>اسم الفئة</Label>
                          <Input
                            placeholder="مثال: اختبار نهائي"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الدرجة القصوى</Label>
                          <Input
                            type="number"
                            value={newCatMaxScore}
                            onChange={(e) => setNewCatMaxScore(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>القسم</Label>
                          <Select value={newCatGroup} onValueChange={setNewCatGroup}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classwork">📝 المهام الادائية والمشاركة والتفاعل</SelectItem>
                              <SelectItem value="exams">📋 الاختبارات</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleAddCategory} disabled={!newCatName.trim() || !newCatClassId}>
                            إضافة
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSaveCategories}
                    disabled={savingCats}
                  >
                    <Save className="h-4 w-4" />
                    {savingCats ? "جارٍ الحفظ..." : catClassFilter === "all" ? "تعميم على الكل" : "حفظ التغييرات"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">الفصل:</Label>
                <Select value={catClassFilter} onValueChange={setCatClassFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">تعميم على الكل</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Helper to render a category table */}
              {[
                { label: "المهام الادائية والمشاركة والتفاعل", cats: classworkCategories, icon: "📝", groupKey: "classwork", otherGroupKey: "exams", otherGroupLabel: "الاختبارات" },
                { label: "الاختبارات", cats: examCategories, icon: "📋", groupKey: "exams", otherGroupKey: "classwork", otherGroupLabel: "المهام الادائية والمشاركة والتفاعل" },
              ].map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2 px-1">
                    <span>{group.icon}</span>
                    {group.label}
                  </h3>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right">الفئة</TableHead>
                          <TableHead className="text-right">الدرجة القصوى</TableHead>
                          {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.cats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-4">
                              لا توجد فئات في هذا القسم
                            </TableCell>
                          </TableRow>
                        ) : group.cats.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">
                              {isAdmin ? (
                                <Input
                                  value={editingCats[cat.id]?.name ?? cat.name}
                                  onChange={(e) =>
                                    setEditingCats((prev) => ({
                                      ...prev,
                                      [cat.id]: {
                                        ...prev[cat.id],
                                        max_score: prev[cat.id]?.max_score ?? cat.max_score,
                                        weight: prev[cat.id]?.weight ?? cat.weight,
                                        name: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-8 w-40"
                                />
                              ) : (
                                <span>{cat.name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAdmin ? (
                                <Input
                                  type="number"
                                  className="w-24"
                                  value={editingCats[cat.id]?.max_score ?? cat.max_score}
                                  onChange={(e) =>
                                    setEditingCats((prev) => ({
                                      ...prev,
                                      [cat.id]: {
                                        ...prev[cat.id],
                                        name: prev[cat.id]?.name ?? cat.name,
                                        max_score: parseFloat(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <span>{cat.max_score}</span>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {/* Reorder buttons */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => handleReorderCategory(cat.id, "up", group.cats)}
                                    disabled={group.cats.indexOf(cat) === 0}
                                    title="تحريك لأعلى"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => handleReorderCategory(cat.id, "down", group.cats)}
                                    disabled={group.cats.indexOf(cat) === group.cats.length - 1}
                                    title="تحريك لأسفل"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                  {/* Move to other group */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                    onClick={() =>
                                      setEditingCats((prev) => ({
                                        ...prev,
                                        [cat.id]: {
                                          ...prev[cat.id],
                                          max_score: prev[cat.id]?.max_score ?? cat.max_score,
                                          weight: prev[cat.id]?.weight ?? cat.weight,
                                          name: prev[cat.id]?.name ?? cat.name,
                                          category_group: group.otherGroupKey,
                                        },
                                      }))
                                    }
                                    title={`نقل إلى ${group.otherGroupLabel}`}
                                  >
                                    ← {group.otherGroupLabel}
                                  </Button>
                                  {/* Delete */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>حذف فئة "{cat.name}"؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          سيتم حذف هذه الفئة وجميع الدرجات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => handleDeleteCategory(cat.id)}
                                        >
                                          حذف
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ===== إضافة معلم ===== */}
        {isAdmin && (
          <TabsContent value="new-teacher">
             <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">إضافة معلم جديد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    placeholder="اسم المعلم"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                    placeholder="teacher@school.edu.sa"
                    dir="ltr"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهوية الوطنية</Label>
                  <Input
                    value={newTeacherNationalId}
                    onChange={(e) => setNewTeacherNationalId(e.target.value)}
                    placeholder="1XXXXXXXXX"
                    dir="ltr"
                    className="text-right"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    placeholder="كلمة مرور قوية"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الصلاحية</Label>
                  <Select value={newTeacherRole} onValueChange={(v: "admin" | "teacher") => setNewTeacherRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">معلم</SelectItem>
                      <SelectItem value="admin">مدير (صلاحيات كاملة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateTeacher}
                  disabled={creatingTeacher || !newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  {creatingTeacher ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===== ورقة الطباعة ===== */}
        {isAdmin && (
          <TabsContent value="letterhead">
             <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">ورقة الطباعة (الترويسة)</CardTitle>
              </CardHeader>
              <CardContent>
                <PrintHeaderEditor />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ===== أقسام مستقلة ===== */}
      <div className="space-y-6 mt-8">
        {/* ===== الملف الشخصي ===== */}
        <Collapsible defaultOpen>
           <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    الملف الشخصي
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية الوطنية</Label>
              <Input
                value={profileNationalId}
                onChange={(e) => setProfileNationalId(e.target.value)}
                placeholder="1XXXXXXXXX"
                dir="ltr"
                className="text-right"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم لتسجيل الدخول بدلاً من البريد الإلكتروني
              </p>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />
              {savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-base font-semibold">تغيير كلمة المرور</h3>
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newOwnPassword}
                  onChange={(e) => setNewOwnPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={confirmOwnPassword}
                  onChange={(e) => setConfirmOwnPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  dir="ltr"
                />
              </div>
              <Button
                onClick={handleChangeOwnPassword}
                disabled={changingOwnPassword || !currentPassword.trim() || !newOwnPassword.trim() || !confirmOwnPassword.trim()}
                className="gap-1.5"
              >
                <KeyRound className="h-4 w-4" />
                {changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {isAdmin && (
          <>
            {/* ===== كلمات المرور ===== */}
            <Collapsible>
               <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        تغيير كلمة مرور المعلم
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>اختر المعلم</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المعلم" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !selectedTeacher || !newPassword.trim()}
                  className="gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  {changingPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
                </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== مزود SMS ===== */}
            <Collapsible>
               <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        إعدادات مزود خدمة SMS
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>المزود</Label>
                  <Select value={smsProvider} onValueChange={setSmsProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msegat">MSEGAT</SelectItem>
                      <SelectItem value="unifonic">Unifonic</SelectItem>
                      <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {smsProvider === "msegat" && (
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input
                      value={providerUsername}
                      onChange={(e) => setProviderUsername(e.target.value)}
                      placeholder="اسم مستخدم MSEGAT"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    {smsProvider === "msegat" ? "مفتاح API" : smsProvider === "unifonic" ? "App SID" : "Bearer Token"}
                  </Label>
                  <Input
                    type="password"
                    value={providerApiKey}
                    onChange={(e) => setProviderApiKey(e.target.value)}
                    placeholder={smsProvider === "unifonic" ? "App SID" : smsProvider === "taqnyat" ? "Bearer Token" : "API Key"}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>اسم المرسل (Sender ID)</Label>
                  <Input
                    value={providerSender}
                    onChange={(e) => setProviderSender(e.target.value)}
                    placeholder="Sender Name"
                    dir="ltr"
                  />
                  {smsProvider === "unifonic" && (
                    <p className="text-xs text-muted-foreground">اختياري - سيُستخدم الافتراضي إن ترك فارغاً</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveProvider} disabled={savingProvider} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    {savingProvider ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={testingSms || !providerApiKey || !providerSender}
                    className="gap-1.5"
                    onClick={async () => {
                      setTestingSms(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("send-sms", {
                          body: { phone: providerSender, message: "رسالة اختبارية من النظام - Test SMS" },
                        });
                        if (error) {
                          toast({ title: "فشل الاختبار", description: error.message, variant: "destructive" });
                        } else if (data?.success) {
                          toast({ title: "نجح الاختبار ✅", description: "تم إرسال الرسالة الاختبارية بنجاح" });
                        } else {
                          toast({ title: "فشل الاختبار", description: data?.error || "لم يتم الإرسال", variant: "destructive" });
                        }
                      } catch (err: any) {
                        toast({ title: "خطأ", description: err.message, variant: "destructive" });
                      }
                      setTestingSms(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {testingSms ? "جارٍ الاختبار..." : "اختبار الاتصال"}
                  </Button>
                </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ===== صفحة الدخول ===== */}
            <Collapsible>
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        إعدادات صفحة تسجيل الدخول
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 max-w-md">
                {/* School Logo Upload */}
                <div className="space-y-2">
                  <Label>شعار المدرسة</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                      {schoolLogoUrl ? (
                        <img src={schoolLogoUrl} alt="شعار المدرسة" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingLogo(true);
                          const filePath = `school-logo-${Date.now()}.${file.name.split('.').pop()}`;
                          const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
                          if (uploadError) {
                            toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" });
                            setUploadingLogo(false);
                            return;
                          }
                          const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
                          const logoUrl = urlData.publicUrl;
                          await supabase.from("site_settings").upsert({ id: "school_logo_url", value: logoUrl });
                          setSchoolLogoUrl(logoUrl);
                          setUploadingLogo(false);
                          toast({ title: "تم رفع الشعار بنجاح" });
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingLogo}
                        onClick={() => logoInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
                      </Button>
                      {schoolLogoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={async () => {
                            await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" });
                            setSchoolLogoUrl("");
                            toast({ title: "تم إزالة الشعار", description: "سيتم استخدام الشعار الافتراضي" });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          إزالة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>اسم المدرسة</Label>
                  <Input
                    value={loginSchoolName}
                    onChange={(e) => setLoginSchoolName(e.target.value)}
                    placeholder="مثال: ثانوية الفيصلية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف الفرعي</Label>
                  <Input
                    value={loginSubtitle}
                    onChange={(e) => setLoginSubtitle(e.target.value)}
                    placeholder="مثال: نظام إدارة المدرسة"
                  />
                </div>
                <Button
                  disabled={savingLogin}
                  className="gap-1.5"
                  onClick={async () => {
                    setSavingLogin(true);
                    const updates = [
                      supabase.from("site_settings").upsert({ id: "school_name", value: loginSchoolName }),
                      supabase.from("site_settings").upsert({ id: "school_subtitle", value: loginSubtitle }),
                    ];
                    const results = await Promise.all(updates);
                    setSavingLogin(false);
                    if (results.some((r) => r.error)) {
                      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                    } else {
                      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" });
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  {savingLogin ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
}
