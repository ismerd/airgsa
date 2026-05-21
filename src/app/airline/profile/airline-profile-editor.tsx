"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, Loader2, Upload, UserCircle, XCircle } from "lucide-react";
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

type AssetKind = "logo" | "banner" | "avatar";

export function AirlineProfileEditor({
  profile,
  contactName,
  userAvatarPath,
}: {
  profile: EditableAirlineProfile;
  contactName: string;
  userAvatarPath?: string;
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Brand assets</h2>
            <p className="mt-1 text-sm text-ink-muted">These visuals appear in the airline workspace and partner-facing profile surfaces.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
          <ProfileAssetUploader
            kind="banner"
            label="Workspace banner"
            detail="Wide header image for the airline profile hero."
            currentPath={profile.bannerPath}
            aspect="banner"
          />
          <ProfileAssetUploader
            kind="logo"
            label="Airline logo"
            detail="Shown in navigation, tenders, and partner-facing views."
            currentPath={profile.logoPath}
            aspect="square"
          />
          <ProfileAssetUploader
            kind="avatar"
            label="Your photo"
            detail="Shown next to your personal account inside the workspace."
            currentPath={userAvatarPath}
            aspect="avatar"
          />
        </div>
      </section>

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

function ProfileAssetUploader({
  kind,
  label,
  detail,
  currentPath,
  aspect,
}: {
  kind: AssetKind;
  label: string;
  detail: string;
  currentPath?: string;
  aspect: "banner" | "square" | "avatar";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(currentPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.append("kind", kind);
    body.append("asset", file);
    try {
      const response = await fetch("/api/airline/profile/assets", { method: "POST", body });
      const data = (await response.json()) as Record<string, string | undefined> & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      const nextPath = data.logoPath ?? data.bannerPath ?? data.avatarPath;
      setPath(nextPath ? `${nextPath}?v=${Date.now()}` : undefined);
      router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/airline/profile/assets?kind=${kind}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Remove failed.");
        return;
      }
      setPath(undefined);
      router.refresh();
    } catch {
      setError("Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  const previewClass = aspect === "banner"
    ? "h-28 w-full rounded-xl"
    : aspect === "avatar"
      ? "h-20 w-20 rounded-full"
      : "h-20 w-20 rounded-2xl";

  return (
    <div className="rounded-xl border border-border-ui bg-surface p-4">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-border-ui bg-brand-light text-brand transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 ${previewClass}`}
        >
          {path ? (
            <Image src={path} alt={label} fill className={aspect === "banner" ? "object-cover" : "object-contain p-2"} unoptimized />
          ) : aspect === "avatar" ? (
            <UserCircle className="h-9 w-9" />
          ) : aspect === "banner" ? (
            <ImageIcon className="h-9 w-9" />
          ) : (
            <Camera className="h-9 w-9" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity hover:opacity-100">
            {busy ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Upload className="h-5 w-5 text-white" />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{label}</p>
          <p className="mt-1 text-sm leading-5 text-ink-muted">{detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-lg border border-border-ui px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface2 disabled:opacity-60">
              Upload
            </button>
            {path && (
              <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-danger/25 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-bg disabled:opacity-60">
                <XCircle className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
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
