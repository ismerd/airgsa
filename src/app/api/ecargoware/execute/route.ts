import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { executeEcargowareOperation, type EcargowareExecuteInput } from "@/lib/integrations/ecargoware-client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "gsa") {
    return NextResponse.json({ error: "Only signed-in GSA users can use the cargo workspace." }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as EcargowareExecuteInput;
    if (!payload.operationId) {
      return NextResponse.json({ error: "operationId is required." }, { status: 400 });
    }

    const result = await executeEcargowareOperation(payload);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "eCargoWare request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
