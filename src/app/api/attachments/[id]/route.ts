import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readWorkflowAttachment } from "@/lib/services/attachment-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await readWorkflowAttachment(session, (await params).id);
    if (!result) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    return new Response(result.buffer, {
      headers: {
        "content-type": result.attachment.mimeType,
        "content-length": String(result.buffer.byteLength),
        "content-disposition": `inline; filename="${result.attachment.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
