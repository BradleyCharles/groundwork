import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { logAndRespond } from "@/lib/http/errors";
import { pickAllowed } from "@/lib/validation/pick";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({ display_name: z.string().trim().min(1).max(80) }).strict();

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", user.id)
      .single();
    if (error) return logAndRespond("profile.get", error);
    return NextResponse.json(data);
  } catch (e) {
    return logAndRespond("profile.get", e);
  }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const update = pickAllowed(parsed.data, ["display_name"]);
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return logAndRespond("profile.patch", error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return logAndRespond("profile.patch", e);
  }
}
