import { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wrench, RotateCcw, FileDigit, Palette, Type, Hash, CalendarDays, FileText, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PrintHeaderConfig, defaultAdvanced } from "../print-header-types";

interface AdvancedTabProps {
  config: PrintHeaderConfig;
  setConfig: Dispatch<SetStateAction<PrintHeaderConfig>>;
}

export default function AdvancedTab({ config, setConfig }: AdvancedTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <Label className="font-semibold text-sm">إعدادات متقدمة</Label>
              <span className="text-xs text-muted-foreground">(تُطبق على الطباعة والتصدير)</span>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7"
              onClick={() => {
                setConfig((prev) => ({ ...prev, advanced: { ...defaultAdvanced } }));
                toast({ title: "تم", description: "تمت استعادة الإعدادات المتقدمة الافتراضية" });
              }}>
              <RotateCcw className="h-3 w-3" />
              استعادة الافتراضي
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileDigit className="h-3 w-3" />حجم الورقة
              </Label>
              <Select value={config.advanced?.paperSize ?? "A4"}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), paperSize: v as any } }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
                  <SelectItem value="Legal">Legal (216 × 356 mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">جودة التصدير (PNG / PDF)</Label>
              <Select value={config.advanced?.exportQuality ?? "high"}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), exportQuality: v as any } }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">عادية — أصغر حجم</SelectItem>
                  <SelectItem value="high">عالية — متوازنة (افتراضي)</SelectItem>
                  <SelectItem value="max">قصوى — أعلى دقة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">حجم خط الجدول في PDF</Label>
              <div className="flex items-center gap-3">
                <Slider min={8} max={18} step={1} value={[config.advanced?.pdfFontSize ?? 12]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), pdfFontSize: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.advanced?.pdfFontSize ?? 12}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">ارتفاع صف الجدول</Label>
              <div className="flex items-center gap-3">
                <Slider min={18} max={50} step={2} value={[config.advanced?.tableRowHeight ?? 28]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableRowHeight: v } }))}
                  className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{config.advanced?.tableRowHeight ?? 28}px</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" />لون خلفية رأس الجدول
                </Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.advanced?.tableHeaderBg ?? "#eff6ff"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableHeaderBg: e.target.value } }))}
                    className="h-8 w-10 rounded border cursor-pointer" />
                  <span className="text-xs font-mono text-muted-foreground">{config.advanced?.tableHeaderBg ?? "#eff6ff"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Type className="h-3 w-3" />لون نص رأس الجدول
                </Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.advanced?.tableHeaderText ?? "#1e40af"}
                    onChange={(e) => setConfig((prev) => ({ ...prev, advanced: { ...(prev.advanced || defaultAdvanced), tableHeaderText: e.target.value } }))}
                    className="h-8 w-10 rounded border cursor-pointer" />
                  <span className="text-xs font-mono text-muted-foreground">{config.advanced?.tableHeaderText ?? "#1e40af"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Table Preview */}
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <Label className="text-xs text-muted-foreground font-semibold">معاينة حية للجدول</Label>
            <div className="overflow-hidden rounded border bg-background" dir="rtl">
              <table className="w-full border-collapse" style={{ fontSize: `${Math.round((config.advanced?.pdfFontSize ?? 12) * 0.85)}px` }}>
                <thead>
                  <tr style={{ height: `${config.advanced?.tableRowHeight ?? 28}px` }}>
                    {["#", "اسم الطالب", "الفصل", "الدرجة", "الحالة"].map((h, i) => (
                      <th key={i} className={cn("border px-2 font-bold", i === 1 ? "text-right" : "text-center")}
                        style={{ backgroundColor: config.advanced?.tableHeaderBg ?? "#eff6ff", color: config.advanced?.tableHeaderText ?? "#1e40af" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: 1, name: "أحمد محمد العتيبي", cls: "١/أ", grade: "95", status: "ممتاز" },
                    { n: 2, name: "عبدالله سعد الشمري", cls: "١/أ", grade: "88", status: "جيد جداً" },
                    { n: 3, name: "فيصل خالد القحطاني", cls: "١/ب", grade: "76", status: "جيد" },
                  ].map((row, i) => (
                    <tr key={i} style={{ height: `${config.advanced?.tableRowHeight ?? 28}px`, backgroundColor: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td className="border px-2 text-center">{row.n}</td>
                      <td className="border px-2 text-right font-medium">{row.name}</td>
                      <td className="border px-2 text-center">{row.cls}</td>
                      <td className="border px-2 text-center">{row.grade}</td>
                      <td className="border px-2 text-center">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">هذه معاينة تقريبية — النتيجة الفعلية في PDF قد تختلف قليلاً</p>
          </div>

          {/* Toggle options */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground font-semibold">خيارات إضافية</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "showPageNumbers" as const, label: "أرقام الصفحات", icon: Hash, default: true },
                { key: "showDate" as const, label: "تاريخ التقرير", icon: CalendarDays, default: true },
                { key: "showReportTitle" as const, label: "عنوان التقرير", icon: FileText, default: true },
                { key: "headerOnEveryPage" as const, label: "الترويسة في كل صفحة", icon: Copy, default: true },
              ].map(({ key, label, icon: Icon, default: def }) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <Label className="text-sm flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                  <Switch checked={config.advanced?.[key] ?? def}
                    onCheckedChange={(v) => setConfig((prev) => ({
                      ...prev, advanced: { ...(prev.advanced || defaultAdvanced), [key]: v },
                    }))} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
