import { RefObject } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Image as ImageIcon } from "lucide-react";
import { PrintHeaderConfig } from "../print-header-types";

interface HeaderPreviewProps {
  config: PrintHeaderConfig;
  previewRef: RefObject<HTMLDivElement>;
  exporting: boolean;
  onExportPng: () => void;
}

export default function HeaderPreview({ config, previewRef, exporting, onExportPng }: HeaderPreviewProps) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground">معاينة مباشرة (مشتركة للطباعة والتصدير)</Label>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onExportPng} disabled={exporting}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "جارٍ..." : "تصدير PNG"}
          </Button>
        </div>
        <div
          ref={previewRef}
          dir="rtl"
          className="border rounded-lg bg-white relative overflow-hidden mx-auto shadow-sm"
          style={{
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            width: "100%",
            maxWidth: "480px",
            minHeight: "300px",
            aspectRatio: "210 / 297",
            paddingTop: `${(config.margins?.top ?? 5) * 2}px`,
            paddingLeft: `${(config.margins?.side ?? 8) * 2}px`,
            paddingRight: `${(config.margins?.side ?? 8) * 2}px`,
            paddingBottom: "16px",
          }}
        >
          {/* Watermark */}
          {config.watermark?.enabled && config.watermark.text && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: config.watermark.repeat ? "stretch" : "center", justifyContent: "center", pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
              {config.watermark.repeat ? (
                <div style={{ position: "absolute", inset: "-100%", display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "30px 60px", transform: `rotate(${config.watermark.angle}deg)` }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} style={{ fontSize: `${config.watermark!.fontSize * 0.35}px`, color: config.watermark!.color, opacity: config.watermark!.opacity, fontWeight: 700, whiteSpace: "nowrap" }}>{config.watermark!.text}</span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: `${config.watermark.fontSize * 0.4}px`, color: config.watermark.color, opacity: config.watermark.opacity, fontWeight: 700, transform: `rotate(${config.watermark.angle}deg)` }}>{config.watermark.text}</span>
              )}
            </div>
          )}
          {/* Header sections */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px",
            position: "relative", zIndex: 2, paddingBottom: "6px",
            borderBottom: `${config.margins?.borderWidth ?? 3}px solid ${config.margins?.borderColor ?? "#3b82f6"}`,
            marginBottom: `${(config.margins?.borderBottomMargin ?? 8) * 2}px`,
          }}>
            {/* Right section */}
            <div style={{ flex: "1 1 0%" }}>
              <div style={{ width: "fit-content", maxWidth: "100%", marginLeft: "auto", textAlign: config.rightSection.align || "right", fontSize: `${config.rightSection.fontSize * 0.8}px`, lineHeight: 1.8, color: config.rightSection.color || "#1e293b" }}>
                {config.rightSection.lines.map((line, i) => (
                  <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" style={{ margin: "0 auto" }}>
              {config.centerSection.images.map((img, i) => (
                <div key={i}>
                  {img ? (
                    <img src={img} alt={`شعار ${i + 1}`} style={{ width: `${((config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60) * 0.7}px`, height: `${(config.centerSection.imagesSizes[i] || 60) * 0.7}px`, objectFit: "contain" }} />
                  ) : (
                    <div className="border-2 border-dashed rounded flex items-center justify-center bg-muted/30" style={{ width: `${((config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i]) || 60) * 0.7}px`, height: `${(config.centerSection.imagesSizes[i] || 60) * 0.7}px` }}>
                      <ImageIcon className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Left section */}
            <div style={{ flex: "1 1 0%" }}>
              <div style={{ width: "fit-content", maxWidth: "100%", marginRight: "auto", textAlign: config.leftSection.align || "left", fontSize: `${config.leftSection.fontSize * 0.8}px`, lineHeight: 1.8, color: config.leftSection.color || "#1e293b" }}>
                {config.leftSection.lines.map((line, i) => (
                  <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          </div>
          {/* Placeholder content */}
          <div style={{ position: "relative", zIndex: 2, marginTop: "12px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: "8px", background: "#f1f5f9", borderRadius: "3px", marginBottom: "6px", width: `${90 - i * 5}%` }} />
            ))}
          </div>
          {/* Footer signatures */}
          {config.footerSignatures?.enabled && config.footerSignatures.signatures.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", marginTop: "auto", paddingTop: "12px", borderTop: "1px dashed #cbd5e1", position: "absolute", bottom: "16px", left: `${(config.margins?.side ?? 8) * 2}px`, right: `${(config.margins?.side ?? 8) * 2}px`, zIndex: 2 }}>
              {config.footerSignatures.signatures.map((sig, i) => (
                <div key={i} style={{ textAlign: "center", minWidth: "80px" }}>
                  <p style={{ margin: 0, fontSize: "9px", fontWeight: 600, color: "#1e293b" }}>{sig.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#475569" }}>{sig.name || "............"}</p>
                  <div style={{ marginTop: "14px", borderBottom: "1px solid #94a3b8", width: "70px", marginInline: "auto" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
