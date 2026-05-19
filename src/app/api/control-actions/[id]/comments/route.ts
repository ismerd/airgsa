import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import {
  addControlActionComment,
  listControlActionComments,
  type ControlActionCommentInput,
} from "@/lib/services/mandate-execution-store";

const CONTROL_ACTION_COMMENT_BODY_LIMIT_BYTES = 24 * 1024;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const comments = await listControlActionComments(session, (await params).id);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `control-action-comment:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: ControlActionCommentInput;
  try {
    input = await readJsonWithLimit<ControlActionCommentInput>(req, CONTROL_ACTION_COMMENT_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const comment = await addControlActionComment(session, (await params).id, input);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
