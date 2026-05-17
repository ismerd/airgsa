import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateLinkedinSource } from "@/lib/services/intelligence-store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const source = await updateLinkedinSource(session, id, await request.json());
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
    return NextResponse.json({ source });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message.includes("Admin") ? 403 : 400 });
  }
}
