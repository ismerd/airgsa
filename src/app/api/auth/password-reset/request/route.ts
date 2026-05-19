import { NextRequest, NextResponse } from "next/server";
import {
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/api/protection";
import { createRailwayPasswordReset } from "@/lib/auth/railway-accounts";
import { hasTransactionalEmailProvider, sendTransactionalEmail } from "@/lib/services/notification-email";
import { createSupabaseAuthClient, isSupabaseConfigured } from "@/lib/supabase/client";

const PASSWORD_RESET_BODY_MAX_BYTES = 4 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ipLimit = enforceRateLimit({ key: `password-reset:ip:${getClientIp(req)}`, limit: 10, windowMs: 60 * 60 * 1000 });
    if (ipLimit) return ipLimit;

    const { email } = await readJsonWithLimit<{ email?: string }>(req, PASSWORD_RESET_BODY_MAX_BYTES);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLimit = enforceRateLimit({ key: `password-reset:email:${normalizedEmail}`, limit: 3, windowMs: 60 * 60 * 1000 });
    if (emailLimit) return emailLimit;

    if (!isSupabaseConfigured) {
      if (!hasTransactionalEmailProvider()) {
        return NextResponse.json(
          { error: "Password reset email delivery is not configured." },
          { status: 503 },
        );
      }

      const token = await createRailwayPasswordReset(normalizedEmail);
      if (token) {
        const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).toString();
        const result = await sendTransactionalEmail({
          to: normalizedEmail,
          subject: "Reset your AirGSA password",
          text: `Use this link to reset your AirGSA password. It expires in 30 minutes.\n\n${resetUrl}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
              <h2 style="margin:0 0 12px">Reset your AirGSA password</h2>
              <p>Use this link to set a new password. It expires in 30 minutes.</p>
              <p><a href="${resetUrl}">Reset password</a></p>
            </div>
          `,
        });

        if (result.status === "failed" || result.status === "skipped") {
          return NextResponse.json({ error: result.error ?? "Password reset email could not be sent." }, { status: 503 });
        }
      }

      return NextResponse.json({ ok: true });
    }

    const supabase = createSupabaseAuthClient();
    const redirectTo = new URL("/reset-password", req.nextUrl.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
