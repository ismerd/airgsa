import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canManageWorkflow } from "@/lib/auth/permissions";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

const STORE_PATH = path.join(process.cwd(), "data", "gsa-customer-assignments.json");
const STORE_KEY_PREFIX = "gsa_customer_assignments";

export type GsaCustomerAssignment = {
  customerKey: string;
  customerName: string;
  contactEmail: string;
  assignedToEmail?: string;
  assignedToName?: string;
  companyId?: string;
  company?: string;
  assignedAt: string;
  assignedBy: string;
};

export type CustomerScopedRecord = {
  customer: string;
  contactEmail: string;
  createdBy?: string;
};

export async function listGsaCustomerAssignments(session: SessionPayload) {
  const assignments = await readAssignments(session);
  return assignments.sort((left, right) => left.customerName.localeCompare(right.customerName));
}

export async function assignGsaCustomer(
  session: SessionPayload,
  input: {
    customerKey: string;
    customerName: string;
    contactEmail: string;
    assignedToEmail?: string;
    assignedToName?: string;
  },
) {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  if (!canManageWorkflow(session)) throw new Error("Only team leads and admins can assign customers");

  const customerKey = normalizeCustomerKey(input.customerKey || getCustomerKey(input.customerName, input.contactEmail));
  if (!customerKey) throw new Error("Customer key is required");

  const assignments = await readAssignments(session);
  const next: GsaCustomerAssignment = {
    customerKey,
    customerName: input.customerName.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    assignedToEmail: input.assignedToEmail?.trim().toLowerCase() || undefined,
    assignedToName: input.assignedToName?.trim() || undefined,
    companyId: session.companyId,
    company: session.company,
    assignedAt: new Date().toISOString(),
    assignedBy: session.email,
  };
  const index = assignments.findIndex((assignment) => assignment.customerKey === customerKey);
  if (index >= 0) assignments[index] = next;
  else assignments.push(next);
  await writeAssignments(session, assignments);
  return next;
}

export function filterRecordsForGsaCustomerScope<T extends CustomerScopedRecord>(
  session: SessionPayload,
  records: T[],
  assignments: GsaCustomerAssignment[],
) {
  if (session.role !== "gsa" || canManageWorkflow(session)) return records;
  const myEmail = session.email.toLowerCase();
  const assignmentByCustomer = new Map(assignments.map((assignment) => [assignment.customerKey, assignment]));

  return records.filter((record) => {
    const assignment = assignmentByCustomer.get(getCustomerKey(record.customer, record.contactEmail));
    if (assignment) return assignment.assignedToEmail?.toLowerCase() === myEmail;
    return record.createdBy?.toLowerCase() === myEmail;
  });
}

export function getCustomerKey(customer: string, contactEmail: string) {
  return normalizeCustomerKey(`${customer}::${contactEmail}`);
}

export function canAssignGsaCustomers(session: SessionPayload | null) {
  return Boolean(session && session.role === "gsa" && canManageWorkflow(session));
}

function normalizeCustomerKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function readAssignments(session: SessionPayload): Promise<GsaCustomerAssignment[]> {
  const dbAssignments = await withPostgres(async (client) => {
    const result = await client.query("select value from app_settings where key = $1", [tenantStoreKey(session)]);
    return result.rows[0] ? normalizeAssignments(rowData<GsaCustomerAssignment[]>(result.rows[0])) : [];
  });
  if (dbAssignments) return dbAssignments;

  assertFileStoreFallbackAllowed("GSA customer assignment store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, GsaCustomerAssignment[]>;
    return normalizeAssignments(parsed[tenantStoreKey(session)] ?? []);
  } catch {
    return [];
  }
}

async function writeAssignments(session: SessionPayload, assignments: GsaCustomerAssignment[]) {
  const normalized = normalizeAssignments(assignments);
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [tenantStoreKey(session), JSON.stringify(normalized)],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("GSA customer assignment store");
  let fileStore: Record<string, GsaCustomerAssignment[]> = {};
  try {
    fileStore = JSON.parse(await readFile(STORE_PATH, "utf-8")) as Record<string, GsaCustomerAssignment[]>;
  } catch {
    fileStore = {};
  }
  fileStore[tenantStoreKey(session)] = normalized;
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(fileStore, null, 2)}\n`, "utf-8");
}

function tenantStoreKey(session: SessionPayload) {
  return `${STORE_KEY_PREFIX}:${session.companyId?.trim().toLowerCase() || session.company.trim().toLowerCase() || session.email.toLowerCase()}`;
}

function normalizeAssignments(assignments: GsaCustomerAssignment[]) {
  return assignments
    .filter((assignment) => assignment.customerKey && assignment.customerName)
    .map((assignment) => ({
      ...assignment,
      customerKey: normalizeCustomerKey(assignment.customerKey),
      customerName: assignment.customerName.trim(),
      contactEmail: assignment.contactEmail.trim().toLowerCase(),
      assignedToEmail: assignment.assignedToEmail?.trim().toLowerCase() || undefined,
      assignedToName: assignment.assignedToName?.trim() || undefined,
    }));
}
