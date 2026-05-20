import { NextResponse } from "next/server";
import { createAdminInviteLink } from "@/lib/auth/account-provisioning";
import { getSession } from "@/lib/auth/session";
import { deleteRailwayAccount, getRailwayAccountById, setRailwayAccountStatus } from "@/lib/auth/railway-accounts";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const account = await getRailwayAccountById(id);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.role === "admin" || account.email === session.email) {
    return NextResponse.json({ error: "Admin accounts cannot be changed from this page" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "setup-link") {
    const invite = await createAdminInviteLink({ email: account.email });
    return NextResponse.json({ account, localInviteUrl: invite.localInviteUrl, error: invite.error });
  }

  const nextStatus = body.action === "enable" ? "active" : body.action === "disable" ? "disabled" : null;
  if (!nextStatus) return NextResponse.json({ error: "Unsupported account action" }, { status: 400 });

  const updated = await setRailwayAccountStatus(id, nextStatus);
  if (!updated) return NextResponse.json({ error: "Account could not be updated" }, { status: 400 });

  return NextResponse.json({ account: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const account = await getRailwayAccountById(id);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.role === "admin" || account.email === session.email) {
    return NextResponse.json({ error: "Admin accounts cannot be deleted from this page" }, { status: 400 });
  }

  const deleted = await deleteRailwayAccount(id);
  if (!deleted) return NextResponse.json({ error: "Account could not be deleted" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
