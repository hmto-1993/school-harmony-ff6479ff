import { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PrintHeaderConfig, defaultMargins, borderColors } from "../print-header-types";

interface FormattingTabProps {
  config: PrintHeaderConfig;
  setConfig: Dispatch<SetStateAction<PrintHeaderConfig>>;
}

export default function FormattingTab({ config, setConfig }: FormattingTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <Label className="font-semibold text-sm">الهوامش والخط الفاصل</Label>
              <span className="text-xs text-muted-foreground">(مشترك بين الطباعة والتصدير)</span>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7"
              onClick={() => {
                setConfig((prev) => ({ ...prev, margins: { ...defaultMargins } }));
                toast({ title: "تم", description: "تمت استعادة إعدادات التنسيق الافتراضية" });
              }}>
              <RotateCcw className="h-3 w-3" />
              استعادة الافتراضي
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">الهامش العلوي (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider min={0} max={30} step={1} value={[config.margins?.top ?? 5]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), top: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.margins?.top ?? 5}mm</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">الهامش الجانبي (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider min={2} max={40} step={1} value={[config.margins?.side ?? 8]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), side: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.margins?.side ?? 8}mm</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">سمك الخط الفاصل (px)</Label>
              <div className="flex items-center gap-3">
                <Slider min={0} max={8} step={0.5} value={[config.margins?.borderWidth ?? 3]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderWidth: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.margins?.borderWidth ?? 3}px</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">مسافة أسفل الخط (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider min={0} max={20} step={1} value={[config.margins?.borderBottomMargin ?? 8]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderBottomMargin: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.margins?.borderBottomMargin ?? 8}mm</span>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">لون الخط الفاصل</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {borderColors.map((color) => (
                  <button key={color} type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderColor: color } }))}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                      (config.margins?.borderColor ?? "#3b82f6") === color ? "border-foreground scale-110 ring-2 ring-primary/30" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input type="color" value={config.margins?.borderColor ?? "#3b82f6"}
                  onChange={(e) => setConfig((prev) => ({ ...prev, margins: { ...(prev.margins || defaultMargins), borderColor: e.target.value } }))}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0" title="لون مخصص" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
