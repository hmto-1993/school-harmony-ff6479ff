import { Card, CardContent } from "@/components/ui/card";
import { Globe, School } from "lucide-react";
import { CLASS_COLORS } from "./constants";
import type { ClassInfo } from "./constants";

interface ClassesGridProps {
  classes: ClassInfo[];
  onSelectClass: (classId: string) => void;
}

export function ClassesGrid({ classes, onSelectClass }: ClassesGridProps) {
  const getClassColor = (index: number) => CLASS_COLORS[index % CLASS_COLORS.length];

  if (classes.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <School className="h-14 w-14 text-muted-foreground/30" />
          <p className="text-muted-foreground">لا توجد شعب مسجلة بعد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      <Card
        className="group cursor-pointer border-2 border-amber-500/20 hover:bg-amber-500/15 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
        onClick={() => onSelectClass("__public__")}
      >
        <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Globe className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="font-bold text-foreground text-sm leading-tight">عام</h3>
        </CardContent>
      </Card>
      {classes.map((cls, index) => {
        const color = getClassColor(index);
        return (
          <Card
            key={cls.id}
            className={`group cursor-pointer border-2 ${color.border} ${color.hoverBg} hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden`}
            onClick={() => onSelectClass(cls.id)}
          >
            <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
              <div className={`w-20 h-20 rounded-2xl ${color.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <School className={`h-10 w-10 ${color.icon}`} />
              </div>
              <h3 className="font-bold text-foreground text-sm leading-tight">{cls.grade} / {cls.section}</h3>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
