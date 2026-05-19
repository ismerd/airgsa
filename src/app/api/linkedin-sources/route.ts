import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { createLinkedinSource, listLinkedinSources, type LinkedinSourceInput } from "@/lib/services/intelligence-store";

const LINKEDIN_SOURCE_BODY_LIMIT_BYTES = 32 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sources: await listLinkedinSources() });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `linkedin-source-create:${session.email}:${getClientIp(request)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const input = await readJsonWithLimit<LinkedinSourceInput>(request, LINKEDIN_SOURCE_BODY_LIMIT_BYTES);
    const source = await createLinkedinSource(session, input);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message.includes("Admin") ? 403 : 400 });
  }
}
