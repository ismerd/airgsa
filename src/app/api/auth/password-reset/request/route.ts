import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Password reset requires Supabase Auth to be configured." },
      { status: 503 },
    );
  }

  const supabase = createSupabaseAuthClient();
  const redirectTo = new URL("/reset-password", req.nextUrl.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
