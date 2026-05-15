import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLiveApplication, getLiveTender, updateLiveApplicationStatus } from "@/lib/services/tender-workflow-store";
import type { Status } from "@/lib/types";

const ALLOWED = new Set(["pending", "shortlisted", "accepted", "rejected"]);

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await getLiveApplication(id);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (session.role === "gsa" && application.gsaName !== session.company) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const body = (await req.json()) as { status?: Status };
  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { id } = await params;
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
