import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const account = await authenticateCredentials(email, password);
    if (!account) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSession(account);
    return NextResponse.json({ role: account.role, company: account.company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
