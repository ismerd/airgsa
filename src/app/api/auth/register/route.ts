import { NextRequest, NextResponse } from "next/server";
import { addRegistration, emailAlreadyRegistered } from "@/lib/registrations";
import { DEMO_ACCOUNTS } from "@/lib/auth/credentials";
import {
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/api/protection";

const REGISTER_BODY_MAX_BYTES = 24 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ipLimit = enforceRateLimit({ key: `register:ip:${getClientIp(req)}`, limit: 8, windowMs: 60 * 60 * 1000 });
    if (ipLimit) return ipLimit;

    const body = await readJsonWithLimit<{
      name: string;
      company: string;
      email: string;
      role: "airline" | "gsa";
      country: string;
      phone?: string;
      message?: string;
    }>(req, REGISTER_BODY_MAX_BYTES);
    const { name, company, email, role, country, phone, message } = body;

    if (!name || !company || !email || !role || !country) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
    }

    if (role !== "airline" && role !== "gsa") {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const emailLimit = enforceRateLimit({ key: `register:email:${emailLower}`, limit: 3, windowMs: 24 * 60 * 60 * 1000 });
    if (emailLimit) return emailLimit;

    if (demoAccountsEnabled() && DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === emailLower)) {
      return NextResponse.json(
        { error: "This email is already associated with a demo account. Use the login page." },
        { status: 409 },
      );
    }

    if (await emailAlreadyRegistered(emailLower)) {
      return NextResponse.json(
        { error: "A registration with this email already exists. Please contact support if you need help." },
        { status: 409 },
      );
    }

    const reg = await addRegistration({ name, company, email: emailLower, role, country, phone, message });
    return NextResponse.json({ id: reg.id, status: reg.status }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message || "Registration failed" }, { status: 409 });
  }
}

function demoAccountsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_ACCOUNTS === "true";
}
