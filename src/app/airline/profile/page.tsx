import type { ReactNode } from "react";
import Image from "next/image";
import { BarChart3, Globe2, Package, PlaneTakeoff, Shield, Users, UserCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { canViewContract, canViewTender } from "@/lib/auth/permissions";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { listLivePartnerContracts, listLiveTenders } from "@/lib/services/tender-workflow-store";
import { AirlineProfileEditor } from "./airline-profile-editor";

export const dynamic = "force-dynamic";

const DEFAULT_AIRLINE_COLOR = "#1a5aff";

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
          style={{
            backgroundColor: DEFAULT_AIRLINE_COLOR,
            backgroundImage: profile.bannerPath
              ? `linear-gradient(90deg, rgba(7, 23, 61, 0.82), rgba(26, 90, 255, 0.58)), url(${profile.bannerPath})`
              : `linear-gradient(135deg, ${DEFAULT_AIRLINE_COLOR}dd 0%, ${DEFAULT_AIRLINE_COLOR} 100%)`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
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
                  <ProfilePill>{profile.iataCode ? `IATA ${profile.iataCode}` : "IATA not set"}</ProfilePill>
                  <ProfilePill>{profile.icaoCode ? `ICAO ${profile.icaoCode}` : "ICAO not set"}</ProfilePill>
                  <ProfilePill>{profile.primaryHub ? `Hub ${profile.primaryHub}` : "Hub not set"}</ProfilePill>
                  <ProfilePill>{profile.bannerPath ? "Banner active" : "Banner not set"}</ProfilePill>
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
              <InfoCell label="Primary hub" value={profile.primaryHub ?? "Not configured"} />
              <InfoCell label="Secondary hub" value={profile.secondaryHub ?? "Not configured"} />
              <InfoCell label="Headquarters" value={profile.headquarters ?? "Not configured"} />
              <InfoCell label="Alliance" value={profile.alliance ?? "Not configured"} />
              <InfoCell label="Parent group" value={profile.parentGroup ?? "Not configured"} />
              <InfoCell label="Key lanes" value={profile.keyLanes ?? "Not configured"} />
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
            value={profile.cargoFocus ?? "Not configured"}
            detail={profile.cargoFocus ? "Shown on airline profile" : "Set products during airline onboarding"}
          />
          <HighlightCard
            icon={<Shield className="h-5 w-5" />}
            label="Compliance"
            value={profile.compliance ?? "Not configured"}
            detail={profile.compliance ? "Visible to internal teams" : "Add certifications before publishing tenders"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-brand" />
              Account and profile settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCell label="Email" value={session?.email ?? "-"} />
              <InfoCell label="Company" value={companyName} />
              <InfoCell label="Role" value="Airline" />
            </div>
            <AirlineProfileEditor profile={profile} contactName={session?.name ?? ""} userAvatarPath={session?.avatarPath} />
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
      <p className="mt-1 line-clamp-2 text-xl font-bold text-ink">{value}</p>
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
