import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  signSessionPayload,
  verifySessionCookie,
  type SessionPayload,
} from "./session-cookie";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type { SessionPayload };

export async function createSession(account: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const payload: SessionPayload = {
    email: account.email,
    role: account.role,
    accessRole: account.accessRole,
    name: account.name,
    company: account.company,
    companyId: account.companyId,
  };
  cookieStore.set(SESSION_COOKIE_NAME, await signSessionPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function updateSession(updates: Partial<SessionPayload>): Promise<void> {
  const current = await getSession();
  if (!current) return;
  await createSession({ ...current, ...updates });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
