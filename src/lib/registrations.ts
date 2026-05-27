import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@/lib/services/ids";
import {
  assertFileStoreFallbackAllowed,
  hasPostgres,
  rowData,
  withPostgres,
  withPostgresTransaction,
} from "@/lib/services/postgres-store";

type RegistrationStatus = "pending" | "approved" | "rejected";

export type Registration = {
  id: string;
  name: string;
  company: string;
  email: string;
  role: "airline" | "gsa";
  country: string;
  phone?: string;
  message?: string;
  status: RegistrationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

const DATA_FILE = path.join(process.cwd(), ".registrations.json");
const LEGACY_STORE_KEY = "registrations";

export async function getAllRegistrations(): Promise<Registration[]> {
  return read();
}

export async function getPendingRegistrations(): Promise<Registration[]> {
  return (await read()).filter((registration) => registration.status === "pending");
}

export async function addRegistration(
  payload: Omit<Registration, "id" | "status" | "submittedAt">,
): Promise<Registration> {
  const registration = normalizeRegistration({
    ...payload,
    id: createId("reg"),
    email: payload.email.toLowerCase(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  });

  const saved = await withPostgres(async (client) => {
    const result = await client.query(
      `insert into account_registrations
        (id, email, role, company, country, status, submitted_at, reviewed_at, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (email) do nothing
       returning data`,
      [
        registration.id,
        registration.email,
        registration.role,
        registration.company,
        registration.country,
        registration.status,
        registration.submittedAt,
        registration.reviewedAt ?? null,
        JSON.stringify(registration),
      ],
    );
    return result.rows[0] ? rowData<Registration>(result.rows[0]) : null;
  });
  if (saved) return normalizeRegistration(saved);
  if (saved === null && hasPostgres()) {
    throw new Error("A registration with this email already exists.");
  }

  const registrations = await readFileRegistrations();
  if (registrations.some((item) => item.email.toLowerCase() === registration.email)) {
    throw new Error("A registration with this email already exists.");
  }
  await writeFileRegistrations([...registrations, registration]);
  return registration;
}

export async function updateRegistrationStatus(
  id: string,
  status: "approved" | "rejected",
  note?: string,
): Promise<Registration | null> {
  const updatedAt = new Date().toISOString();
  const updated = await withPostgres(async (client) => {
    const existingResult = await client.query("select data from account_registrations where id = $1", [id]);
    const existing = existingResult.rows[0] ? normalizeRegistration(rowData<Registration>(existingResult.rows[0])) : null;
    if (!existing) return null;

    const registration = normalizeRegistration({
      ...existing,
      status,
      reviewedAt: updatedAt,
      reviewNote: note,
    });
    const result = await client.query(
      `update account_registrations
       set status = $2, reviewed_at = $3, data = $4::jsonb
       where id = $1
       returning data`,
      [id, status, registration.reviewedAt, JSON.stringify(registration)],
    );
    return result.rows[0] ? rowData<Registration>(result.rows[0]) : null;
  });
  if (updated) return normalizeRegistration(updated);
  if (updated === null && hasPostgres()) return null;

  const registrations = await readFileRegistrations();
  const index = registrations.findIndex((registration) => registration.id === id);
  if (index < 0) return null;
  registrations[index] = normalizeRegistration({
    ...registrations[index],
    status,
    reviewedAt: updatedAt,
    reviewNote: note,
  });
  await writeFileRegistrations(registrations);
  return registrations[index];
}

export async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const exists = await withPostgres(async (client) => {
    const result = await client.query("select 1 from account_registrations where email = $1 limit 1", [normalizedEmail]);
    return (result.rowCount ?? 0) > 0;
  });
  if (exists !== null) return exists;

  return (await readFileRegistrations()).some((registration) => registration.email.toLowerCase() === normalizedEmail);
}

async function read(): Promise<Registration[]> {
  const dbRows = await withPostgres(async (client) => {
    const result = await client.query("select data from account_registrations order by submitted_at desc");
    return result.rows.map((row) => normalizeRegistration(rowData<Registration>(row)));
  });

  if (dbRows) {
    if (dbRows.length > 0) return dbRows;
    const legacy = await readLegacyRegistrations();
    if (legacy.length > 0) {
      await writeDbRegistrations(legacy);
      return sortRegistrations(legacy);
    }
    return [];
  }

  return sortRegistrations(await readFileRegistrations());
}

async function readLegacyRegistrations(): Promise<Registration[]> {
  const legacy = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_STORE_KEY]);
    return result.rows[0] ? rowData<Registration[]>(result.rows[0]).map(normalizeRegistration) : [];
  });
  if (legacy?.length) return legacy;

  if (!hasPostgres()) return readFileRegistrations();
  return [];
}

async function writeDbRegistrations(registrations: Registration[]) {
  await withPostgresTransaction(async (client) => {
    for (const registration of registrations.map(normalizeRegistration)) {
      await client.query(
        `insert into account_registrations
          (id, email, role, company, country, status, submitted_at, reviewed_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         on conflict (email) do update set
          status = excluded.status,
          reviewed_at = excluded.reviewed_at,
          data = excluded.data`,
        [
          registration.id,
          registration.email,
          registration.role,
          registration.company,
          registration.country,
          registration.status,
          registration.submittedAt,
          registration.reviewedAt ?? null,
          JSON.stringify(registration),
        ],
      );
    }
    return true;
  });
}

async function readFileRegistrations(): Promise<Registration[]> {
  assertFileStoreFallbackAllowed("Registration store");
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return (JSON.parse(raw) as Registration[]).map(normalizeRegistration);
  } catch {
    return [];
  }
}

async function writeFileRegistrations(registrations: Registration[]) {
  assertFileStoreFallbackAllowed("Registration store");
  await writeFile(DATA_FILE, `${JSON.stringify(registrations.map(normalizeRegistration), null, 2)}\n`, "utf-8");
}

function normalizeRegistration(registration: Registration): Registration {
  return {
    ...registration,
    name: registration.name.trim(),
    company: registration.company.trim(),
    email: registration.email.trim().toLowerCase(),
    country: registration.country.trim(),
    phone: registration.phone?.trim() || undefined,
    message: registration.message?.trim() || undefined,
    reviewNote: registration.reviewNote?.trim() || undefined,
    status: registration.status ?? "pending",
  };
}

function sortRegistrations(registrations: Registration[]) {
  return registrations.sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}
