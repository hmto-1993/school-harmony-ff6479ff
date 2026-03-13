import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Trash2, Link, Clock, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { days: 1, label: "يوم واحد" },
  { days: 3, label: "3 أيام" },
  { days: 7, label: "أسبوع" },
  { days: 30, label: "شهر" },
];

interface ShareLink {
  id: string;
  token: string;
  class_ids: string[];
  expires_at: string;
  can_print: boolean;
  can_export: boolean;
  label: string;
  created_at: string;
  view_count: number;
  last_viewed_at: string | null;
}

export default function ShareDialog() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [expiryDays, setExpiryDays] = useState(7);
  const [canPrint, setCanPrint] = useState(true);
  const [canExport, setCanExport] = useState(true);
  const [shareLabel, setShareLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeLinks, setActiveLinks] = useState<ShareLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    loadData();
  }, [open, user]);

  const loadData = async () => {
    if (!user) return;

    // Load teacher's classes
    if (role === "admin") {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      setClasses(data || []);
    } else {
      const { data } = await supabase.from("teacher_classes").select("class_id, classes(id, name)").eq("teacher_id", user.id);
      setClasses((data || []).map((tc: any) => ({ id: tc.classes.id, name: tc.classes.name })));
    }

    // Load active share links
    const { data: links } = await supabase
      .from("shared_views")
      .select("*")
      .eq("teacher_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setActiveLinks((links as ShareLink[]) || []);
  };

  const handleCreate = async () => {
    if (!user || selectedClasses.length === 0) {
      toast.error("اختر فصلاً واحداً على الأقل");
      return;
    }
    setCreating(true);
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    const { data, error } = await supabase.from("shared_views").insert({
      teacher_id: user.id,
      class_ids: selectedClasses,
      expires_at: expiresAt,
      can_print: canPrint,
      can_export: canExport,
      label: shareLabel,
    } as any).select().single();

    if (error) {
      toast.error("فشل إنشاء رابط المشاركة");
    } else {
      toast.success("تم إنشاء رابط المشاركة");
      setSelectedClasses([]);
      setShareLabel("");
      loadData();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("shared_views").delete().eq("id", id);
    toast.success("تم حذف الرابط");
    loadData();
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("تم نسخ الرابط");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) => prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]);
  };

  const selectAll = () => {
    if (selectedClasses.length === classes.length) setSelectedClasses([]);
    else setSelectedClasses(classes.map((c) => c.id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-4 w-4" /> مشاركة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" /> مشاركة العرض مع المدير
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Label */}
          <div>
            <Label className="text-sm font-medium">وصف الرابط (اختياري)</Label>
            <Input
              placeholder="مثال: عرض درجات الفصل الأول"
              value={shareLabel}
              onChange={(e) => setShareLabel(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Classes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">اختر الفصول</Label>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {selectedClasses.length === classes.length ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm",
                    selectedClasses.includes(cls.id) ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <Checkbox checked={selectedClasses.includes(cls.id)} onCheckedChange={() => toggleClass(cls.id)} />
                  <span className="font-medium">{cls.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <Label className="text-sm font-medium mb-2 block">مدة الصلاحية</Label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setExpiryDays(opt.days)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all",
                    expiryDays === opt.days ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">الصلاحيات</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">السماح بالطباعة</span>
              <Switch checked={canPrint} onCheckedChange={setCanPrint} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">السماح بالتصدير</span>
              <Switch checked={canExport} onCheckedChange={setCanExport} />
            </div>
          </div>

          {/* Create Button */}
          <Button onClick={handleCreate} disabled={creating || selectedClasses.length === 0} className="w-full gap-2">
            <Link className="h-4 w-4" />
            {creating ? "جاري الإنشاء..." : "إنشاء رابط المشاركة"}
          </Button>

          {/* Active Links */}
          {activeLinks.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">الروابط النشطة ({activeLinks.length})</h3>
              {activeLinks.map((link) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(link.expires_at).getTime() - Date.now()) / 86400000));
                const hasViews = link.view_count > 0;
                return (
                  <div key={link.id} className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">{link.label || "رابط مشاركة"}</span>
                      <div className="flex items-center gap-2">
                        {hasViews && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                            👁 {link.view_count}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{daysLeft} يوم</span>
                        </div>
                      </div>
                    </div>
                    {link.last_viewed_at && (
                      <p className="text-[11px] text-muted-foreground">
                        آخر مشاهدة: {new Date(link.last_viewed_at).toLocaleString("ar-SA")}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => copyLink(link.token, link.id)}>
                        {copiedId === link.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedId === link.id ? "تم النسخ" : "نسخ الرابط"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(link.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
