"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Paperclip } from "lucide-react";
import { DocumentList } from "@/components/dashboard/document-list";
import { FileDropzone, type DroppedFile } from "@/components/dashboard/file-dropzone";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RealGsaPartner } from "@/lib/real-gsa-data";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export function ApplyTenderClient({ tenderId, gsa }: { tenderId: string; gsa: RealGsaPartner }) {
  const router = useRouter();
  const [tender, setTender] = useState<LiveTender | null>(null);
  const [application, setApplication] = useState<LiveTenderApplication | null>(null);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [form, setForm] = useState({
    proposedCommission: "",
    launchTimeline: "",
    namedAccountCoverage: "",
    monthlySalesTarget: "",
    networkPlan: "",
    operationalReadiness: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tenders/${tenderId}`).then((res) => res.json()),
      fetch("/api/applications").then((res) => res.json()),
    ])
      .then(([tenderData, applicationData]) => {
        setTender(tenderData.tender ?? null);
        const existing = (applicationData.applications ?? []).find((item: LiveTenderApplication) => item.tenderId === tenderId) ?? null;
        setApplication(existing);
        if (existing) {
          setForm({
            proposedCommission: existing.proposedCommission,
            launchTimeline: existing.launchTimeline,
            namedAccountCoverage: existing.namedAccountCoverage,
            monthlySalesTarget: existing.monthlySalesTarget,
            networkPlan: existing.networkPlan,
            operationalReadiness: existing.operationalReadiness,
          });
          setFiles(existing.documents);
        }
      });
  }, [tenderId]);

  const canEdit = !application || (application.status === "pending" && Date.now() - new Date(application.submittedAt).getTime() < 24 * 60 * 60 * 1000);

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenders/${tenderId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          documents: files,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Application could not be submitted");
        return;
      }

      router.push("/gsa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title={application ? "Your application" : "Apply to tender"} subtitle={tender?.title ?? "GSA application"} />
      <main className="grid gap-5 p-5 xl:grid-cols-[.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              Auto-attached GSA profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-ink">{gsa.name}</p>
              <p className="mt-1 text-sm text-ink-muted">{gsa.contactName} · {gsa.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {gsa.markets.map((market) => <Badge key={market} variant="muted">{market}</Badge>)}
              {gsa.certifications.map((cert) => <Badge key={cert} variant="success">{cert}</Badge>)}
            </div>
            <ProfileMetric label="Network" value={gsa.networkScore} />
            <ProfileMetric label="Financial" value={gsa.financialScore} />
            <ProfileMetric label="Compliance" value={gsa.complianceScore} />
            <div className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
              {gsa.summary}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercial proposal</CardTitle>
            <p className="text-sm text-ink-muted">
              {application
                ? canEdit
                  ? "You can edit this application for 24 hours after submission."
                  : "The 24-hour edit window is closed. This application is read-only."
                : "These details will be visible to Saudia Cargo in the airline applications page."}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input disabled={!canEdit} placeholder="Proposed commission" value={form.proposedCommission} onChange={(event) => setForm({ ...form, proposedCommission: event.target.value })} />
            <Input disabled={!canEdit} placeholder="Launch timeline" value={form.launchTimeline} onChange={(event) => setForm({ ...form, launchTimeline: event.target.value })} />
            <Input disabled={!canEdit} placeholder="Named account coverage" value={form.namedAccountCoverage} onChange={(event) => setForm({ ...form, namedAccountCoverage: event.target.value })} />
            <Input disabled={!canEdit} placeholder="Monthly sales target" value={form.monthlySalesTarget} onChange={(event) => setForm({ ...form, monthlySalesTarget: event.target.value })} />
            <Textarea
              className="md:col-span-2"
              placeholder="Network plan"
              disabled={!canEdit}
              value={form.networkPlan}
              onChange={(event) => setForm({ ...form, networkPlan: event.target.value })}
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Operational readiness"
              disabled={!canEdit}
              value={form.operationalReadiness}
              onChange={(event) => setForm({ ...form, operationalReadiness: event.target.value })}
            />

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-ink-muted" />
                <p className="text-sm font-semibold text-ink">Supporting documents</p>
              </div>
              {canEdit ? (
                <FileDropzone files={files} onChange={setFiles} hint="Certifications, profile deck, account list, financials, references" />
              ) : (
                <DocumentList documents={files} />
              )}
            </div>

            {error && <p className="md:col-span-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
              <Button disabled={!canEdit || saving || !form.proposedCommission.trim()} onClick={submit}>
                {saving
                  ? "Saving..."
                  : application
                    ? "Update application"
                    : `Submit application${files.length ? ` · ${files.length} document${files.length > 1 ? "s" : ""}` : ""}`}
              </Button>
              <Button asChild variant="outline">
                <Link href={`/gsa/tenders/${tenderId}`}>Back to tender</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-ui bg-surface2 px-3 py-2">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{value}/100</span>
    </div>
  );
}
