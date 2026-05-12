import { NextRequest, NextResponse } from "next/server";
import { validateCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const account = validateCredentials(email, password);
  if (!account) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(account);
  return NextResponse.json({ role: account.role, company: account.company });
}
