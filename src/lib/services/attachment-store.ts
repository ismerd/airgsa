import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canViewContract } from "@/lib/auth/permissions";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { createId } from "@/lib/services/ids";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

const STORE_PATH = path.join(process.cwd(), "data", "attachments.json");
const STORE_KEY = "workflow_attachment_store";
const BUCKET_NAME = "workflow-attachments";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "png", "jpg", "jpeg", "webp"]);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export type StoredAttachment = {
  id: string;
  contractId?: string;
  entityId?: string;
  entityType: "control-action-comment" | "monthly-report" | "tender-document" | "application-document" | "airline-logo";
  airlineCompanyId?: string;
  airlineEmail?: string;
  gsaCompanyId?: string;
  gsaEmail?: string;
  visibility?: "contract" | "tender-public" | "application" | "company-private";
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
  validateAttachmentPayload({
    entityType: input.entityType,
    fileName: input.fileName,
    mimeType: payload.mimeType,
    size: input.size ?? payload.buffer.byteLength,
  });
  const now = new Date().toISOString();
  const id = createId("att");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "attachment.bin";
  const ownerPath = input.contractId ?? input.entityId ?? "general";
  const storagePath = `${ownerPath}/${id}-${safeName}`;

  let storage: StoredAttachment["storage"] = "file";
  const uploadedToSupabase = await uploadToSupabase(storagePath, payload.buffer, payload.mimeType);
  if (uploadedToSupabase) {
    storage = "supabase";
  } else {
    assertAttachmentFileStorageAllowed();
    const filePath = getAttachmentFilePath(storagePath);
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
    : await readFile(getAttachmentFilePath(attachment.storagePath));

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
    const result = await client.query("select data from workflow_attachments order by created_at desc");
    return normalizeStore({ attachments: result.rows.map((row) => rowData<StoredAttachment>(row)) });
  });
  if (dbStore?.attachments.length) return dbStore;

  const legacyStore = await readLegacyStore();
  if (legacyStore.attachments.length) {
    await writeStore(legacyStore);
    return legacyStore;
  }
  if (dbStore) return dbStore;

  return readFileStore();
}

async function readLegacyStore(): Promise<AttachmentStore> {
  const legacyStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    return normalizeStore(result.rows[0] ? rowData<Partial<AttachmentStore>>(result.rows[0]) : {});
  });
  if (legacyStore) return legacyStore;

  return readFileStore();
}

async function readFileStore(): Promise<AttachmentStore> {
  assertFileStoreFallbackAllowed("Attachment store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<AttachmentStore>);
  } catch {
    return { attachments: [] };
  }
}

async function writeStore(store: AttachmentStore) {
  const normalized = normalizeStore(store);
  const saved = await withPostgresTransaction(async (client) => {
    await client.query("delete from workflow_attachments");
    for (const attachment of normalized.attachments) {
      await client.query(
        `insert into workflow_attachments
          (id, contract_id, entity_id, entity_type, airline_company_id, airline_email, gsa_company_id, gsa_email, visibility, file_name, mime_type, size_bytes, storage, storage_path, created_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
         on conflict (id) do update set
          contract_id = excluded.contract_id,
          entity_id = excluded.entity_id,
          entity_type = excluded.entity_type,
          airline_company_id = excluded.airline_company_id,
          airline_email = excluded.airline_email,
          gsa_company_id = excluded.gsa_company_id,
          gsa_email = excluded.gsa_email,
          visibility = excluded.visibility,
          file_name = excluded.file_name,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          storage = excluded.storage,
          storage_path = excluded.storage_path,
          created_at = excluded.created_at,
          data = excluded.data`,
        [
          attachment.id,
          attachment.contractId ?? null,
          attachment.entityId ?? null,
          attachment.entityType,
          attachment.airlineCompanyId ?? null,
          attachment.airlineEmail ?? null,
          attachment.gsaCompanyId ?? null,
          attachment.gsaEmail ?? null,
          attachment.visibility ?? "application",
          attachment.fileName,
          attachment.mimeType,
          attachment.size,
          attachment.storage,
          attachment.storagePath,
          attachment.createdAt,
          JSON.stringify(attachment),
        ],
      );
    }
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

function validateAttachmentPayload(input: {
  entityType: StoredAttachment["entityType"];
  fileName: string;
  mimeType: string;
  size: number;
}) {
  const fileName = input.fileName.trim();
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  const maxBytes = input.entityType === "airline-logo" ? MAX_LOGO_BYTES : MAX_DOCUMENT_BYTES;

  if (input.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Attachment must be ${limitMb} MB or smaller`);
  }

  if (input.entityType === "airline-logo") {
    if (!["png", "jpg", "jpeg", "webp"].includes(extension ?? "") || !input.mimeType.startsWith("image/")) {
      throw new Error("Airline logo must be PNG, JPG or WebP");
    }
    return;
  }

  if (!extension || !ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error("Attachment type is not allowed");
  }

  if (input.mimeType !== "application/octet-stream" && !ALLOWED_DOCUMENT_MIME_TYPES.has(input.mimeType)) {
    throw new Error("Attachment MIME type is not allowed");
  }
}

function hasSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function assertAttachmentFileStorageAllowed() {
  if (hasPersistentAttachmentRoot()) return;
  assertFileStoreFallbackAllowed("Attachment store");
}

function hasPersistentAttachmentRoot() {
  return Boolean(process.env.ATTACHMENT_STORAGE_ROOT || process.env.FILE_STORAGE_ROOT || process.env.RAILWAY_VOLUME_MOUNT_PATH);
}

function getAttachmentRoot() {
  const configuredRoot =
    process.env.ATTACHMENT_STORAGE_ROOT ||
    (process.env.FILE_STORAGE_ROOT ? path.join(process.env.FILE_STORAGE_ROOT, "attachments") : undefined) ||
    (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "airgsa", "attachments") : undefined);

  return configuredRoot ?? path.join(process.cwd(), "data", "attachments");
}

function getAttachmentFilePath(storagePath: string) {
  const root = path.resolve(getAttachmentRoot());
  const resolved = path.resolve(root, storagePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Attachment path is invalid");
  }
  return resolved;
}
