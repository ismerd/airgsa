"use client";

import { useState } from "react";
import type { ContractControlAction } from "@/lib/services/mandate-execution-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GsaControlActionsClient({ actions }: { actions: ContractControlAction[] }) {
  const [items, setItems] = useState(actions);
  const [responses, setResponses] = useState<Record<string, string>>(
    Object.fromEntries(actions.map((action) => [action.id, action.gsaResponse ?? ""])),
  );
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
          <Textarea
            className="mt-3"
            value={responses[action.id] ?? ""}
            onChange={(event) => setResponses((current) => ({ ...current, [action.id]: event.target.value }))}
            placeholder="Add recovery plan, update or completion note..."
          />
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
