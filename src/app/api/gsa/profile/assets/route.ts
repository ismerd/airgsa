import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/auth/session";
import { updateRailwayAccountProfile } from "@/lib/auth/railway-accounts";
import { saveGsaCompanyProfile } from "@/lib/services/gsa-company-profile";
import { saveWorkflowAttachment, type StoredAttachment } from "@/lib/services/attachment-store";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;
const ASSET_CONFIG = {
  logo: { field: "logoPath", entityType: "gsa-logo", fileName: "gsa-logo" },
  banner: { field: "bannerPath", entityType: "gsa-banner", fileName: "gsa-banner" },
  avatar: { field: "avatarPath", entityType: "user-avatar", fileName: "user-avatar" },
} as const;

type AssetKind = keyof typeof ASSET_CONFIG;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const kind = formData.get("kind");
  const file = formData.get("asset") as File | null;

  if (!isAssetKind(kind)) return NextResponse.json({ error: "Unknown profile asset." }, { status: 400 });
  if (kind !== "avatar" && !canManageBrandAssets(session)) {
    return NextResponse.json({ error: "Only GSA admins can update company brand assets." }, { status: 403 });
  }
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "File too large (max 2 MB)." }, { status: 400 });

  const config = ASSET_CONFIG[kind];
  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const buffer = Buffer.from(bytes);
  const attachment = await saveWorkflowAttachment({
    entityId: kind === "avatar" ? session.email.toLowerCase() : session.companyId ?? session.email.toLowerCase(),
    entityType: config.entityType as StoredAttachment["entityType"],
    gsaCompanyId: session.companyId,
    gsaEmail: session.email,
    visibility: "company-private",
    fileName: `${config.fileName}.${ext}`,
    mimeType: file.type,
    size: buffer.byteLength,
    dataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
  });

  if (!attachment) return NextResponse.json({ error: "Upload failed." }, { status: 500 });

  if (kind === "avatar") {
    const updated = await updateRailwayAccountProfile(session.email, { avatarPath: attachment.attachmentUrl });
    if (updated) await updateSession({ avatarPath: updated.avatarPath });
    return NextResponse.json({ avatarPath: attachment.attachmentUrl });
  }

  const profile = await saveGsaCompanyProfile(session, {
    [config.field]: attachment.attachmentUrl,
  });
  return NextResponse.json({ [config.field]: kind === "logo" ? profile.logoPath : profile.bannerPath });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const kind = new URL(req.url).searchParams.get("kind");
  if (!isAssetKind(kind)) return NextResponse.json({ error: "Unknown profile asset." }, { status: 400 });
  if (kind !== "avatar" && !canManageBrandAssets(session)) {
    return NextResponse.json({ error: "Only GSA admins can update company brand assets." }, { status: 403 });
  }

  if (kind === "avatar") {
    const updated = await updateRailwayAccountProfile(session.email, { avatarPath: "" });
    if (updated) await updateSession({ avatarPath: undefined });
    return NextResponse.json({ avatarPath: null });
  }

  const config = ASSET_CONFIG[kind];
  const profile = await saveGsaCompanyProfile(session, { [config.field]: "" });
  return NextResponse.json({ [config.field]: kind === "logo" ? profile.logoPath ?? null : profile.bannerPath ?? null });
}

function isAssetKind(value: unknown): value is AssetKind {
  return typeof value === "string" && value in ASSET_CONFIG;
}

function canManageBrandAssets(session: Awaited<ReturnType<typeof getSession>>) {
  return session?.role === "admin" || session?.accessRole === "owner" || session?.accessRole === "admin";
}
