"use client";

import Link from "next/link";
import { CheckCircle2, Route } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { applications } from "@/lib/services/platform";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";

export function GsaDecisionPanel({ gsaId }: { gsaId: string }) {
  const workflow = useAirlineGsaWorkflow(applications);
  const application = applications.find((item) => item.gsaId === gsaId);
  const assignment = workflow.state.acceptedGsas[gsaId];

  if (!application) {
    return (
      <div className="rounded-md border border-border-ui bg-surface2 p-4 text-sm leading-6 text-ink-muted">
        This GSA has no active application for the current tender round.
      </div>
    );
  }

  const status = workflow.applicationStatus(application);
  const isAccepted = status === "accepted";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border border-border-ui bg-surface2 p-3">
        <span className="text-sm font-medium text-ink-muted">Current status</span>
        <StatusBadge status={status} />
      </div>

      <Button
        className="w-full"
        disabled={isAccepted}
        onClick={() => workflow.setApplicationStatus(application, "accepted")}
      >
        {isAccepted ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Application accepted
          </>
        ) : (
          "Accept application"
        )}
      </Button>
      <Button
        className="w-full"
        variant="secondary"
        disabled={isAccepted}
        onClick={() => workflow.setApplicationStatus(application, "shortlisted")}
      >
        Move to shortlist
      </Button>
      <Button
        className="w-full"
        variant="destructive"
        onClick={() => workflow.setApplicationStatus(application, "rejected")}
      >
        Reject application
      </Button>

      {isAccepted && (
        <Button asChild className="w-full" variant="outline">
          <Link href="/airline/gsa/overview">
            <Route className="h-4 w-4" />
            Assign routes ({assignment?.routeIds.length ?? 0})
          </Link>
        </Button>
      )}

      <div className="rounded-md border border-border-ui bg-surface2 p-4 text-sm leading-6 text-ink-muted">
        Recommended next step: assign routes and request a 90-day account activation plan for those lanes.
      </div>
    </div>
  );
}
