import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateMonthlyReport, type MonthlyReportUpdateInput } from "@/lib/services/mandate-execution-store";

const STATUSES = new Set(["draft", "submitted", "accepted", "changes-requested", "rejected"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = (await req.json()) as MonthlyReportUpdateInput;
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
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
