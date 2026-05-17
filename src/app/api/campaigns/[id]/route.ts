import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateCampaign, type CampaignUpdateInput } from "@/lib/services/campaign-store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const campaign = await updateCampaign(session, (await params).id, (await req.json()) as CampaignUpdateInput);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
