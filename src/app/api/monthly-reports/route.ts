import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createMonthlyReport,
  listMonthlyReports,
  type MonthlyReportInput,
} from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ monthlyReports: await listMonthlyReports(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const input = (await req.json()) as MonthlyReportInput;
  if (!input.contractId || !input.period || !input.summary) {
    return NextResponse.json({ error: "Missing monthly report fields" }, { status: 400 });
  }

  try {
    const report = await createMonthlyReport(session, {
      ...input,
      reportedRevenue: Number(input.reportedRevenue ?? 0),
      reportedTonnageKg: Number(input.reportedTonnageKg ?? 0),
      reportedQuotes: Number(input.reportedQuotes ?? 0),
      reportedBookings: Number(input.reportedBookings ?? 0),
    });
    return NextResponse.json({ monthlyReport: report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
