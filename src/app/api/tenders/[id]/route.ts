import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { canDeleteTender, canEditTender, canViewTender } from "@/lib/auth/permissions";
import { deleteLiveTender, getLiveTender, updateLiveTender, type TenderUpdateInput } from "@/lib/services/tender-workflow-store";

const TENDER_PATCH_BODY_LIMIT_BYTES = 128 * 1024;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tender = await getLiveTender(id);
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canViewTender(session, tender)) {
    return NextResponse.json({ error: "Tender not available" }, { status: 404 });
  }

  return NextResponse.json({ tender });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `tender-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const existing = await getLiveTender(id);
  if (!existing) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canEditTender(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let input: TenderUpdateInput;
  try {
    input = await readJsonWithLimit<TenderUpdateInput>(req, TENDER_PATCH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tender = await updateLiveTender(id, input);
  return NextResponse.json({ tender });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `tender-delete:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const existing = await getLiveTender(id);
  if (!existing) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canDeleteTender(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteLiveTender(id);
  return NextResponse.json({ ok: true });
}
