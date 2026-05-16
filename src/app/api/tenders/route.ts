import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createLiveTender, listLiveTenders, type TenderCreateInput } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenders = await listLiveTenders();
  const visibleTenders = session.role === "airline"
    ? tenders.filter((tender) => tender.airlineEmail === session.email)
    : tenders.filter((tender) => tender.status === "open");

  return NextResponse.json({
    tenders: visibleTenders,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const input = (await req.json()) as Omit<TenderCreateInput, "airline" | "airlineEmail">;
  const tender = await createLiveTender({
    ...input,
    airline: session.company,
    airlineEmail: session.email,
  });

  return NextResponse.json({ tender }, { status: 201 });
}
