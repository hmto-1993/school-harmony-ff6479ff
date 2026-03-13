import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      // Try report-specific first
      if (reportType) {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", `print_header_config_${reportType}`)
          .single();
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed.watermark?.enabled) { setWm(parsed.watermark); return; }
          } catch {}
        }
      }
      // Fallback to default
      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (def?.value) {
        try {
          const parsed = JSON.parse(def.value);
          if (parsed.watermark?.enabled) setWm(parsed.watermark);
        } catch {}
      }
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
