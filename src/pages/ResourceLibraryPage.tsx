import { BookOpen, FileText, Award, Download, ClipboardList, Notebook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const resources = [
  {
    title: "شهادات التقدير",
    description: "نماذج شهادات تقدير جاهزة للطباعة",
    icon: Award,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "المذكرات الدراسية",
    description: "ملخصات ومذكرات لجميع المواد",
    icon: Notebook,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "أوراق العمل",
    description: "أوراق عمل تفاعلية للطلاب",
    icon: ClipboardList,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "النماذج الرسمية",
    description: "نماذج إدارية ورسمية معتمدة",
    icon: FileText,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "الأدلة الإرشادية",
    description: "أدلة ومراجع للمعلمين والطلاب",
    icon: BookOpen,
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

export default function ResourceLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">مكتبة الموارد</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ملفات ومستندات تعليمية متاحة للتحميل
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.title} className="shadow-card border-border/60">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className={`${resource.bgColor} rounded-2xl p-4`}>
                <resource.icon className={`h-8 w-8 ${resource.color}`} />
              </div>
              <h3 className="font-semibold text-foreground">{resource.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {resource.description}
              </p>
              <Button variant="outline" size="sm" className="mt-1 gap-2">
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
