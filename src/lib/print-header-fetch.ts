/**
 * Centralized fetcher for print header / footer configs.
 * Each subscriber/owner has their OWN scoped settings stored as
 *   org:{organization_id}:print_header_config[_<reportType>]
 * while the global defaults live at the unscoped id.
 *
 * Reading order:
 *   1. org:{orgId}:print_header_config_<reportType>   (per-report, per-tenant)
 *   2. org:{orgId}:print_header_config                (default, per-tenant)
 *   3. print_header_config_<reportType>               (global per-report)
 *   4. print_header_config                            (global default)
 *
 * This guarantees each subscriber's printed reports show THEIR school,
 * teacher and principal — not whatever the primary owner has configured.
 */
import { supabase } from "@/integrations/supabase/client";

let cachedOrgId: string | null | undefined; // undefined = not fetched
let cachedOrgUserId: string | null = null;

async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedOrgId = null;
      cachedOrgUserId = null;
      return null;
    }
    if (cachedOrgId !== undefined && cachedOrgUserId === user.id) return cachedOrgId ?? null;
    const { data } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    cachedOrgId = (data?.organization_id as string | null) ?? null;
    cachedOrgUserId = user.id;
    return cachedOrgId;
  } catch {
    return null;
  }
}

export function clearPrintHeaderOrgCache() {
  cachedOrgId = undefined;
  cachedOrgUserId = null;
}

/** Build the candidate ids for a given report type, in priority order. */
export function buildHeaderCandidateIds(reportType: string | undefined, orgId: string | null): string[] {
  const base = "print_header_config";
  const reportKey = reportType ? `${base}_${reportType}` : base;
  const ids: string[] = [];
  if (orgId) {
    if (reportType) ids.push(`org:${orgId}:${reportKey}`);
    ids.push(`org:${orgId}:${base}`);
  }
  if (reportType) ids.push(reportKey);
  ids.push(base);
  return Array.from(new Set(ids));
}

/**
 * Returns the parsed print-header config for the current user, or null.
 * Falls back from per-report → default; from tenant-scoped → global.
 */
export async function fetchScopedPrintHeader(reportType?: string): Promise<any | null> {
  try {
    const orgId = await getCurrentOrgId();
    const ids = buildHeaderCandidateIds(reportType, orgId);
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ids);
    if (!data || data.length === 0) return null;
    const byId = new Map(data.map((r: any) => [r.id, r.value]));
    for (const id of ids) {
      const v = byId.get(id);
      if (v) {
        try { return JSON.parse(v as string); } catch { /* skip */ }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the scoped id that the CURRENT user should write to for a given report type.
 * (The DB trigger also enforces this on writes, but using the explicit id keeps
 *  reads and writes symmetric and avoids creating duplicate global rows.)
 */
export async function getWriteScopedHeaderId(reportType?: string): Promise<string> {
  const orgId = await getCurrentOrgId();
  const base = reportType ? `print_header_config_${reportType}` : "print_header_config";
  return orgId ? `org:${orgId}:${base}` : base;
}
