import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { rewriteTextWithGemini } from "@/lib/ai/gemini";

const MAX_TEXT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    text?: unknown;
    fieldLabel?: unknown;
    context?: unknown;
  };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.slice(0, 120) : undefined;
  const context = typeof body.context === "string" ? body.context.slice(0, 500) : undefined;

  if (!text && !fieldLabel) {
    return NextResponse.json({ error: "Field label is required when generating text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text must be ${MAX_TEXT_LENGTH} characters or less` }, { status: 400 });
  }

  try {
    const rewrittenText = await rewriteTextWithGemini({ text, fieldLabel, context });
    return NextResponse.json({ text: rewrittenText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text could not be improved";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
