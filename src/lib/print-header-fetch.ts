/**
 * Centralized fetcher for print header / footer configs.
 *
 * 🔒 SCOPE MODEL (separated owner vs subscribers):
 *   - PRIMARY OWNER (super/primary admin): has a PRIVATE header config that affects
 *     ONLY their own printed reports. Stored at:
 *        owner:print_header_config[_<reportType>]
 *   - GLOBAL TEMPLATE FOR SUBSCRIBERS: maintained ONLY by the primary owner via
 *     a separate "subscribers template" editor. Stored at:
 *        template:print_header_config[_<reportType>]
 *   - SUBSCRIBERS: read-only consumers of the global template. Their previous
 *     per-org overrides at `org:{orgId}:*` are still honored as a higher-priority
 *     fallback so existing customizations don't break, but they have no UI to
 *     modify them anymore. The primary owner's PRIVATE config is NEVER read by
 *     subscribers.
 *
 * Reading order (subscribers):
 *   1. org:{orgId}:print_header_config_<reportType>  (legacy per-tenant override)
 *   2. org:{orgId}:print_header_config               (legacy per-tenant default)
 *   3. template:print_header_config_<reportType>     (owner-managed global template)
 *   4. template:print_header_config                  (owner-managed global default)
 *   5. print_header_config_<reportType>              (legacy global)
 *   6. print_header_config                           (legacy global default)
 *
 * Reading order (primary owner):
 *   1. owner:print_header_config_<reportType>
 *   2. owner:print_header_config
 *   (NO fallback to template/global — owner's private header is independent.)
 */
import { supabase } from "@/integrations/supabase/client";

let cachedOrgId: string | null | undefined; // undefined = not fetched
let cachedOrgUserId: string | null = null;
let cachedIsPrimary: boolean | undefined;

async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedOrgId = null;
      cachedOrgUserId = null;
      cachedIsPrimary = undefined;
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

async function getIsPrimaryOwner(): Promise<boolean> {
  if (cachedIsPrimary !== undefined) return cachedIsPrimary;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { cachedIsPrimary = false; return false; }
    const { data } = await supabase.rpc("is_primary_owner", { _user_id: user.id });
    cachedIsPrimary = data === true;
    return cachedIsPrimary;
  } catch {
    cachedIsPrimary = false;
    return false;
  }
}

export function clearPrintHeaderOrgCache() {
  cachedOrgId = undefined;
  cachedOrgUserId = null;
  cachedIsPrimary = undefined;
}

/** Build the candidate ids for a given report type, in priority order. */
export function buildHeaderCandidateIds(
  reportType: string | undefined,
  orgId: string | null,
  isPrimaryOwner: boolean,
): string[] {
  const base = "print_header_config";
  const reportKey = reportType ? `${base}_${reportType}` : base;
  const ids: string[] = [];

  if (isPrimaryOwner) {
    // Owner reads ONLY from their private namespace.
    if (reportType) ids.push(`owner:${reportKey}`);
    ids.push(`owner:${base}`);
    return Array.from(new Set(ids));
  }

  // Subscribers (and anonymous): legacy per-org → owner's published template → legacy global
  if (orgId) {
    if (reportType) ids.push(`org:${orgId}:${reportKey}`);
    ids.push(`org:${orgId}:${base}`);
  }
  if (reportType) ids.push(`template:${reportKey}`);
  ids.push(`template:${base}`);
  if (reportType) ids.push(reportKey);
  ids.push(base);
  return Array.from(new Set(ids));
}

/**
 * Returns the parsed print-header config for the current user, or null.
 *
 * @param reportType  - optional per-report variant
 * @param scope       - read scope override (used by the editor):
 *                       'auto'      → owner reads owner:*, others read template/org/legacy
 *                       'owner'     → force owner private namespace
 *                       'template'  → force the global subscribers template
 */
export async function fetchScopedPrintHeader(
  reportType?: string,
  scope: "auto" | "owner" | "template" = "auto",
): Promise<any | null> {
  try {
    const orgId = await getCurrentOrgId();
    const isPrimary = await getIsPrimaryOwner();
    const base = "print_header_config";
    const reportKey = reportType ? `${base}_${reportType}` : base;

    let ids: string[];
    if (scope === "owner") {
      ids = reportType ? [`owner:${reportKey}`, `owner:${base}`] : [`owner:${base}`];
    } else if (scope === "template") {
      ids = reportType ? [`template:${reportKey}`, `template:${base}`] : [`template:${base}`];
    } else {
      ids = buildHeaderCandidateIds(reportType, orgId, isPrimary);
    }
    ids = Array.from(new Set(ids));

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
 * Returns the id that the CURRENT user should write to for a given report type.
 *
 * @param reportType  - optional per-report variant
 * @param scope       - 'private' (owner's private header) | 'template' (global subscribers template)
 *                       For non-owners we always fall back to legacy org-scoped ids (rarely used now,
 *                       since subscribers no longer have an editor UI).
 */
export async function getWriteScopedHeaderId(
  reportType?: string,
  scope: "private" | "template" = "private",
): Promise<string> {
  const isPrimary = await getIsPrimaryOwner();
  const base = reportType ? `print_header_config_${reportType}` : "print_header_config";

  if (isPrimary) {
    return scope === "template" ? `template:${base}` : `owner:${base}`;
  }
  // Non-owner fallback (legacy): write to org scope.
  const orgId = await getCurrentOrgId();
  return orgId ? `org:${orgId}:${base}` : base;
}
