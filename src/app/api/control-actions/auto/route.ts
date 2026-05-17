import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createRecommendedControlActions } from "@/lib/services/mandate-execution-store";

export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Airline login required" }, { status: 403 });
  }

  try {
    const controlActions = await createRecommendedControlActions(session);
    return NextResponse.json({ controlActions, created: controlActions.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
