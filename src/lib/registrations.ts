/**
 * File-based registration store.
 * Persists pending and processed registrations to .registrations.json
 * in the project root across server restarts.
 */
import fs from "fs";
import path from "path";

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

function read(): Registration[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Registration[];
  } catch {
    return [];
  }
}

function write(data: Registration[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getAllRegistrations(): Registration[] {
  return read();
}

export function getPendingRegistrations(): Registration[] {
  return read().filter((r) => r.status === "pending");
}

export function addRegistration(
  payload: Omit<Registration, "id" | "status" | "submittedAt">
): Registration {
  const registrations = read();
  const reg: Registration = {
    ...payload,
    id: `reg-${Date.now()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  write([...registrations, reg]);
  return reg;
}

export function updateRegistrationStatus(
  id: string,
  status: "approved" | "rejected",
  note?: string
): Registration | null {
  const registrations = read();
  const idx = registrations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  registrations[idx] = {
    ...registrations[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  };
  write(registrations);
  return registrations[idx];
}

export function emailAlreadyRegistered(email: string): boolean {
  return read().some((r) => r.email.toLowerCase() === email.toLowerCase());
}
