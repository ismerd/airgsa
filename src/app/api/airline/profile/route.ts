import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession, updateSession } from "@/lib/auth/session";
import { updateRailwayAccountProfile } from "@/lib/auth/railway-accounts";
import { saveAirlineProfile, type AirlineProfile } from "@/lib/services/airline-profile";

const BODY_MAX_BYTES = 16 * 1024;

const PROFILE_FIELDS = [
  "iataCode",
  "icaoCode",
  "primaryHub",
  "secondaryHub",
  "headquarters",
  "alliance",
  "parentGroup",
  "keyLanes",
  "cargoFocus",
  "compliance",
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `airline-profile:${session.email}:${getClientIp(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await readJsonWithLimit<Record<string, unknown>>(req, BODY_MAX_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: AirlineProfile = {};
  for (const field of PROFILE_FIELDS) {
    patch[field] = cleanString(body[field], getMaxLength(field));
  }

  const contactName = cleanString(body.contactName, 120);
  if (contactName) {
    const updatedAccount = await updateRailwayAccountProfile(session.email, { name: contactName });
    if (updatedAccount) await updateSession({ name: updatedAccount.name });
  }

  const profile = await saveAirlineProfile(session, patch);
  return NextResponse.json({ ok: true, profile });
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getMaxLength(field: ProfileField) {
  if (field === "iataCode") return 2;
  if (field === "icaoCode") return 3;
  if (field === "primaryHub" || field === "secondaryHub") return 4;
  return 500;
}
