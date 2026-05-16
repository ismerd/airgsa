import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canViewApplication, canViewTender } from "@/lib/auth/permissions";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [applications, tenders] = await Promise.all([listLiveApplications(), listLiveTenders()]);
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));
  const visibleApplications = applications.filter((application) =>
    canViewApplication(session, application, tenderById.get(application.tenderId) ?? null),
  );
  const visibleTenders = tenders.filter((tender) => canViewTender(session, tender));

  return NextResponse.json({
    applications: visibleApplications,
    tenders: visibleTenders,
  });
}
