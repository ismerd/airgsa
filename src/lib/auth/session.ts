import { cookies } from "next/headers";
import type { DemoAccount } from "./credentials";

export type SessionPayload = {
  email: string;
  role: "airline" | "gsa" | "admin";
  name: string;
  company: string;
};

const COOKIE_NAME = "airgsa-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(account: DemoAccount): Promise<void> {
  const cookieStore = await cookies();
  const payload: SessionPayload = {
    email: account.email,
    role: account.role,
    name: account.name,
    company: account.company,
  };
  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
