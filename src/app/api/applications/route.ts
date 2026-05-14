import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [applications, tenders] = await Promise.all([listLiveApplications(), listLiveTenders()]);
  return NextResponse.json({
    applications: session.role === "gsa"
      ? applications.filter((application) => application.gsaName === session.company)
      : applications,
    tenders,
  });
}
