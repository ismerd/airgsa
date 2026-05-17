import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canEditContract, canViewContract } from "@/lib/auth/permissions";
import {
  getLivePartnerContract,
  updateContractTerms,
  type ContractTermsUpdateInput,
} from "@/lib/services/tender-workflow-store";
import { appendMandateAuditEvent } from "@/lib/services/mandate-execution-store";

const STATUS_VALUES = new Set(["pending", "active", "suspended", "closed"]);

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contract = await getLivePartnerContract(id);
  if (!contract || !canViewContract(session, contract)) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getLivePartnerContract(id);
  if (!existing || !canEditContract(session, existing)) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const body = (await req.json()) as ContractTermsUpdateInput;
  if (body.status && !STATUS_VALUES.has(body.status)) {
    return NextResponse.json({ error: "Invalid contract status" }, { status: 400 });
  }
  if (body.status && !canTransitionContractStatus(existing.status, body.status)) {
    return NextResponse.json({ error: `Invalid contract status transition from ${existing.status} to ${body.status}` }, { status: 409 });
  }

  const input: ContractTermsUpdateInput = {
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status,
    commercialTerms: body.commercialTerms,
    targetLoadFactor: normalizeNumber(body.targetLoadFactor),
    monthlyTonnageTargetKg: normalizeNumber(body.monthlyTonnageTargetKg),
    reportingCadence: body.reportingCadence,
    controlRules: body.controlRules,
  };

  const contract = await updateContractTerms(id, stripUndefined(input));
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  await appendMandateAuditEvent(session, {
    entityType: "contract",
    entityId: contract.id,
    action: "contract.updated",
    summary: `${session.company} updated contract controls for ${contract.gsaName}`,
    metadata: { tenderId: contract.tenderId },
  });

  return NextResponse.json({ contract });
}

function normalizeNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function canTransitionContractStatus(current: string, next: string) {
  if (current === next) return true;
  if (current === "pending") return next === "active" || next === "closed";
  if (current === "active") return next === "suspended" || next === "closed";
  if (current === "suspended") return next === "active" || next === "closed";
  return false;
}
