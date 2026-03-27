import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FooterSignaturesConfig } from "@/components/settings/PrintHeaderEditor";

interface Props {
  reportType: "attendance" | "grades" | "behavior";
}

export default function PrintFooterSignatures({ reportType }: Props) {
  const [signatures, setSignatures] = useState<FooterSignaturesConfig | null>(null);

  useEffect(() => {
    (async () => {
      // Try report-specific config first
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", `print_header_config_${reportType}`)
        .single();

      let config: any = null;
      if (data?.value) {
        try { config = JSON.parse(data.value); } catch {}
      }

      if (!config?.footerSignatures) {
        const { data: def } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "print_header_config")
          .single();
        if (def?.value) {
          try { config = JSON.parse(def.value); } catch {}
        }
      }

      if (config?.footerSignatures?.enabled) {
        setSignatures(config.footerSignatures);
      }
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
