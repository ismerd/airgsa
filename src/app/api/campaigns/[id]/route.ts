import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateCampaign, type CampaignUpdateInput } from "@/lib/services/campaign-store";

const CAMPAIGN_PATCH_BODY_LIMIT_BYTES = 128 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `campaign-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const input = await readJsonWithLimit<CampaignUpdateInput>(req, CAMPAIGN_PATCH_BODY_LIMIT_BYTES);
    const campaign = await updateCampaign(session, (await params).id, input);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
