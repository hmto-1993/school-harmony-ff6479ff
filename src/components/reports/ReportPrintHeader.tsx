import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";

interface Props {
  reportType: "attendance" | "grades" | "behavior";
}

/**
 * Renders the configured print header for a specific report type.
 * Falls back to the default header if no report-specific config exists.
 * Only visible in print mode.
 */
export default function ReportPrintHeader({ reportType }: Props) {
  const [config, setConfig] = useState<PrintHeaderConfig | null>(null);

  useEffect(() => {
    (async () => {
      // Try report-specific first
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", `print_header_config_${reportType}`)
        .single();

      if (data?.value) {
        try { setConfig(JSON.parse(data.value)); return; } catch {}
      }

      // Fallback to default
      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();

      if (def?.value) {
        try { setConfig(JSON.parse(def.value)); } catch {}
      }
    })();
  }, [reportType]);

  if (!config) return null;

  return (
    <div
      className="hidden print:block mb-6"
      dir="rtl"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      <div
        style={{
          borderBottom: "3px solid #3b82f6",
          paddingBottom: "12px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        {/* Right text */}
        <div
          style={{
            flex: 1,
            fontSize: `${config.rightSection.fontSize}px`,
            lineHeight: 1.8,
            color: config.rightSection.color || "#1e293b",
            display: "flex",
            flexDirection: "column",
            alignItems: config.rightSection.align === "center" ? "center" : config.rightSection.align === "left" ? "flex-start" : "flex-end",
          }}
        >
          {config.rightSection.lines.map((line, i) => (
            <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line}</p>
          ))}
        </div>

        {/* Center images */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {config.centerSection.images.map((img, i) =>
            img ? (
              <img
                key={i}
                src={img}
                alt=""
                style={{
                  width: `${config.centerSection.imagesSizes[i] || 60}px`,
                  height: `${config.centerSection.imagesSizes[i] || 60}px`,
                  objectFit: "contain",
                }}
              />
            ) : null
          )}
        </div>

        {/* Left text */}
        <div
          style={{
            flex: 1,
            textAlign: config.leftSection.align,
            fontSize: `${config.leftSection.fontSize}px`,
            lineHeight: 1.8,
            color: config.leftSection.color || "#1e293b",
          }}
        >
          {config.leftSection.lines.map((line, i) => (
            <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
