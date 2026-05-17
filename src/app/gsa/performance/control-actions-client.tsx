"use client";

import { useState } from "react";
import type { ContractControlAction, ControlActionComment } from "@/lib/services/mandate-execution-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function GsaControlActionsClient({ actions }: { actions: ContractControlAction[] }) {
  const [items, setItems] = useState(actions);
  const [responses, setResponses] = useState<Record<string, string>>(
    Object.fromEntries(actions.map((action) => [action.id, action.gsaResponse ?? ""])),
  );
  const [commentBody, setCommentBody] = useState<Record<string, string>>({});
  const [attachmentName, setAttachmentName] = useState<Record<string, string>>({});
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<Record<string, string>>({});
  const [attachmentMimeType, setAttachmentMimeType] = useState<Record<string, string>>({});
  const [attachmentSize, setAttachmentSize] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const openActions = items.filter((action) => action.status !== "completed" && action.status !== "cancelled");

  async function updateAction(action: ContractControlAction, status: ContractControlAction["status"]) {
    setSavingId(action.id);
    try {
      const res = await fetch(`/api/control-actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          gsaResponse: responses[action.id] ?? "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((current) => current.map((item) => (item.id === data.controlAction.id ? data.controlAction : item)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function addComment(action: ContractControlAction) {
    setSavingId(action.id);
    try {
      const res = await fetch(`/api/control-actions/${action.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody[action.id] ?? "",
          attachmentName: attachmentName[action.id] ?? "",
          attachmentDataUrl: attachmentDataUrl[action.id],
          attachmentMimeType: attachmentMimeType[action.id],
          attachmentSize: attachmentSize[action.id],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((current) => current.map((item) => (
          item.id === action.id
            ? { ...item, status: item.status === "open" ? "in-progress" : item.status, comments: [...(item.comments ?? []), data.comment as ControlActionComment] }
            : item
        )));
        setCommentBody((current) => ({ ...current, [action.id]: "" }));
        setAttachmentName((current) => ({ ...current, [action.id]: "" }));
        setAttachmentDataUrl((current) => ({ ...current, [action.id]: "" }));
        setAttachmentMimeType((current) => ({ ...current, [action.id]: "" }));
        setAttachmentSize((current) => ({ ...current, [action.id]: 0 }));
      }
    } finally {
      setSavingId(null);
    }
  }

  if (openActions.length === 0) {
    return (
      <div className="rounded-lg border border-success/25 bg-success-bg p-4 text-sm text-success">
        No airline-issued control actions are open.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {openActions.map((action) => (
        <div key={action.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant(action.severity)}>{action.severity}</Badge>
            <Badge variant={statusVariant(action.status)}>{action.status}</Badge>
            <p className="font-semibold text-ink">{action.title}</p>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{action.airline} - {action.market} - due {action.dueDate ?? "not set"}</p>
          {action.description && <p className="mt-2 text-sm text-ink-muted">{action.description}</p>}
          {action.sourceRiskReasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {action.sourceRiskReasons.map((reason) => <Badge key={reason} variant="warning">{reason}</Badge>)}
            </div>
          )}
          {(action.comments ?? []).length > 0 && (
            <div className="mt-3 space-y-2 border-t border-border-ui pt-3">
              {(action.comments ?? []).map((comment) => (
                <div key={comment.id} className="rounded-lg border border-border-ui bg-surface p-3 text-sm">
                  <p className="font-semibold text-ink">{comment.createdByName} <span className="font-normal text-ink-muted">({comment.createdByRole})</span></p>
                  {comment.body && <p className="mt-1 text-ink-muted">{comment.body}</p>}
                  {comment.attachmentName && <p className="mt-1 text-xs font-semibold text-brand">Proof: {comment.attachmentName}</p>}
                  {(comment.attachmentUrl || comment.attachmentDataUrl) && (
                    <a className="mt-1 block text-xs font-semibold text-brand underline" href={comment.attachmentUrl ?? comment.attachmentDataUrl} target="_blank" rel="noreferrer">
                      Open proof
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          <Textarea
            className="mt-3"
            value={responses[action.id] ?? ""}
            onChange={(event) => setResponses((current) => ({ ...current, [action.id]: event.target.value }))}
            placeholder="Add recovery plan, update or completion note..."
          />
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px_auto]">
            <Input
              value={commentBody[action.id] ?? ""}
              onChange={(event) => setCommentBody((current) => ({ ...current, [action.id]: event.target.value }))}
              placeholder="Add timeline comment..."
            />
            <label className="flex h-10 cursor-pointer items-center rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink-muted">
              {attachmentName[action.id] || "Attach proof"}
              <Input
                type="file"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await readFileAsDataUrl(file);
                  setAttachmentName((current) => ({ ...current, [action.id]: file.name }));
                  setAttachmentDataUrl((current) => ({ ...current, [action.id]: dataUrl }));
                  setAttachmentMimeType((current) => ({ ...current, [action.id]: file.type }));
                  setAttachmentSize((current) => ({ ...current, [action.id]: file.size }));
                }}
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              disabled={savingId === action.id || (!(commentBody[action.id] ?? "").trim() && !(attachmentName[action.id] ?? "").trim())}
              onClick={() => addComment(action)}
            >
              Add proof
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" disabled={savingId === action.id} onClick={() => updateAction(action, "in-progress")}>
              In progress
            </Button>
            <Button size="sm" disabled={savingId === action.id} onClick={() => updateAction(action, "completed")}>
              Mark completed
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function severityVariant(severity: ContractControlAction["severity"]): "default" | "warning" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "default";
}

function statusVariant(status: ContractControlAction["status"]): "default" | "success" | "warning" | "muted" {
  if (status === "completed") return "success";
  if (status === "in-progress") return "warning";
  if (status === "cancelled") return "muted";
  return "default";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
