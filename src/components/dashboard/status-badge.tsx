import { Badge } from "@/components/ui/badge";
import type { Status } from "@/lib/types";

const variants: Record<Status, "default" | "success" | "warning" | "danger" | "muted"> = {
  open: "default",
  draft: "muted",
  shortlisted: "warning",
  accepted: "success",
  rejected: "danger",
  active: "success",
  pending: "warning",
  closed: "muted",
  expiring: "danger",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{status}</Badge>;
}

