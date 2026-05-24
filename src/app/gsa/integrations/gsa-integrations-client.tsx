"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Plug, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CargoIntegrationSettings } from "@/lib/services/cargo-integration-store";

type FormState = {
  enabled: boolean;
  baseUrl: string;
  authMode: "bearer" | "login";
  agentName: string;
  iataNo: string;
  application: string;
  bearerToken: string;
  username: string;
  password: string;
  company: string;
};

type Notice = { tone: "success" | "error"; text: string } | null;

export function GsaIntegrationsClient({ initialIntegration }: { initialIntegration: CargoIntegrationSettings | null }) {
  const [integration, setIntegration] = useState<CargoIntegrationSettings | null>(initialIntegration);
  const [form, setForm] = useState<FormState>(() => ({
    enabled: initialIntegration?.enabled ?? false,
    baseUrl: initialIntegration?.baseUrl ?? "https://qa.fr8manage.app",
    authMode: initialIntegration?.authMode ?? "bearer",
    agentName: initialIntegration?.agentName ?? "",
    iataNo: initialIntegration?.iataNo ?? "",
    application: initialIntegration?.application ?? "AirGSA",
    bearerToken: "",
    username: "",
    password: "",
    company: "",
  }));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function saveIntegration() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/gsa/integrations/ecargoware", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Integration could not be saved.");
      setIntegration(data.integration);
      setForm((current) => ({ ...current, bearerToken: "", username: "", password: "", company: "" }));
      setNotice({ tone: "success", text: "Integration saved. Credentials are stored encrypted and are not shown again." });
    } catch (error) {
      setNotice({ tone: "error", text: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/gsa/integrations/ecargoware/test", { method: "POST" });
      const data = await res.json();
      if (data.integration) setIntegration(data.integration);
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Connection test failed.");
      setNotice({ tone: "success", text: data.message ?? "Connection test successful." });
    } catch (error) {
      setNotice({ tone: "error", text: (error as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-brand" />
            eCargoWare / WebCargo connection
          </CardTitle>
          <p className="text-sm text-ink-muted">
            Store the cargo-system credentials for this GSA company. The Cargo Workspace will use this connection for rates,
            routes, bookings, updates, and tracking calls.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {notice && (
            <div
              className={`rounded-xl border p-3 text-sm font-semibold ${
                notice.tone === "success"
                  ? "border-success/25 bg-success-bg text-success"
                  : "border-danger/25 bg-danger-bg text-danger"
              }`}
            >
              {notice.text}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Status">
              <label className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-border-ui bg-surface px-3 text-sm font-semibold text-ink">
                Enabled for this GSA
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                  className="h-4 w-4 accent-brand"
                />
              </label>
            </Field>
            <Field label="API base URL">
              <Input
                value={form.baseUrl}
                onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
                placeholder="https://qa.fr8manage.app"
              />
            </Field>
            <Field label="Auth method">
              <Select
                value={form.authMode}
                onChange={(event) => setForm((current) => ({ ...current, authMode: event.target.value === "login" ? "login" : "bearer" }))}
              >
                <option value="bearer">Bearer token</option>
                <option value="login">Username / password token request</option>
              </Select>
            </Field>
            <Field label="Application name">
              <Input
                value={form.application}
                onChange={(event) => setForm((current) => ({ ...current, application: event.target.value }))}
                placeholder="AirGSA"
              />
            </Field>
            <Field label="Default agent name">
              <Input
                value={form.agentName}
                onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))}
                placeholder="DHL Cyprus Ltd"
              />
            </Field>
            <Field label="Default IATA number">
              <Input
                value={form.iataNo}
                onChange={(event) => setForm((current) => ({ ...current, iataNo: event.target.value }))}
                placeholder="12345678901"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border-ui bg-surface2 p-4">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" />
              <p className="font-semibold text-ink">Credentials</p>
              {integration?.hasCredentials && <Badge variant="success">{integration.credentialPreview}</Badge>}
            </div>

            {form.authMode === "bearer" ? (
              <Field label="Bearer token">
                <Input
                  type="password"
                  value={form.bearerToken}
                  onChange={(event) => setForm((current) => ({ ...current, bearerToken: event.target.value }))}
                  placeholder={integration?.hasCredentials ? "Leave empty to keep current token" : "Paste API token"}
                />
              </Field>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Username">
                  <Input
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder={integration?.hasCredentials ? "Leave empty to keep current" : "API username"}
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder={integration?.hasCredentials ? "Leave empty to keep current" : "API password"}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={form.company}
                    onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                    placeholder={integration?.hasCredentials ? "Leave empty to keep current" : "API company"}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={testConnection} disabled={testing || saving || !integration?.hasCredentials || !integration.enabled}>
              <RotateCcw className="h-4 w-4" />
              {testing ? "Testing..." : "Test connection"}
            </Button>
            <Button onClick={saveIntegration} disabled={saving}>
              <ShieldCheck className="h-4 w-4" />
              {saving ? "Saving..." : "Save integration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              label="Enabled"
              ok={integration?.enabled === true}
              detail={integration?.enabled ? "Cargo Workspace can use this connection." : "Calls are blocked until enabled."}
            />
            <StatusRow
              label="Credentials"
              ok={integration?.hasCredentials === true}
              detail={integration?.hasCredentials ? integration.credentialPreview : "No encrypted credentials stored."}
            />
            <StatusRow
              label="Last test"
              ok={integration?.lastTestStatus === "success"}
              detail={integration?.lastTestMessage ?? "Not tested yet."}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported first endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-muted">
            <Endpoint label="Rates and routes" path="/cargo-api/booking/rate-and-routes" />
            <Endpoint label="Request booking" path="/cargo-api/booking/request-booking" />
            <p className="rounded-xl border border-border-ui bg-surface2 p-3">
              The first AirGSA mapping uses the WebCargo request shape you shared: agent, IATA, lane, weight, pieces,
              SHC/product, dimensions, screened cargo, and flight date range.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-ui bg-surface2 p-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-warning" />}
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

function Endpoint({ label, path }: { label: string; path: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface px-3 py-2">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-0.5 font-mono text-xs text-ink-muted">{path}</p>
    </div>
  );
}
