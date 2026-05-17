import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createControlAction,
  listControlActions,
  type ControlActionCreateInput,
} from "@/lib/services/mandate-execution-store";

const SEVERITIES = new Set(["info", "warning", "critical"]);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ controlActions: await listControlActions(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Airline login required" }, { status: 403 });
  }

  const input = (await req.json()) as ControlActionCreateInput;
  if (!input.contractId || !input.title) {
    return NextResponse.json({ error: "Missing control action fields" }, { status: 400 });
  }
  if (input.severity && !SEVERITIES.has(input.severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  try {
    const action = await createControlAction(session, input);
    return NextResponse.json({ controlAction: action }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
