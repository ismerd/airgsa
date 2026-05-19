import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateNewsPost, type NewsPostUpdateInput } from "@/lib/services/intelligence-store";

type Params = { params: Promise<{ id: string }> };
const NEWS_POST_PATCH_BODY_LIMIT_BYTES = 96 * 1024;

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `news-post-patch:${session.email}:${getClientIp(request)}`,
    limit: 100,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    const input = await readJsonWithLimit<NewsPostUpdateInput>(request, NEWS_POST_PATCH_BODY_LIMIT_BYTES);
    const post = await updateNewsPost(session, id, input);
    if (!post) return NextResponse.json({ error: "News post not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
