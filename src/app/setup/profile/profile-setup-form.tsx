"use client";

import { useState } from "react";
import type { SessionPayload } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoUploader } from "@/components/dashboard/logo-uploader";

function workspaceHref(role: SessionPayload["role"], accessRole?: SessionPayload["accessRole"]) {
  if (role === "admin") return "/admin";
  if (role === "airline") return "/airline";
  return accessRole === "operator" ? "/gsa/cargo-workspace" : "/gsa";
}

export function ProfileSetupForm({
  session,
  airlineLogoPath,
}: {
  session: SessionPayload;
  airlineLogoPath?: string;
}) {
  const [name, setName] = useState(session.name);
  const [company, setCompany] = useState(session.company);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const destination = workspaceHref(session.role, session.accessRole);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/auth/profile-setup", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, company }),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Profile could not be saved.");
      return;
    }

    window.location.assign(destination);
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">Account setup</p>
        <CardTitle>Finish your AirGSA profile</CardTitle>
        <p className="text-sm text-ink-muted">
          Add the visible account details your team and partners will see. You can skip this and update it later.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {session.role === "airline" && (
          <div className="flex items-start gap-4 rounded-xl border border-border-ui bg-surface2 p-4">
            <LogoUploader currentLogo={airlineLogoPath} brandColor="#0B7A52" />
            <div className="pt-1">
              <p className="font-semibold text-ink">Airline logo</p>
              <p className="mt-1 text-sm leading-5 text-ink-muted">
                Optional. The logo appears in your airline workspace and partner-facing surfaces.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Company display name</span>
            <Input value={company} onChange={(event) => setCompany(event.target.value)} required />
          </label>

          {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Save and continue"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => window.location.assign(destination)}>
              Skip for now
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
