import { useState, useEffect, useRef } from "react";
import { FileText, Download, Trash2, Upload, Plus, File, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = ["عام", "شهادات", "مذكرات", "أوراق عمل", "نماذج رسمية", "أدلة إرشادية"];

const categoryColors: Record<string, { color: string; bg: string }> = {
  "عام": { color: "text-primary", bg: "bg-primary/10" },
  "شهادات": { color: "text-warning", bg: "bg-warning/10" },
  "مذكرات": { color: "text-info", bg: "bg-info/10" },
  "أوراق عمل": { color: "text-success", bg: "bg-success/10" },
  "نماذج رسمية": { color: "text-accent", bg: "bg-accent/10" },
  "أدلة إرشادية": { color: "text-primary", bg: "bg-primary/10" },
};

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourceLibraryPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bucketReady, setBucketReady] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("عام");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Ensure bucket exists
  useEffect(() => {
    supabase.functions.invoke("create-library-bucket").then(() => setBucketReady(true));
  }, []);

  // Fetch resources
  const fetchResources = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_resources")
      .select("*")
      .order("created_at", { ascending: false });
    setResources((data as LibraryResource[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast({ title: "يرجى تعبئة العنوان واختيار ملف", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("library")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("library_resources").insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        uploaded_by: (await supabase.auth.getUser()).data.user!.id,
      });

      if (dbError) throw dbError;

      toast({ title: "تم رفع الملف بنجاح" });
      setDialogOpen(false);
      resetForm();
      fetchResources();
    } catch (err: any) {
      toast({ title: "خطأ في الرفع", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resource: LibraryResource) => {
    if (!confirm(`هل تريد حذف "${resource.title}"؟`)) return;
    await supabase.storage.from("library").remove([resource.file_path]);
    await supabase.from("library_resources").delete().eq("id", resource.id);
    toast({ title: "تم حذف الملف" });
    fetchResources();
  };

  const handleDownload = (resource: LibraryResource) => {
    const { data } = supabase.storage.from("library").getPublicUrl(resource.file_path);
    window.open(data.publicUrl, "_blank");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("عام");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مكتبة الموارد</h1>
          <p className="text-sm text-muted-foreground mt-1">ملفات ومستندات تعليمية متاحة للتحميل</p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                رفع ملف
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>رفع ملف جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>عنوان الملف *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مذكرة الفيزياء" />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر (اختياري)" />
                </div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الملف *</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">{selectedFile.name} — {formatFileSize(selectedFile.size)}</p>
                  )}
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "جارٍ الرفع..." : "رفع"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resources.length === 0 ? (
        <Card className="shadow-card border-border/60">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <File className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">لا توجد ملفات في المكتبة بعد</p>
            {isAdmin && <p className="text-xs text-muted-foreground">اضغط على "رفع ملف" لإضافة أول ملف</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => {
            const colors = categoryColors[resource.category] || categoryColors["عام"];
            return (
              <Card key={resource.id} className="shadow-card border-border/60">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className={`${colors.bg} rounded-2xl p-4`}>
                    <FileText className={`h-8 w-8 ${colors.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
                  )}
                  <span className="text-[11px] text-muted-foreground/70">
                    {resource.category} {resource.file_size ? `• ${formatFileSize(resource.file_size)}` : ""}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownload(resource)}>
                      <Download className="h-4 w-4" />
                      تحميل
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(resource)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
