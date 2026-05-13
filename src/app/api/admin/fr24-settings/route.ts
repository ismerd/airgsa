import { NextRequest, NextResponse } from "next/server";
import { getFr24Settings, setFr24Enabled } from "@/lib/services/fr24-settings";

export async function GET() {
  const settings = await getFr24Settings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { enabled?: unknown };

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const settings = await setFr24Enabled(body.enabled);
  return NextResponse.json(settings);
}
