import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { canCreateApplication } from "@/lib/auth/permissions";
import { resolveGsaOperationalProfile } from "@/lib/services/gsa-profile";
import { createLiveApplication, getLiveTender, type ApplicationCreateInput } from "@/lib/services/tender-workflow-store";

const APPLICATION_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const { id } = await params;
  const rateLimited = enforceRateLimit({
    key: `tender-application:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: ApplicationCreateInput;
  try {
    input = await readJsonWithLimit<ApplicationCreateInput>(req, APPLICATION_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tender = await getLiveTender(id);
  if (!tender || !canCreateApplication(session, tender)) {
    return NextResponse.json({ error: "Tender is not open for applications" }, { status: 403 });
  }

  try {
    const profile = await resolveGsaOperationalProfile(session);
    const application = await createLiveApplication(
      id,
      {
        ...session,
        company: profile.name || session.company,
        contactName: profile.contactName,
        headquarters: profile.headquarters,
        coverage: profile.coverage,
        markets: profile.markets,
        certifications: profile.certifications,
        cargoFocus: profile.cargoFocus,
        networkScore: profile.networkScore,
        financialScore: profile.financialScore,
        complianceScore: profile.complianceScore,
        winRate: profile.winRate,
      },
      input,
    );
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
