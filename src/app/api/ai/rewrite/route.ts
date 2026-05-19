import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { rewriteTextWithGemini } from "@/lib/ai/gemini";

const MAX_TEXT_LENGTH = 5000;
const AI_REWRITE_BODY_LIMIT_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `ai-rewrite:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { text?: unknown; fieldLabel?: unknown; context?: unknown };
  try {
    body = await readJsonWithLimit<{ text?: unknown; fieldLabel?: unknown; context?: unknown }>(req, AI_REWRITE_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.slice(0, 120) : undefined;
  const context = typeof body.context === "string" ? body.context.slice(0, 500) : undefined;

  if (!text && !fieldLabel) {
    return NextResponse.json({ error: "Field label is required when generating text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text must be ${MAX_TEXT_LENGTH} characters or less` }, { status: 400 });
  }

  try {
    const rewrittenText = await rewriteTextWithGemini({ text, fieldLabel, context });
    return NextResponse.json({ text: rewrittenText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text could not be improved";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
