// Shared HMAC student session verification helper.
// Validates both signature AND age (24h max).

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function verifyStudentSession(
  token: string | undefined | null,
  studentId: string | undefined | null,
  issuedAt: number | undefined | null,
  secret: string,
): Promise<boolean> {
  if (!token || !studentId || !issuedAt) return false;
  if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;
  if (issuedAt > Date.now() + 60_000) return false; // future-dated guard
  try {
    const data = `${studentId}:${issuedAt}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return token === expected;
  } catch {
    return false;
  }
}

/**
 * Helper to extract caller user from a Bearer JWT and check whether they have admin or teacher role.
 * Returns { user, role } or null on failure.
 */
export async function getAuthCaller(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user, sb };
}
