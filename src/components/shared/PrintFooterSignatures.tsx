import { useEffect, useState } from "react";
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";
import type { FooterSignaturesConfig } from "@/components/settings/PrintHeaderEditor";

interface Props {
  reportType: "attendance" | "grades" | "behavior";
}

export default function PrintFooterSignatures({ reportType }: Props) {
  const [signatures, setSignatures] = useState<FooterSignaturesConfig | null>(null);

  useEffect(() => {
    (async () => {
      // Tenant-scoped: report-specific → default fallback handled inside fetchScopedPrintHeader
      let config = await fetchScopedPrintHeader(reportType);
      if (!config?.footerSignatures) config = await fetchScopedPrintHeader();
      if (config?.footerSignatures?.enabled) setSignatures(config.footerSignatures);
    })();
  }, [reportType]);

  if (!signatures?.enabled || !signatures.signatures.length) return null;

  return (
    <div className="print-only" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", direction: "rtl", paddingInline: "32px" }}>
        {signatures.signatures.map((sig, i) => (
          <div key={i} style={{ textAlign: "center", minWidth: "120px" }}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>{sig.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#475569" }}>{sig.name || "........................"}</p>
            <div style={{ marginTop: "24px", borderBottom: "1px solid #94a3b8", width: "100px", marginInline: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
