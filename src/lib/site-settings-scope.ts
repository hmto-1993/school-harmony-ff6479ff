export const scopedSettingId = (id: string, organizationId?: string | null) =>
  organizationId ? `org:${organizationId}:${id}` : id;

export function resolveScopedSettings<T extends { id: string; value: string | null }>(
  rows: T[] | null | undefined,
  organizationId?: string | null,
) {
  const map = new Map<string, string | null>();
  (rows || []).forEach((row) => {
    const cleanId = organizationId && row.id.startsWith(`org:${organizationId}:`)
      ? row.id.slice(`org:${organizationId}:`.length)
      : row.id;
    map.set(cleanId, row.value);
  });
  return map;
}

export const expandScopedSettingIds = (ids: string[], organizationId?: string | null) =>
  organizationId ? [...ids, ...ids.map((id) => scopedSettingId(id, organizationId))] : ids;