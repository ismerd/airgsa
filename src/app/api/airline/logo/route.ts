import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveAirlineProfile } from "@/lib/services/airline-profile";
import { saveWorkflowAttachment } from "@/lib/services/attachment-store";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const ext = file.type === "image/webp" ? "webp"
    : file.type === "image/png" ? "png"
    : "jpg";
  const buffer = Buffer.from(bytes);
  const attachment = await saveWorkflowAttachment({
    entityId: session.companyId ?? session.email.toLowerCase(),
    entityType: "airline-logo",
    airlineCompanyId: session.companyId,
    airlineEmail: session.email,
    visibility: "company-private",
    fileName: `airline-logo.${ext}`,
    mimeType: file.type,
    size: buffer.byteLength,
    dataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
  });

  if (!attachment) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const profile = await saveAirlineProfile(session, { logoPath: attachment.attachmentUrl });

  return NextResponse.json({ logoPath: profile.logoPath });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || (session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const profile = await saveAirlineProfile(session, { logoPath: "" });
  return NextResponse.json({ logoPath: profile.logoPath ?? null });
}
