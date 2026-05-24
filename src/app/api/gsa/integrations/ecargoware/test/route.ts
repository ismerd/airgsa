import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { testEcargowareConnection } from "@/lib/integrations/ecargoware-client";
import {
  assertCanManageIntegration,
  getCargoIntegrationRuntimeConfig,
  updateCargoIntegrationTestStatus,
} from "@/lib/services/cargo-integration-store";

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    assertCanManageIntegration(session);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `gsa-integration-ecargoware-test:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const config = await getCargoIntegrationRuntimeConfig(session, "ecargoware");
  if (!config) {
    return NextResponse.json({ error: "Save and enable the eCargoWare/WebCargo integration first." }, { status: 409 });
  }

  const result = await testEcargowareConnection(config);
  const integration = await updateCargoIntegrationTestStatus(
    session,
    "ecargoware",
    result.ok ? "success" : "failed",
    result.message,
  );

  return NextResponse.json({ ...result, integration }, { status: result.ok ? 200 : 502 });
}
