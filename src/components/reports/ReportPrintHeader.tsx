import { useEffect, useState } from "react";
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";
import { fetchDynamicRightLines, fetchDynamicLeftLines } from "@/lib/dynamic-header-lines";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";

interface Props {
  reportType: "attendance" | "grades" | "behavior" | "violations";
  className?: string | null;
  subject?: string | null;
}

/**
 * Renders the configured print header for a specific report type.
 * Tenant-scoped + dynamic right/left side bindings (read-only).
 *
 * 🔒 Right side: المملكة / وزارة التعليم / الإدارة العامة للتعليم بمنطقة <education_department> / <school_name>
 * 🔒 Left  side: السنة الدراسية / الفصل الدراسي / الصف / المادة
 *
 * Layout (flex/justify/align/margin/text-align) is FROZEN — do not modify.
 */
export default function ReportPrintHeader({ reportType, className, subject }: Props) {
  const [config, setConfig] = useState<PrintHeaderConfig | null>(null);
  const [rightLines, setRightLines] = useState<string[] | null>(null);
  const [leftLines, setLeftLines] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      const parsed = await fetchScopedPrintHeader(reportType);
      if (parsed) setConfig(parsed as PrintHeaderConfig);
      const [r, l] = await Promise.all([
        fetchDynamicRightLines(),
        fetchDynamicLeftLines({ className, subject }),
      ]);
      setRightLines(r);
      setLeftLines(l);
    })();
  }, [reportType, className, subject]);

  if (!config) return null;

  // ⚠️ FROZEN LAYOUT — DO NOT MODIFY ⚠️
  // تم تثبيت جميع إعدادات التنسيق والمحاذاة (Positions/Alignment/Flex/Margins)
  // الخاصة بأقسام الترويسة (الأيمن/الأوسط/الأيسر) بناءً على طلب المالك.
  // يُمنع تغيير أي خاصية CSS متعلقة بالتموضع (display/flex/justify/align/margin/text-align)
  // أو إعادة ترتيب الأقسام. القيم الديناميكية القادمة من config (ألوان/أحجام خط/صور) مسموح بها فقط.
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
              textAlign: "right",
              fontSize: `${config.rightSection.fontSize}px`,
              lineHeight: 1.8,
              color: config.rightSection.color || "#1e293b",
            }}
          >
            {(rightLines ?? config.rightSection.lines).map((line, i) => (
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

        {/* Left text — FROZEN: text-align:left, dynamic read-only lines */}
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
            {(leftLines ?? config.leftSection.lines).map((line, i) => (
              <p key={i} style={{ margin: 0, fontWeight: 600, whiteSpace: "nowrap" }}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
