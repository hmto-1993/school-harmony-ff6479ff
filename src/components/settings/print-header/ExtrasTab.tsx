import { Dispatch, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Droplets, Palette, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PrintHeaderConfig, defaultWatermark, defaultFooterSignatures } from "../print-header-types";

interface ExtrasTabProps {
  config: PrintHeaderConfig;
  setConfig: Dispatch<SetStateAction<PrintHeaderConfig>>;
}

const watermarkColors = ["#94a3b8", "#64748b", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#1e293b"];

export default function ExtrasTab({ config, setConfig }: ExtrasTabProps) {
  return (
    <div className="space-y-4">
      {/* Watermark */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 font-semibold text-sm">
              <Droplets className="h-4 w-4" />
              العلامة المائية
            </Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    watermark: { ...defaultWatermark },
                    footerSignatures: { ...defaultFooterSignatures, signatures: defaultFooterSignatures.signatures.map(s => ({ ...s })) },
                  }));
                  toast({ title: "تم", description: "تمت استعادة إعدادات الإضافات الافتراضية" });
                }}>
                <RotateCcw className="h-3 w-3" />
                استعادة الافتراضي
              </Button>
              <Switch
                checked={config.watermark?.enabled || false}
                onCheckedChange={(v) => setConfig((prev) => ({
                  ...prev, watermark: { ...(prev.watermark || defaultWatermark), enabled: v },
                }))}
              />
            </div>
          </div>
          {config.watermark?.enabled && (
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">نص العلامة المائية</Label>
                <Input value={config.watermark.text}
                  onChange={(e) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, text: e.target.value } }))}
                  className="h-8 text-sm" dir="rtl" placeholder="مثال: سري، مسودة، نسخة..." />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">حجم الخط:</Label>
                <Slider min={20} max={80} step={2} value={[config.watermark.fontSize]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, fontSize: v } }))}
                  className="flex-1 min-w-[100px]" />
                <span className="text-xs font-mono w-8 text-center">{config.watermark.fontSize}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">الشفافية:</Label>
                <Slider min={0.02} max={0.3} step={0.01} value={[config.watermark.opacity]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, opacity: v } }))}
                  className="flex-1 min-w-[100px]" />
                <span className="text-xs font-mono w-8 text-center">{Math.round(config.watermark.opacity * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">الزاوية:</Label>
                <Slider min={-90} max={90} step={5} value={[config.watermark.angle]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, angle: v } }))}
                  className="flex-1 min-w-[100px]" />
                <span className="text-xs font-mono w-8 text-center">{config.watermark.angle}°</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground">تكرار:</Label>
                <Switch checked={config.watermark.repeat}
                  onCheckedChange={(v) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, repeat: v } }))} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" />اللون:</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {watermarkColors.map((c) => (
                    <button key={c} type="button"
                      className={`w-5 h-5 rounded-full border-2 transition-all ${config.watermark?.color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, color: c } }))}
                    />
                  ))}
                  <Input type="color" value={config.watermark.color}
                    onChange={(e) => setConfig((prev) => ({ ...prev, watermark: { ...prev.watermark!, color: e.target.value } }))}
                    className="w-7 h-7 p-0 border-0 cursor-pointer rounded" title="لون مخصص" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Signatures */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 font-semibold text-sm">✍️ توقيعات نهاية الجدول</Label>
            <Switch
              checked={config.footerSignatures?.enabled || false}
              onCheckedChange={(v) => setConfig((prev) => ({
                ...prev, footerSignatures: { ...(prev.footerSignatures || defaultFooterSignatures), enabled: v },
              }))}
            />
          </div>
          {config.footerSignatures?.enabled && (
            <div className="space-y-3 pt-2 border-t">
              {config.footerSignatures.signatures.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 border rounded-lg p-2.5">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap w-14">المسمى:</Label>
                      <Input value={sig.label}
                        onChange={(e) => setConfig((prev) => {
                          const sigs = [...(prev.footerSignatures?.signatures || [])];
                          sigs[i] = { ...sigs[i], label: e.target.value };
                          return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                        })}
                        className="h-8 text-sm" dir="rtl" placeholder="مثال: معلم المادة" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap w-14">الاسم:</Label>
                      <Input value={sig.name}
                        onChange={(e) => setConfig((prev) => {
                          const sigs = [...(prev.footerSignatures?.signatures || [])];
                          sigs[i] = { ...sigs[i], name: e.target.value };
                          return { ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: sigs } };
                        })}
                        className="h-8 text-sm" dir="rtl" placeholder="اسم الشخص (اختياري)" />
                    </div>
                  </div>
                  {config.footerSignatures!.signatures.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setConfig((prev) => ({
                        ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: prev.footerSignatures!.signatures.filter((_, idx) => idx !== i) },
                      }))}
                    ><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs w-full"
                onClick={() => setConfig((prev) => ({
                  ...prev, footerSignatures: { ...prev.footerSignatures!, signatures: [...prev.footerSignatures!.signatures, { label: "التوقيع", name: "" }] },
                }))}
              ><Plus className="h-3 w-3" />إضافة توقيع</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
