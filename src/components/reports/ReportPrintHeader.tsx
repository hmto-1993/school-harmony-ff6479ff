import { useEffect, useState } from "react";
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";
import { fetchDynamicRightLines } from "@/lib/dynamic-header-lines";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";

interface Props {
  reportType: "attendance" | "grades" | "behavior" | "violations";
}

/**
 * Renders the configured print header for a specific report type.
 * Falls back to the default header if no report-specific config exists.
 * Tenant-scoped: each subscriber sees their own configured header.
 * Only visible in print mode.
 *
 * 🔒 Right-side dynamic data binding (per owner request):
 *   Line 1: "المملكة العربية السعودية" (ثابت)
 *   Line 2: "وزارة التعليم" (ثابت)
 *   Line 3: "الإدارة العامة للتعليم بمنطقة: " + education_department (من إعدادات المشترك)
 *   Line 4: school_name (من إعدادات المشترك)
 * لا يتم تعديل أي خاصية CSS — فقط استبدال محتوى النص.
 */
export default function ReportPrintHeader({ reportType }: Props) {
  const [config, setConfig] = useState<PrintHeaderConfig | null>(null);
  const [rightLines, setRightLines] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      const parsed = await fetchScopedPrintHeader(reportType);
      if (parsed) setConfig(parsed as PrintHeaderConfig);

      // Resolve dynamic right-side values from tenant-scoped site_settings
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let orgId: string | null = null;
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle();
          orgId = (prof?.organization_id as string | null) ?? null;
        }
        const ids = expandScopedSettingIds(["education_department", "school_name"], orgId);
        const { data: rows } = await supabase
          .from("site_settings")
          .select("id, value")
          .in("id", ids);
        const map = resolveScopedSettings(rows as any, orgId);
        const department = (map.get("education_department") || "").trim();
        const schoolName = (map.get("school_name") || "").trim();
        setRightLines([
          "المملكة العربية السعودية",
          "وزارة التعليم",
          department ? `الإدارة العامة للتعليم بمنطقة: ${department}` : "الإدارة العامة للتعليم بمنطقة: ............",
          schoolName || "............",
        ]);
      } catch {
        setRightLines([
          "المملكة العربية السعودية",
          "وزارة التعليم",
          "الإدارة العامة للتعليم بمنطقة: ............",
          "............",
        ]);
      }
    })();
  }, [reportType]);

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

        {/* Left text */}
        <div style={{ flex: "1 1 0%" }}>
          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              marginRight: "auto",
              textAlign: (config.leftSection.align || "left") as any,
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
    </div>
  );
}
