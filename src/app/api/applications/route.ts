import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [applications, tenders] = await Promise.all([listLiveApplications(), listLiveTenders()]);
  const airlineTenderIds = new Set(
    tenders.filter((tender) => tender.airlineEmail === session.email).map((tender) => tender.id),
  );
  const visibleApplications = session.role === "gsa"
    ? applications.filter((application) => application.gsaName === session.company)
    : applications.filter((application) => airlineTenderIds.has(application.tenderId));
  const visibleTenders = session.role === "gsa"
    ? tenders
    : tenders.filter((tender) => tender.airlineEmail === session.email);

  return NextResponse.json({
    applications: visibleApplications,
    tenders: visibleTenders,
  });
}
