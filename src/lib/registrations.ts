import fs from "fs";
import path from "path";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

export type RegistrationStatus = "pending" | "approved" | "rejected";

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
const STORE_KEY = "registrations";

async function read(): Promise<Registration[]> {
  const dbRows = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    if (result.rows.length === 0) return null;
    return rowData<Registration[]>(result.rows[0]);
  });
  if (dbRows) return dbRows;

  assertFileStoreFallbackAllowed("Registration store");
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Registration[];
  } catch {
    return [];
  }
}

async function write(data: Registration[]): Promise<void> {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into app_settings (key, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `,
      [STORE_KEY, JSON.stringify(data)],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Registration store");
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getAllRegistrations(): Promise<Registration[]> {
  return read();
}

export async function getPendingRegistrations(): Promise<Registration[]> {
  return (await read()).filter((r) => r.status === "pending");
}

export async function addRegistration(
  payload: Omit<Registration, "id" | "status" | "submittedAt">
): Promise<Registration> {
  const registrations = await read();
  const reg: Registration = {
    ...payload,
    id: `reg-${Date.now()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await write([...registrations, reg]);
  return reg;
}

export async function updateRegistrationStatus(
  id: string,
  status: "approved" | "rejected",
  note?: string
): Promise<Registration | null> {
  const registrations = await read();
  const idx = registrations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  registrations[idx] = {
    ...registrations[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  };
  await write(registrations);
  return registrations[idx];
}

export async function emailAlreadyRegistered(email: string): Promise<boolean> {
  return (await read()).some((r) => r.email.toLowerCase() === email.toLowerCase());
}
