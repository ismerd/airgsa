import type { ReactNode } from "react";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { BarChart3, Globe2, Package, PlaneTakeoff, Shield, Users, UserCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { getSession, updateSession } from "@/lib/auth/session";
import { canViewTender } from "@/lib/auth/permissions";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { SAUDIA_CARGO } from "@/lib/saudia-cargo-data";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { listLiveTenders } from "@/lib/services/tender-workflow-store";

export const dynamic = "force-dynamic";

async function updateContactName(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await updateSession({ name });
  revalidatePath("/airline/profile");
}

export default async function AirlineProfilePage() {
  const [session, profile, tenders] = await Promise.all([
    getSession(),
    Promise.resolve(getAirlineProfile()),
    listLiveTenders(),
  ]);

  const visibleTenders = session ? tenders.filter((tender) => canViewTender(session, tender)) : [];
  const activeTenders = visibleTenders.filter((t) => t.status === "open").length;
  const draftTenders = visibleTenders.filter((t) => t.status === "draft").length;
  const gsaCount = realGsaPartners.length;

  return (
    <>
      <Topbar title="Airline profile" subtitle="Saudia Cargo" />
      <main className="space-y-5 p-5">

        {/* ── Hero Banner ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${SAUDIA_CARGO.color}dd 0%, ${SAUDIA_CARGO.color} 100%)` }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div
                className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-3xl font-black shadow-xl backdrop-blur-sm"
                style={{ height: "4.5rem", width: "4.5rem" }}
              >
                {profile.logoPath ? (
                  <Image src={profile.logoPath} alt="Saudia Cargo" fill className="object-contain p-1" unoptimized />
                ) : (
                  <span>S</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{SAUDIA_CARGO.name}</h1>
                <p className="mt-0.5 text-sm opacity-80">Member of the Saudia Group · Saudi Arabia</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono font-bold">
                    IATA {SAUDIA_CARGO.iata}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono font-bold">
                    ICAO {SAUDIA_CARGO.icao}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">
                    Hub {SAUDIA_CARGO.hub} · {SAUDIA_CARGO.secondaryHub}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">
                    SkyTeam Cargo
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <HeroKpi label="Live tenders" value={activeTenders} />
              <HeroKpi label="GSA partners" value={gsaCount} />
              <HeroKpi label="Draft" value={draftTenders} />
            </div>
          </div>
        </div>

        {/* ── Fleet & Network ── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlaneTakeoff className="h-4 w-4 text-brand" />
                Fleet
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FleetCard type="Boeing 777F" role="Long-haul freighter" capacity="103 t" note="Primary workhorse for intercontinental routes" />
              <FleetCard type="Boeing 747-8F" role="High-capacity freighter" capacity="140 t" note="Heavy-lift for high-density lanes" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-brand" />
                Network overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <InfoCell label="Primary hub" value="Jeddah (JED)" />
              <InfoCell label="Secondary hub" value="Riyadh (RUH)" />
              <InfoCell label="Headquarters" value="Jeddah, Saudi Arabia" />
              <InfoCell label="Alliance" value="SkyTeam Cargo" />
              <InfoCell label="Parent group" value="Saudia Airlines" />
              <InfoCell label="Key lanes" value="Europe · Asia · Americas" />
            </CardContent>
          </Card>
        </div>

        {/* ── Mandate highlights ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HighlightCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Active tenders"
            value={String(activeTenders)}
            detail="Open for GSA applications"
          />
          <HighlightCard
            icon={<Users className="h-5 w-5" />}
            label="GSA partners"
            value={String(gsaCount)}
            detail="Qualified partners on platform"
          />
          <HighlightCard
            icon={<Package className="h-5 w-5" />}
            label="Cargo focus"
            value="General + Pharma"
            detail="GDP-certified handling available"
          />
          <HighlightCard
            icon={<Shield className="h-5 w-5" />}
            label="Compliance"
            value="IATA · CASS"
            detail="Full certification stack"
          />
        </div>

        {/* ── Account ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-brand" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-5 rounded-xl border border-border-ui bg-surface2 p-4">
              <LogoUploader currentLogo={profile.logoPath} brandColor={SAUDIA_CARGO.color} />
              <div className="min-w-0 pt-1">
                <p className="font-semibold text-ink">{SAUDIA_CARGO.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">Upload your airline logo — shown to GSA partners throughout the platform.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCell label="Email" value={session?.email ?? "—"} />
              <InfoCell label="Company" value={session?.company ?? "Saudia Cargo"} />
              <InfoCell label="Role" value="Airline" />
            </div>
            <form action={updateContactName} className="rounded-xl border border-border-ui p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Contact name
              </label>
              <div className="flex items-center gap-3">
                <input
                  name="name"
                  defaultValue={session?.name ?? ""}
                  className="flex-1 rounded-lg border border-border-ui bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder="Your full name"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
                >
                  Save
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function HeroKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs opacity-70">{label}</p>
    </div>
  );
}

function FleetCard({ type, role, capacity, note }: { type: string; role: string; capacity: string; note: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink">{type}</p>
          <p className="text-xs text-ink-muted">{role}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-brand/20 bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
          {capacity}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">{note}</p>
    </div>
  );
}

function HighlightCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
