import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateMonthlyReport, type MonthlyReportUpdateInput } from "@/lib/services/mandate-execution-store";

const STATUSES = new Set(["draft", "submitted", "accepted", "changes-requested", "rejected"]);
const MONTHLY_REPORT_PATCH_BODY_LIMIT_BYTES = 96 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.role === "airline" || session.role === "admin") && (session.accessRole === "operator" || session.accessRole === "viewer")) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `monthly-report-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: MonthlyReportUpdateInput;
  try {
    input = await readJsonWithLimit<MonthlyReportUpdateInput>(req, MONTHLY_REPORT_PATCH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (input.status && !STATUSES.has(input.status)) {
    return NextResponse.json({ error: "Invalid monthly report status" }, { status: 400 });
  }

  try {
    const report = await updateMonthlyReport(session, (await params).id, {
      ...input,
      reportedRevenue: input.reportedRevenue !== undefined ? Number(input.reportedRevenue) : undefined,
      reportedTonnageKg: input.reportedTonnageKg !== undefined ? Number(input.reportedTonnageKg) : undefined,
      reportedQuotes: input.reportedQuotes !== undefined ? Number(input.reportedQuotes) : undefined,
      reportedBookings: input.reportedBookings !== undefined ? Number(input.reportedBookings) : undefined,
    });
    if (!report) return NextResponse.json({ error: "Monthly report not found" }, { status: 404 });
    return NextResponse.json({ monthlyReport: report });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("access") || message.includes("allowed") || message.includes("required") || message.includes("not found") ? 403 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
