import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canViewContract } from "@/lib/auth/permissions";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

const STORE_PATH = path.join(process.cwd(), "data", "attachments.json");
const FILE_ROOT = path.join(process.cwd(), "data", "attachments");
const STORE_KEY = "workflow_attachment_store";
const BUCKET_NAME = "workflow-attachments";

export type StoredAttachment = {
  id: string;
  contractId?: string;
  entityId?: string;
  entityType: "control-action-comment" | "monthly-report" | "tender-document" | "application-document";
  airlineCompanyId?: string;
  airlineEmail?: string;
  gsaCompanyId?: string;
  gsaEmail?: string;
  visibility?: "contract" | "tender-public" | "application";
  fileName: string;
  mimeType: string;
  size: number;
  storage: "supabase" | "file";
  storagePath: string;
  createdAt: string;
};

type AttachmentStore = {
  attachments: StoredAttachment[];
};

export type StoredAttachmentResult = {
  attachmentUrl: string;
  attachmentStoragePath: string;
};

export async function saveWorkflowAttachment(input: {
  contractId?: string;
  entityId?: string;
  entityType: StoredAttachment["entityType"];
  airlineCompanyId?: string;
  airlineEmail?: string;
  gsaCompanyId?: string;
  gsaEmail?: string;
  visibility?: StoredAttachment["visibility"];
  fileName?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string;
}): Promise<StoredAttachmentResult | null> {
  if (!input.dataUrl || !input.fileName) return null;

  const payload = parseDataUrl(input.dataUrl, input.mimeType);
  const now = new Date().toISOString();
  const id = `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "attachment.bin";
  const ownerPath = input.contractId ?? input.entityId ?? "general";
  const storagePath = `${ownerPath}/${id}-${safeName}`;

  let storage: StoredAttachment["storage"] = "file";
  const uploadedToSupabase = await uploadToSupabase(storagePath, payload.buffer, payload.mimeType);
  if (uploadedToSupabase) {
    storage = "supabase";
  } else {
    assertFileStoreFallbackAllowed("Attachment store");
    const filePath = path.join(FILE_ROOT, storagePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, payload.buffer);
  }

  const attachment: StoredAttachment = {
    id,
    contractId: input.contractId,
    entityId: input.entityId,
    entityType: input.entityType,
    airlineCompanyId: input.airlineCompanyId,
    airlineEmail: input.airlineEmail,
    gsaCompanyId: input.gsaCompanyId,
    gsaEmail: input.gsaEmail,
    visibility: input.visibility ?? (input.contractId ? "contract" : "application"),
    fileName: input.fileName,
    mimeType: payload.mimeType,
    size: input.size ?? payload.buffer.byteLength,
    storage,
    storagePath,
    createdAt: now,
  };

  const store = await readStore();
  store.attachments.unshift(attachment);
  await writeStore(store);

  return {
    attachmentUrl: `/api/attachments/${id}`,
    attachmentStoragePath: id,
  };
}

export async function readWorkflowAttachment(session: SessionPayload, id: string) {
  const store = await readStore();
  const attachment = store.attachments.find((item) => item.id === id || item.storagePath === id);
  if (!attachment) return null;

  if (!canViewAttachment(session, attachment)) throw new Error("Attachment not found");

  const buffer = attachment.storage === "supabase"
    ? await downloadFromSupabase(attachment.storagePath)
    : await readFile(path.join(FILE_ROOT, attachment.storagePath));

  return { attachment, buffer };
}

async function canViewAttachment(session: SessionPayload, attachment: StoredAttachment) {
  if (session.role === "admin") return true;
  if (attachment.contractId) {
    const contracts = await listLivePartnerContracts();
    const contract = contracts.find((item) => item.id === attachment.contractId);
    return Boolean(contract && canViewContract(session, contract));
  }
  if (attachment.visibility === "tender-public") return Boolean(session);
  if (session.role === "airline") {
    if (attachment.airlineCompanyId && session.companyId) return attachment.airlineCompanyId === session.companyId;
    return Boolean(attachment.airlineEmail && attachment.airlineEmail.toLowerCase() === session.email.toLowerCase());
  }
  if (session.role === "gsa") {
    if (attachment.gsaCompanyId && session.companyId) return attachment.gsaCompanyId === session.companyId;
    return Boolean(attachment.gsaEmail && attachment.gsaEmail.toLowerCase() === session.email.toLowerCase());
  }
  return false;
}

async function uploadToSupabase(storagePath: string, buffer: Buffer, mimeType: string) {
  if (!hasSupabaseAdmin()) return false;
  try {
    const supabase = createSupabaseAdminClient();
    const { data: bucket } = await supabase.storage.getBucket(BUCKET_NAME);
    if (!bucket) await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("[attachments] Supabase upload failed:", (error as Error).message);
    return false;
  }
}

async function downloadFromSupabase(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "Attachment download failed");
  return Buffer.from(await data.arrayBuffer());
}

async function readStore(): Promise<AttachmentStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    return normalizeStore(result.rows[0] ? rowData<Partial<AttachmentStore>>(result.rows[0]) : {});
  });
  if (dbStore) return dbStore;

  assertFileStoreFallbackAllowed("Attachment store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<AttachmentStore>);
  } catch {
    return { attachments: [] };
  }
}

async function writeStore(store: AttachmentStore) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [STORE_KEY, JSON.stringify(normalizeStore(store))],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Attachment store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<AttachmentStore>): AttachmentStore {
  return { attachments: store.attachments ?? [] };
}

function parseDataUrl(dataUrl: string, fallbackMimeType?: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) throw new Error("Attachment payload is invalid");
  const mimeType = match[1] || fallbackMimeType || "application/octet-stream";
  const buffer = match[2] === ";base64"
    ? Buffer.from(match[3], "base64")
    : Buffer.from(decodeURIComponent(match[3]), "utf-8");
  return { buffer, mimeType };
}

function hasSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
