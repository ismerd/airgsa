import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { seedSalesDemoFlow } from "@/lib/services/demo-seed";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_WORKFLOW_SEED !== "true") {
    return NextResponse.json({ error: "Workflow seed is disabled in production" }, { status: 404 });
  }

  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin login required" }, { status: 403 });
  }

  try {
    const result = await seedSalesDemoFlow(session);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
