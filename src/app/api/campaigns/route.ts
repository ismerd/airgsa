import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { createCampaign, listCampaigns, type CampaignInput } from "@/lib/services/campaign-store";

const CAMPAIGN_BODY_LIMIT_BYTES = 128 * 1024;

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

  const rateLimited = enforceRateLimit({
    key: `campaign-create:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const input = await readJsonWithLimit<CampaignInput>(req, CAMPAIGN_BODY_LIMIT_BYTES);
    const campaign = await createCampaign(session, input);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
