import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  signSessionPayload,
  verifySessionCookie,
  type SessionPayload,
} from "./session-cookie";
import { getRailwayAccountSession } from "./railway-accounts";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

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
    avatarPath: account.avatarPath,
  };
  cookieStore.set(SESSION_COOKIE_NAME, await signSessionPayload(payload), {
    ...COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE,
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

export async function getFreshSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;

  const account = await getRailwayAccountSession(session.email);
  if (!account) return session;

  return {
    ...session,
    name: account.name,
    company: account.company,
    companyId: account.companyId,
    accessRole: account.accessRole,
    avatarPath: account.avatarPath,
  };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}
