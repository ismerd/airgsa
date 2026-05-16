import { NextRequest, NextResponse } from "next/server";
import { getAllRegistrations, updateRegistrationStatus } from "@/lib/registrations";
import { provisionApprovedRegistration } from "@/lib/auth/account-provisioning";

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

  const current = getAllRegistrations().find((registration) => registration.id === id);
  if (!current) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  let provisioningNote = "";
  if (action === "approve") {
    try {
      const result = await provisionApprovedRegistration(current);
      if (result.enabled) {
        provisioningNote = result.invited
          ? `Supabase invite sent. User ${result.userId}, company ${result.companyId}.`
          : `Existing Supabase user linked. User ${result.userId}, company ${result.companyId}.`;
      } else {
        provisioningNote = "Supabase is not configured; registration approved without provisioning.";
      }
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }

  const updated = updateRegistrationStatus(
    id,
    action === "approve" ? "approved" : "rejected",
    [note, provisioningNote].filter(Boolean).join("\n")
  );

  if (!updated) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
