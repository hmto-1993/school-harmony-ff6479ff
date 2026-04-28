import { useEffect, useState } from "react";
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";

interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
  repeat: boolean;
}

interface Props {
  reportType?: string;
}

export default function PrintWatermark({ reportType }: Props) {
  const [wm, setWm] = useState<WatermarkConfig | null>(null);

  useEffect(() => {
    (async () => {
      // Try report-specific first, then default — both already tenant-scoped.
      const parsed =
        (reportType ? await fetchScopedPrintHeader(reportType) : null) ||
        (await fetchScopedPrintHeader());
      if (parsed?.watermark?.enabled) setWm(parsed.watermark);
    })();
  }, [reportType]);

  if (!wm?.enabled || !wm.text) return null;

  return (
    <div
      className="print-watermark"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
        display: "none", // shown only via print CSS
      }}
    >
      {wm.repeat ? (
        <div style={{
          position: "absolute",
          inset: "-100%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: "40px 80px",
          transform: `rotate(${wm.angle}deg)`,
        }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} style={{
              fontSize: `${wm.fontSize}px`,
              color: wm.color,
              opacity: wm.opacity,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}>{wm.text}</span>
          ))}
        </div>
      ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            fontSize: `${wm.fontSize * 1.5}px`,
            color: wm.color,
            opacity: wm.opacity,
            fontWeight: 700,
            transform: `rotate(${wm.angle}deg)`,
          }}>{wm.text}</span>
        </div>
      )}
    </div>
  );
}
