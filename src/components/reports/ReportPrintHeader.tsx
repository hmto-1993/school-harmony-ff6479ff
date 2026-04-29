import { useEffect, useState } from "react";
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import { useDynamicLeftHeader, buildLeftHeaderLines } from "@/hooks/useDynamicLeftHeader";
import { useDynamicRightHeader, buildRightHeaderLines } from "@/hooks/useDynamicRightHeader";

interface Props {
  reportType: "attendance" | "grades" | "behavior" | "violations";
}

/**
 * Renders the configured print header for a specific report type.
 * Falls back to the default header if no report-specific config exists.
 * Tenant-scoped: each subscriber sees their own configured header.
 * Only visible in print mode.
 */
export default function ReportPrintHeader({ reportType }: Props) {
  const [config, setConfig] = useState<PrintHeaderConfig | null>(null);
  const dyn = useDynamicLeftHeader();
  const dynRight = useDynamicRightHeader();

  useEffect(() => {
    (async () => {
      const parsed = await fetchScopedPrintHeader(reportType);
      if (parsed) setConfig(parsed as PrintHeaderConfig);
    })();
  }, [reportType]);

  if (!config) return null;

  return (
    <div
      className="print-only mb-1"
      dir="rtl"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      <div
        style={{
          borderBottom: `${config.margins?.borderWidth ?? 3}px solid ${config.margins?.borderColor ?? "#3b82f6"}`,
          paddingBottom: "6px",
          marginBottom: `${config.margins?.borderBottomMargin ?? 8}mm`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        {/* Right text */}
        <div style={{ flex: "1 1 0%" }}>
          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              marginLeft: "auto",
              textAlign: (config.rightSection.align || "right") as any,
              fontSize: `${config.rightSection.fontSize}px`,
              lineHeight: 1.8,
              color: config.rightSection.color || "#1e293b",
            }}
          >
            {config.rightSection.lines.map((line, i) => (
              <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
            ))}
          </div>
        </div>

        {/* Center images */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, margin: "0 auto" }}>
          {config.centerSection.images.map((img, i) =>
            img ? (
              <img
                key={i}
                src={img}
                alt=""
                style={{
                  width: `${config.centerSection.imagesWidths?.[i] ?? config.centerSection.imagesSizes[i] ?? 60}px`,
                  height: `${config.centerSection.imagesSizes[i] || 60}px`,
                  objectFit: "contain",
                }}
              />
            ) : null
          )}
        </div>

        {/* Left text — auto-populated dynamic data (Year / Semester / Grade / Subject) */}
        <div style={{ flex: "1 1 0%" }}>
          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              marginRight: "auto",
              textAlign: "left",
              fontSize: `${config.leftSection.fontSize}px`,
              lineHeight: 1.8,
              color: config.leftSection.color || "#1e293b",
            }}
          >
            {buildLeftHeaderLines(dyn).map((row, i) => (
              <p key={i} style={{ margin: 0 }}>
                <span style={{ fontWeight: 700 }}>{row.label}:</span>{" "}
                <span style={{ fontWeight: 500 }}>{row.value}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
