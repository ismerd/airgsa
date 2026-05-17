import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createCampaign, listCampaigns, type CampaignInput } from "@/lib/services/campaign-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ campaigns: await listCampaigns(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const campaign = await createCampaign(session, (await req.json()) as CampaignInput);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
