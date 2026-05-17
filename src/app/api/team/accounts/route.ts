import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createTeamAccount, listTeamAccounts } from "@/lib/services/team-accounts";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (session.accessRole === "operator") {
    return NextResponse.json({ error: "Operators cannot manage team accounts." }, { status: 403 });
  }

  const accounts = await listTeamAccounts(session.company, session.role);
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (session.accessRole === "operator") {
    return NextResponse.json({ error: "Operators cannot invite employees." }, { status: 403 });
  }

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "Operator";
  const accessRole = body.accessRole === "manager" || body.accessRole === "admin" ? body.accessRole : "operator";

  if (!email || !name || !email.includes("@")) {
    return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
  }

  const account = await createTeamAccount({
    email,
    name,
    title,
    accessRole,
    role: session.role,
    company: session.company,
  });

  return NextResponse.json({ account });
}
