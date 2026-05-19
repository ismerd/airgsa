import net from "node:net";
import tls from "node:tls";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";
import { createId } from "@/lib/services/ids";
import type { WorkflowNotification } from "@/lib/services/mandate-execution-store";

export type WorkflowEmailDelivery = {
  id: string;
  notificationId: string;
  recipientEmail?: string;
  recipientCompanyId?: string;
  recipientRole: WorkflowNotification["recipientRole"];
  provider: EmailProvider | "disabled" | "skipped";
  status: "sent" | "queued" | "skipped" | "failed";
  statusCode?: number;
  error?: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type EmailProvider = "resend" | "smtp" | "webhook";

export type TransactionalEmailResult = {
  provider: EmailProvider | "disabled";
  status: "sent" | "queued" | "skipped" | "failed";
  statusCode?: number;
  error?: string;
};

export async function listWorkflowEmailDeliveries(): Promise<WorkflowEmailDelivery[]> {
  const deliveries = await withPostgres(async (client) => {
    const result = await client.query("select data from workflow_email_deliveries order by created_at desc limit 250");
    return result.rows.map((row) => rowData<WorkflowEmailDelivery>(row));
  });
  if (deliveries) return deliveries;

  assertFileStoreFallbackAllowed("Workflow email delivery store");
  return [];
}

export async function queueWorkflowEmail(notification: WorkflowNotification) {
  const now = new Date().toISOString();
  const base: WorkflowEmailDelivery = {
    id: createId("eml"),
    notificationId: notification.id,
    recipientEmail: notification.recipientEmail,
    recipientCompanyId: notification.recipientCompanyId,
    recipientRole: notification.recipientRole,
    provider: "disabled",
    status: "skipped",
    subject: notification.title,
    createdAt: now,
    updatedAt: now,
  };

  if (!notification.recipientEmail) {
    const delivery = { ...base, provider: "skipped" as const, error: "Notification has no recipient email" };
    await recordDelivery(delivery);
    return delivery;
  }

  if (process.env.WORKFLOW_EMAIL_ENABLED !== "true") {
    const delivery = { ...base, provider: "disabled" as const, error: "WORKFLOW_EMAIL_ENABLED is not true" };
    await recordDelivery(delivery);
    return delivery;
  }

  const payload = buildEmailPayload(notification);
  const delivery = await sendEmail(payload, base);
  await recordDelivery(delivery);
  return delivery;
}

async function sendEmail(payload: EmailPayload, base: WorkflowEmailDelivery): Promise<WorkflowEmailDelivery> {
  const result = await sendTransactionalEmail(payload);
  return {
    ...base,
    provider: result.provider,
    status: result.status,
    statusCode: result.statusCode,
    error: result.error,
    updatedAt: new Date().toISOString(),
  };
}

export function hasTransactionalEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.WORKFLOW_EMAIL_WEBHOOK_URL);
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<TransactionalEmailResult> {
  if (process.env.RESEND_API_KEY) return sendViaResend(payload);
  if (process.env.SMTP_HOST) return sendViaSmtp(payload);
  if (process.env.WORKFLOW_EMAIL_WEBHOOK_URL) return sendViaWebhook(payload);
  return {
    provider: "disabled",
    status: "skipped",
    error: "No email provider configured. Set RESEND_API_KEY, SMTP_HOST, or WORKFLOW_EMAIL_WEBHOOK_URL.",
  };
}

async function sendViaResend(payload: EmailPayload): Promise<TransactionalEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFromAddress(),
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    return {
      provider: "resend",
      status: response.ok ? "sent" : "failed",
      statusCode: response.status,
      error: response.ok ? undefined : await safeResponseText(response),
    };
  } catch (error) {
    return failedDelivery("resend", error);
  }
}

async function sendViaWebhook(payload: EmailPayload): Promise<TransactionalEmailResult> {
  try {
    const response = await fetch(process.env.WORKFLOW_EMAIL_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return {
      provider: "webhook",
      status: response.ok ? "queued" : "failed",
      statusCode: response.status,
      error: response.ok ? undefined : await safeResponseText(response),
    };
  } catch (error) {
    return failedDelivery("webhook", error);
  }
}

async function recordDelivery(delivery: WorkflowEmailDelivery) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into workflow_email_deliveries
        (id, notification_id, recipient_email, recipient_company_id, recipient_role, provider, status, status_code, error, subject, created_at, updated_at, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       on conflict (id) do update set
        provider = excluded.provider,
        status = excluded.status,
        status_code = excluded.status_code,
        error = excluded.error,
        updated_at = excluded.updated_at,
        data = excluded.data`,
      [
        delivery.id,
        delivery.notificationId,
        delivery.recipientEmail ?? null,
        delivery.recipientCompanyId ?? null,
        delivery.recipientRole,
        delivery.provider,
        delivery.status,
        delivery.statusCode ?? null,
        delivery.error ?? null,
        delivery.subject,
        delivery.createdAt,
        delivery.updatedAt,
        JSON.stringify(delivery),
      ],
    );
    return true;
  });

  if (!saved) assertFileStoreFallbackAllowed("Workflow email delivery store");
}

function buildEmailPayload(notification: WorkflowNotification): EmailPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  const href = notification.href.startsWith("http")
    ? notification.href
    : appUrl
      ? new URL(notification.href, appUrl).toString()
      : notification.href;
  const text = `${notification.body}\n\nOpen in AirGSA: ${href}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">${escapeHtml(notification.title)}</h2>
      <p>${escapeHtml(notification.body)}</p>
      <p><a href="${escapeHtml(href)}">Open in AirGSA</a></p>
    </div>
  `;

  return {
    to: notification.recipientEmail!,
    subject: notification.title,
    text,
    html,
  };
}

async function sendViaSmtp(payload: EmailPayload): Promise<TransactionalEmailResult> {
  try {
    await smtpSend(payload);
    return { provider: "smtp", status: "sent" };
  } catch (error) {
    return failedDelivery("smtp", error);
  }
}

async function smtpSend(payload: EmailPayload) {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST is missing");

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM || process.env.WORKFLOW_EMAIL_FROM || "AirGSA <notifications@airgsa.com>";
  const envelopeFrom = extractEmailAddress(process.env.SMTP_ENVELOPE_FROM || from);
  const envelopeTo = extractEmailAddress(payload.to);

  let socket: net.Socket | tls.TLSSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  socket.setTimeout(20_000);
  let buffer = "";
  const waitForResponse = () => new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP connection timed out"));
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const response = extractSmtpResponse(buffer);
      if (!response) return;
      buffer = buffer.slice(response.length);
      cleanup();
      resolve(response);
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
    const response = extractSmtpResponse(buffer);
    if (response) {
      buffer = buffer.slice(response.length);
      cleanup();
      resolve(response);
    }
  });

  const send = async (line: string, expectedCodes: number[]) => {
    socket.write(`${line}\r\n`);
    const response = await waitForResponse();
    assertSmtpCode(response, expectedCodes);
    return response;
  };

  try {
    assertSmtpCode(await waitForResponse(), [220]);
    let ehlo = await send(`EHLO ${process.env.SMTP_HELO_DOMAIN || "airgsa.local"}`, [250]);

    if (!secure && process.env.SMTP_STARTTLS !== "false" && ehlo.toUpperCase().includes("STARTTLS")) {
      await send("STARTTLS", [220]);
      socket = tls.connect({ socket, servername: host });
      buffer = "";
      ehlo = await send(`EHLO ${process.env.SMTP_HELO_DOMAIN || "airgsa.local"}`, [250]);
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      await send("AUTH LOGIN", [334]);
      await send(Buffer.from(process.env.SMTP_USER).toString("base64"), [334]);
      await send(Buffer.from(process.env.SMTP_PASSWORD).toString("base64"), [235]);
    }

    await send(`MAIL FROM:<${envelopeFrom}>`, [250]);
    await send(`RCPT TO:<${envelopeTo}>`, [250, 251]);
    await send("DATA", [354]);
    socket.write(`${buildMimeMessage({ ...payload, from })}\r\n.\r\n`);
    assertSmtpCode(await waitForResponse(), [250]);
    await send("QUIT", [221]).catch(() => undefined);
  } finally {
    socket.destroy();
  }
}

function failedDelivery(provider: EmailProvider, error: unknown): TransactionalEmailResult {
  return {
    provider,
    status: "failed",
    error: error instanceof Error ? error.message : "Email delivery failed",
  };
}

async function safeResponseText(response: Response) {
  try {
    return (await response.text()).slice(0, 1000);
  } catch {
    return `HTTP ${response.status}`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getEmailFromAddress() {
  return process.env.WORKFLOW_EMAIL_FROM || "AirGSA <onboarding@resend.dev>";
}

function extractSmtpResponse(buffer: string) {
  const lines = buffer.split(/\r?\n/);
  if (lines.length < 2) return null;
  let consumed = 0;
  const completeLines: string[] = [];
  for (const line of lines.slice(0, -1)) {
    consumed += line.length + (buffer[consumed + line.length] === "\r" ? 2 : 1);
    completeLines.push(line);
    if (/^\d{3} /.test(line)) return buffer.slice(0, consumed);
  }
  return null;
}

function assertSmtpCode(response: string, expectedCodes: number[]) {
  const match = response.match(/(\d{3})[ -]/);
  const code = match ? Number(match[1]) : 0;
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP returned ${response.trim().slice(0, 300)}`);
  }
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function buildMimeMessage(payload: EmailPayload & { from: string }) {
  const headers = [
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Subject: ${encodeMimeHeader(payload.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: multipart/alternative; boundary=\"airgsa-boundary\"",
  ];
  return dotStuff([
    headers.join("\r\n"),
    "",
    "--airgsa-boundary",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    payload.text,
    "--airgsa-boundary",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    payload.html,
    "--airgsa-boundary--",
  ].join("\r\n"));
}

function encodeMimeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=` : value;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n\./g, "\r\n..");
}
