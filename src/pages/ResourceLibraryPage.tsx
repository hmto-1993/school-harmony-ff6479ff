import { File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ResourceLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">مكتبة الموارد</h1>
        <p className="text-sm text-muted-foreground mt-1">ملفات ومستندات تعليمية متاحة للتحميل</p>
      </div>
      <Card className="shadow-card border-border/60">
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <File className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">المكتبة غير مفعّلة حالياً</p>
        </CardContent>
      </Card>
    </div>
  );
}
