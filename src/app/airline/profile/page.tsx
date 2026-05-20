import type { ReactNode } from "react";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { BarChart3, Globe2, Package, PlaneTakeoff, Shield, Users, UserCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { getSession, updateSession } from "@/lib/auth/session";
import { canViewContract, canViewTender } from "@/lib/auth/permissions";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { listLivePartnerContracts, listLiveTenders } from "@/lib/services/tender-workflow-store";

export const dynamic = "force-dynamic";

const DEFAULT_AIRLINE_COLOR = "#1a5aff";

async function updateContactName(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await updateSession({ name });
  revalidatePath("/airline/profile");
}

export default async function AirlineProfilePage() {
  const [session, tenders, contracts] = await Promise.all([
    getSession(),
    listLiveTenders(),
    listLivePartnerContracts(),
  ]);
  const profile = await getAirlineProfile(session);

  const companyName = session?.company?.trim() || "Your airline";
  const initials = getInitials(companyName);
  const visibleTenders = session ? tenders.filter((tender) => canViewTender(session, tender)) : [];
  const visibleContracts = session ? contracts.filter((contract) => canViewContract(session, contract)) : [];
  const activeTenders = visibleTenders.filter((t) => t.status === "open").length;
  const draftTenders = visibleTenders.filter((t) => t.status === "draft").length;
  const gsaCount = new Set(visibleContracts.map((contract) => contract.gsaCompanyId ?? contract.gsaId)).size;

  return (
    <>
      <Topbar title="Airline profile" subtitle={companyName} />
      <main className="space-y-5 p-5">
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${DEFAULT_AIRLINE_COLOR}dd 0%, ${DEFAULT_AIRLINE_COLOR} 100%)` }}
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
                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl text-3xl font-black shadow-xl ${
                  profile.logoPath ? "border border-white/30 bg-white" : "bg-white/20 backdrop-blur-sm"
                }`}
                style={{ height: "4.5rem", width: "4.5rem" }}
              >
                {profile.logoPath ? (
                  <Image src={profile.logoPath} alt={`${companyName} logo`} fill className="object-contain p-2" unoptimized />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{companyName}</h1>
                <p className="mt-0.5 text-sm opacity-80">Cargo partner network profile</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <ProfilePill>IATA not set</ProfilePill>
                  <ProfilePill>ICAO not set</ProfilePill>
                  <ProfilePill>Hub not set</ProfilePill>
                  <ProfilePill>Network profile</ProfilePill>
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

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlaneTakeoff className="h-4 w-4 text-brand" />
                Fleet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyConfig
                title="Fleet not configured yet"
                detail="Add aircraft and tracking settings before fleet data appears in this workspace."
              />
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
              <InfoCell label="Primary hub" value="Not configured" />
              <InfoCell label="Secondary hub" value="Not configured" />
              <InfoCell label="Headquarters" value="Not configured" />
              <InfoCell label="Alliance" value="Not configured" />
              <InfoCell label="Parent group" value="Not configured" />
              <InfoCell label="Key lanes" value="Not configured" />
            </CardContent>
          </Card>
        </div>

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
            value="Not configured"
            detail="Set products during airline onboarding"
          />
          <HighlightCard
            icon={<Shield className="h-5 w-5" />}
            label="Compliance"
            value="Not configured"
            detail="Add certifications before publishing tenders"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-brand" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-5 rounded-xl border border-border-ui bg-surface2 p-4">
              <LogoUploader currentLogo={profile.logoPath} brandColor={DEFAULT_AIRLINE_COLOR} />
              <div className="min-w-0 pt-1">
                <p className="font-semibold text-ink">{companyName}</p>
                <p className="mt-0.5 text-sm text-ink-muted">Upload your airline logo. It is shown to your team and partner-facing surfaces.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCell label="Email" value={session?.email ?? "-"} />
              <InfoCell label="Company" value={companyName} />
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

function ProfilePill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">{children}</span>;
}

function HeroKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs opacity-70">{label}</p>
    </div>
  );
}

function EmptyConfig({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-ui bg-surface2 p-5">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-lg text-sm leading-6 text-ink-muted">{detail}</p>
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

function getInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";
}
