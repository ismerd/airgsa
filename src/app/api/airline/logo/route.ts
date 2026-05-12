import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAirlineProfile, saveAirlineProfile } from "@/lib/services/airline-profile";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
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

  const ext = file.type === "image/svg+xml" ? "svg"
    : file.type === "image/webp" ? "webp"
    : file.type === "image/png" ? "png"
    : "jpg";
  const fileName = `airline-logo.${ext}`;
  const logosDir = join(process.cwd(), "public", "logos");
  mkdirSync(logosDir, { recursive: true });
  writeFileSync(join(logosDir, fileName), Buffer.from(bytes));

  const logoPath = `/logos/${fileName}`;
  const profile = getAirlineProfile();
  profile.logoPath = logoPath;
  saveAirlineProfile(profile);

  return NextResponse.json({ logoPath });
}
