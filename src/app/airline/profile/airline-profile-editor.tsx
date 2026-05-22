"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AirportCodePicker } from "@/components/dashboard/freight-field-selects";

type EditableAirlineProfile = {
  iataCode?: string;
  icaoCode?: string;
  primaryHub?: string;
  secondaryHub?: string;
  headquarters?: string;
  alliance?: string;
  parentGroup?: string;
  keyLanes?: string;
  cargoFocus?: string;
  compliance?: string;
  logoPath?: string;
  bannerPath?: string;
};

export function AirlineProfileEditor({
  profile,
  contactName,
}: {
  profile: EditableAirlineProfile;
  contactName: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactName,
    iataCode: profile.iataCode ?? "",
    icaoCode: profile.icaoCode ?? "",
    primaryHub: profile.primaryHub ?? "",
    secondaryHub: profile.secondaryHub ?? "",
    headquarters: profile.headquarters ?? "",
    alliance: profile.alliance ?? "",
    parentGroup: profile.parentGroup ?? "",
    keyLanes: profile.keyLanes ?? "",
    cargoFocus: profile.cargoFocus ?? "",
    compliance: profile.compliance ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function saveProfile() {
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch("/api/airline/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Profile could not be saved.");
        return;
      }
      setMessage("Profile saved.");
      router.refresh();
    } catch {
      setError("Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border-ui bg-surface2 p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Airline profile data</h2>
            <p className="mt-1 text-sm text-ink-muted">Keep this operational profile accurate before publishing tenders or onboarding GSAs.</p>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Save profile
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Contact name">
            <input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} className={inputClass} placeholder="Primary account contact" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="IATA code">
              <input value={form.iataCode} onChange={(event) => setForm((current) => ({ ...current, iataCode: codeValue(event.target.value, 2) }))} className={`${inputClass} uppercase`} placeholder="SV" />
            </Field>
            <Field label="ICAO code">
              <input value={form.icaoCode} onChange={(event) => setForm((current) => ({ ...current, icaoCode: codeValue(event.target.value, 3) }))} className={`${inputClass} uppercase`} placeholder="SVA" />
            </Field>
          </div>
          <Field label="Primary hub">
            <AirportCodePicker value={form.primaryHub} onChange={(value) => setForm((current) => ({ ...current, primaryHub: value }))} placeholder="Search primary hub..." />
          </Field>
          <Field label="Secondary hub">
            <AirportCodePicker value={form.secondaryHub} onChange={(value) => setForm((current) => ({ ...current, secondaryHub: value }))} placeholder="Search secondary hub..." />
          </Field>
          <Field label="Headquarters">
            <input value={form.headquarters} onChange={(event) => setForm((current) => ({ ...current, headquarters: event.target.value }))} className={inputClass} placeholder="City, country" />
          </Field>
          <Field label="Alliance">
            <input value={form.alliance} onChange={(event) => setForm((current) => ({ ...current, alliance: event.target.value }))} className={inputClass} placeholder="e.g. SkyTeam Cargo, none" />
          </Field>
          <Field label="Parent group">
            <input value={form.parentGroup} onChange={(event) => setForm((current) => ({ ...current, parentGroup: event.target.value }))} className={inputClass} placeholder="Airline group or holding" />
          </Field>
          <Field label="Key lanes">
            <input value={form.keyLanes} onChange={(event) => setForm((current) => ({ ...current, keyLanes: event.target.value }))} className={inputClass} placeholder="Europe - Middle East - Asia" />
          </Field>
          <Field label="Cargo focus">
            <textarea value={form.cargoFocus} onChange={(event) => setForm((current) => ({ ...current, cargoFocus: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Products and handling focus, e.g. general cargo, pharma, perishables..." />
          </Field>
          <Field label="Compliance">
            <textarea value={form.compliance} onChange={(event) => setForm((current) => ({ ...current, compliance: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Certifications, security programs, handling standards..." />
          </Field>
        </div>

        {(message || error) && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${error ? "bg-danger-bg text-danger" : "bg-success-bg text-success"}`}>
            {error ?? message}
          </p>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function codeValue(value: string, length: number) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
}

const inputClass = "w-full rounded-lg border border-border-ui bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted/45 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
