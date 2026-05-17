import type { WorkflowNotification } from "@/lib/services/mandate-execution-store";

export async function queueWorkflowEmail(notification: WorkflowNotification) {
  const enabled = process.env.WORKFLOW_EMAIL_ENABLED === "true";
  if (!enabled) return { queued: false, reason: "WORKFLOW_EMAIL_ENABLED is not true" };

  const endpoint = process.env.WORKFLOW_EMAIL_WEBHOOK_URL;
  if (!endpoint) return { queued: false, reason: "WORKFLOW_EMAIL_WEBHOOK_URL is not configured" };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: notification.recipientEmail,
      companyId: notification.recipientCompanyId,
      role: notification.recipientRole,
      subject: notification.title,
      text: notification.body,
      href: notification.href,
      type: notification.type,
      entityId: notification.entityId,
    }),
  });

  return { queued: res.ok, status: res.status };
}
