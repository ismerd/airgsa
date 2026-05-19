import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateLinkedinSource, type LinkedinSourceInput } from "@/lib/services/intelligence-store";

type Params = { params: Promise<{ id: string }> };
const LINKEDIN_SOURCE_PATCH_BODY_LIMIT_BYTES = 32 * 1024;

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `linkedin-source-patch:${session.email}:${getClientIp(request)}`,
    limit: 100,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    const input = await readJsonWithLimit<Partial<LinkedinSourceInput>>(request, LINKEDIN_SOURCE_PATCH_BODY_LIMIT_BYTES);
    const source = await updateLinkedinSource(session, id, input);
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message.includes("Admin") ? 403 : 400 });
  }
}
