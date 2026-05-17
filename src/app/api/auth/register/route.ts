import { NextRequest, NextResponse } from "next/server";
import { addRegistration, emailAlreadyRegistered } from "@/lib/registrations";
import { DEMO_ACCOUNTS } from "@/lib/auth/credentials";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company, email, role, country, phone, message } = body as {
    name: string;
    company: string;
    email: string;
    role: "airline" | "gsa";
    country: string;
    phone?: string;
    message?: string;
  };

  if (!name || !company || !email || !role || !country) {
    return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
  }

  const emailLower = email.toLowerCase();

  // Block demo accounts
  if (DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === emailLower)) {
    return NextResponse.json(
      { error: "This email is already associated with a demo account. Use the login page." },
      { status: 409 }
    );
  }

  if (await emailAlreadyRegistered(emailLower)) {
    return NextResponse.json(
      { error: "A registration with this email already exists. Please contact support if you need help." },
      { status: 409 }
    );
  }

  const reg = await addRegistration({ name, company, email: emailLower, role, country, phone, message });
  return NextResponse.json({ id: reg.id, status: reg.status }, { status: 201 });
}
