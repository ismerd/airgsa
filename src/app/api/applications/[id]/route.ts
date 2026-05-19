import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { canReviewApplication, canViewApplication } from "@/lib/auth/permissions";
import { getLiveApplication, getLiveTender, updateLiveApplicationStatus } from "@/lib/services/tender-workflow-store";
import type { Status } from "@/lib/types";

const ALLOWED = new Set(["pending", "shortlisted", "accepted", "rejected"]);
const APPLICATION_STATUS_BODY_LIMIT_BYTES = 4 * 1024;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await getLiveApplication(id);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const tender = await getLiveTender(application.tenderId);
  if (!tender) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!canViewApplication(session, application, tender)) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `application-review:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { status?: Status };
  try {
    body = await readJsonWithLimit<{ status?: Status }>(req, APPLICATION_STATUS_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { id } = await params;
  const existingApplication = await getLiveApplication(id);
  if (!existingApplication) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const existingTender = await getLiveTender(existingApplication.tenderId);
  if (!canReviewApplication(session, existingApplication, existingTender)) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  let application;
  try {
    application = await updateLiveApplicationStatus(
      id,
      body.status as Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">,
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const tender = await getLiveTender(application.tenderId);
  return NextResponse.json({ application, tender });
}
