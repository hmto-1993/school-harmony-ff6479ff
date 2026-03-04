import { FileText, Award, Download, BookOpen, ClipboardList, PenTool, Layers, FileCheck, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const resources = [
  { title: "شهادات تقدير", description: "شهادات تقدير للطلاب المتفوقين والمتميزين", icon: Award, color: "text-amber-500" },
  { title: "ملخصات دراسية", description: "ملخصات شاملة لجميع المواد الدراسية", icon: BookOpen, color: "text-primary" },
  { title: "أوراق عمل", description: "أوراق عمل تفاعلية لتعزيز الفهم", icon: ClipboardList, color: "text-emerald-500" },
  { title: "نماذج اختبارات", description: "نماذج اختبارات سابقة للتدريب والمراجعة", icon: FileText, color: "text-violet-500" },
  { title: "خطط الدروس", description: "خطط تحضير الدروس اليومية والأسبوعية", icon: PenTool, color: "text-rose-500" },
  { title: "المناهج الدراسية", description: "نسخ إلكترونية من المناهج المعتمدة", icon: Layers, color: "text-cyan-500" },
  { title: "تقارير الأداء", description: "نماذج تقارير أداء الطلاب الجاهزة", icon: FileCheck, color: "text-orange-500" },
  { title: "أدلة المعلم", description: "أدلة إرشادية للمعلمين والمعلمات", icon: GraduationCap, color: "text-indigo-500" },
];

export default function ResourceLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">مكتبة الموارد</h1>
        <p className="text-sm text-muted-foreground mt-1">تحميل الملفات والموارد التعليمية</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {resources.map((resource) => (
          <Card key={resource.title} className="group relative overflow-hidden border-border/60 hover:shadow-card-hover transition-shadow duration-300">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-muted/40 flex items-center justify-center mt-1">
                <resource.icon className={`h-7 w-7 ${resource.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">{resource.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
              </div>
              <Button size="sm" className="w-full mt-1 gap-2 rounded-xl">
                <Download className="h-4 w-4" />
                تحميل
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
