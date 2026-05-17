import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createLinkedinSource, listLinkedinSources } from "@/lib/services/intelligence-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sources: await listLinkedinSources() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const source = await createLinkedinSource(session, await request.json());
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message.includes("Admin") ? 403 : 400 });
  }
}
