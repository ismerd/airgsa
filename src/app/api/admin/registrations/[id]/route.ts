import { NextRequest, NextResponse } from "next/server";
import { updateRegistrationStatus } from "@/lib/registrations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action, note } = (await req.json()) as {
    action: "approve" | "reject";
    note?: string;
  };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const updated = updateRegistrationStatus(
    id,
    action === "approve" ? "approved" : "rejected",
    note
  );

  if (!updated) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
