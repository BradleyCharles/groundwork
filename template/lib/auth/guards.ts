import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AuthedUser = { id: string; role: string | null };
type GuardResult =
  { user: AuthedUser; response?: undefined } | { user?: undefined; response: NextResponse };

/** Identity check via getClaims(). Roles come from app_metadata only, which users cannot edit. */
export async function requireUser(): Promise<GuardResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const appMeta = claims.app_metadata as { role?: unknown } | undefined;
  const role = typeof appMeta?.role === "string" ? appMeta.role : null;
  return { user: { id: claims.sub, role } };
}

export async function requireRole(roles: readonly string[]): Promise<GuardResult> {
  const result = await requireUser();
  if (result.response) return result;
  if (!result.user.role || !roles.includes(result.user.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
