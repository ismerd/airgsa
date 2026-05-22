import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { Award, Globe2, ShieldCheck, TrendingUp, UserCircle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getFreshSession, updateSession } from "@/lib/auth/session";
import type { RealGsaPartner } from "@/lib/real-gsa-data";
import { AvatarAssetUploader, HeroBannerUpload, HeroLogoUpload } from "@/app/airline/profile/airline-profile-assets";
import { getGsaCompanyProfile } from "@/lib/services/gsa-company-profile";
import { resolveGsaOperationalProfile } from "@/lib/services/gsa-profile";

export const dynamic = "force-dynamic";

async function updateContactName(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await updateSession({ name });
  revalidatePath("/gsa/profile");
}

type RegionDef = { label: string; keywords: string[] };

const ALL_REGIONS: RegionDef[] = [
  { label: "DACH", keywords: ["DACH", "Germany", "Austria", "Switzerland"] },
  { label: "France", keywords: ["France"] },
  { label: "UK / Ireland", keywords: ["UK", "United Kingdom", "Ireland"] },
  { label: "Benelux", keywords: ["Benelux"] },
  { label: "CEE", keywords: ["CEE", "Central Europe", "Eastern Europe"] },
  { label: "MENA", keywords: ["MENA", "Middle East", "North Africa"] },
  { label: "Asia", keywords: ["Asia"] },
  { label: "Americas", keywords: ["Americas"] },
  { label: "Global", keywords: ["Global", "global"] },
];

function isRegionActive(region: RegionDef, gsa: RealGsaPartner): boolean {
  const combined = [...gsa.markets, ...gsa.coverage].join(" ");
  return region.keywords.some((kw) => combined.includes(kw));
}

type StrengthSignal = { icon: ReactNode; label: string; detail: string };

function getStrengthSignals(gsa: RealGsaPartner): StrengthSignal[] {
  const signals: StrengthSignal[] = [];
  if (gsa.complianceScore >= 92)
    signals.push({ icon: <ShieldCheck className="h-5 w-5" />, label: "Compliance Leader", detail: `${gsa.complianceScore}/100 compliance rating — top decile across all platform GSAs` });
  if (gsa.networkScore >= 89)
    signals.push({ icon: <Globe2 className="h-5 w-5" />, label: "Extensive Network", detail: `${gsa.networkScore}/100 network score — broad forwarder and account reach` });
  if (gsa.certifications.includes("GDP"))
    signals.push({ icon: <Award className="h-5 w-5" />, label: "GDP / Pharma Ready", detail: "Certified for pharmaceutical cargo and cold-chain movements" });
  const cargoLower = gsa.cargoFocus.toLowerCase();
  if (cargoLower.includes("e-commerce") || cargoLower.includes("digital"))
    signals.push({ icon: <Zap className="h-5 w-5" />, label: "Digital & E-Commerce", detail: "Scalable digital sales capability for high-frequency e-commerce lanes" });
  if (cargoLower.includes("time-critical") || cargoLower.includes("automotive") || cargoLower.includes("aog") || cargoLower.includes("emergency"))
    signals.push({ icon: <Zap className="h-5 w-5" />, label: "Time-Critical Specialist", detail: "Proven capability for AOG, automotive, and emergency urgent freight" });
  const allMarkets = [...gsa.markets, ...gsa.coverage].join(" ").toLowerCase();
  if (allMarkets.includes("mena") || allMarkets.includes("middle east"))
    signals.push({ icon: <Globe2 className="h-5 w-5" />, label: "MENA Trade Lane", detail: "Active Middle East & North Africa market coverage" });
  if (allMarkets.includes("asia"))
    signals.push({ icon: <Globe2 className="h-5 w-5" />, label: "Asia Trade Lane", detail: "Active Asia-Pacific lane coverage and forwarding account access" });
  if (gsa.winRate >= 36)
    signals.push({ icon: <TrendingUp className="h-5 w-5" />, label: "High Win Rate", detail: `${gsa.winRate}% mandate win rate — above platform average` });
  return signals.slice(0, 3);
}

function RadarChart({
  network, financial, compliance, marketDepth, trackRecord,
}: {
  network: number; financial: number; compliance: number; marketDepth: number; trackRecord: number;
}) {
  const cx = 140;
  const cy = 140;
  const maxR = 90;
  const labelR = 118;
  const labels = ["Network", "Financial", "Compliance", "Market Depth", "Track Record"];
  const scores = [network, financial, compliance, marketDepth, trackRecord];
  const angles = [0, 1, 2, 3, 4].map((i) => ((i * 72 - 90) * Math.PI) / 180);
  const gridLevels = [0.25, 0.5, 0.75, 1];

  function pt(r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const scorePoints = scores
    .map((s, i) => {
      const p = pt(maxR * (s / 100), angles[i]);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-[260px] mx-auto">
      {gridLevels.map((level, li) => {
        const pts = angles
          .map((a) => {
            const p = pt(maxR * level, a);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(" ");
        return (
          <polygon
            key={li}
            points={pts}
            fill={level === 1 ? "var(--brand-xlight)" : "none"}
            stroke="var(--border-ui)"
            strokeWidth={li === gridLevels.length - 1 ? 1.5 : 0.8}
          />
        );
      })}
      {angles.map((angle, i) => {
        const end = pt(maxR, angle);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x.toFixed(1)}
            y2={end.y.toFixed(1)}
            stroke="var(--border-ui)"
            strokeWidth={0.8}
          />
        );
      })}
      <polygon
        points={scorePoints}
        fill="var(--brand)"
        fillOpacity={0.2}
        stroke="var(--brand)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const p = pt(maxR * (s / 100), angles[i]);
        return (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={5}
            fill="var(--brand)"
            stroke="white"
            strokeWidth={1.5}
          />
        );
      })}
      {labels.map((label, i) => {
        const lp = pt(labelR, angles[i]);
        const anchor = Math.abs(lp.x - cx) < 8 ? "middle" : lp.x < cx ? "end" : "start";
        const words = label.split(" ");
        const lineH = 13;
        const baseY = words.length > 1 ? lp.y - lineH / 2 : lp.y;
        return (
          <text
            key={i}
            textAnchor={anchor}
            fontSize={10}
            fontWeight={600}
            fill="var(--ink-muted)"
            fontFamily="inherit"
          >
            {words.map((word, wi) => (
              <tspan key={wi} x={lp.x.toFixed(1)} y={(baseY + wi * lineH).toFixed(1)}>
                {word}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

export default async function GsaCompanyProfilePage() {
  const session = await getFreshSession();
  const [profile, assets] = await Promise.all([
    resolveGsaOperationalProfile(session),
    getGsaCompanyProfile(session),
  ]);

  const marketDepth = Math.min(100, profile.coverage.length * 25);
  const trackRecord = Math.min(100, Math.round(profile.winRate * 2.5));
  const activeRegions = ALL_REGIONS.filter((r) => isRegionActive(r, profile));
  const inactiveRegions = ALL_REGIONS.filter((r) => !isRegionActive(r, profile));
  const signals = getStrengthSignals(profile);
  const canManageBrand = session?.role === "admin" || session?.accessRole === "owner" || session?.accessRole === "admin";
  const initials = getInitials(profile.name);

  return (
    <>
      <Topbar title="GSA company profile" subtitle={profile.name} />
      <main className="space-y-5 p-5">

        {/* ── Hero Banner ── */}
        <div
          className="group relative overflow-hidden rounded-2xl p-6 text-white shadow-sm"
          style={{
            backgroundColor: profile.color,
            backgroundImage: assets.bannerPath
              ? `linear-gradient(90deg, rgba(7, 23, 61, 0.82), ${profile.color}99), url(${assets.bannerPath})`
              : `linear-gradient(135deg, ${profile.color}dd 0%, ${profile.color} 100%)`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <HeroBannerUpload currentPath={assets.bannerPath} canManageBrand={canManageBrand} uploadEndpoint="/api/gsa/profile/assets" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative z-20 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <HeroLogoUpload
                currentPath={assets.logoPath}
                companyName={profile.name}
                initials={initials}
                canManageBrand={canManageBrand}
                uploadEndpoint="/api/gsa/profile/assets"
              />
              <div>
                <h1 className="text-2xl font-black tracking-tight">{profile.name}</h1>
                <p className="mt-0.5 text-sm opacity-80">{profile.headquarters}</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed opacity-75">{profile.cargoFocus}</p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <HeroKpi label="Network" value={profile.networkScore} unit="/100" />
              <HeroKpi label="Financial" value={profile.financialScore} unit="/100" />
              <HeroKpi label="Compliance" value={profile.complianceScore} unit="/100" />
              <HeroKpi label="Win Rate" value={profile.winRate} unit="%" />
            </div>
          </div>
          <div className="relative z-20 mt-4 flex flex-wrap gap-2">
            {profile.certifications.map((cert) => (
              <span
                key={cert}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>

        {/* ── Radar + Coverage ── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Capability radar
              </CardTitle>
              <p className="text-xs text-ink-muted">Five-axis view across key mandate dimensions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadarChart
                network={profile.networkScore}
                financial={profile.financialScore}
                compliance={profile.complianceScore}
                marketDepth={marketDepth}
                trackRecord={trackRecord}
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                  Market Depth = coverage breadth
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                  Track Record = win rate scaled
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-brand" />
                Market coverage
              </CardTitle>
              <p className="text-xs text-ink-muted">Active regions presented to airlines on every application</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Active markets</p>
                <div className="flex flex-wrap gap-2">
                  {activeRegions.map((r) => (
                    <span
                      key={r.label}
                      className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
              {inactiveRegions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Out of scope</p>
                  <div className="flex flex-wrap gap-2">
                    {inactiveRegions.map((r) => (
                      <span
                        key={r.label}
                        className="rounded-lg border border-border-ui px-3 py-1.5 text-xs font-medium text-ink-faint"
                      >
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border-ui bg-surface2 p-4 text-sm leading-6 text-ink-muted">
                {profile.summary}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Strength Signals ── */}
        {signals.length > 0 && (
          <div
            className={`grid gap-4 ${signals.length === 3 ? "sm:grid-cols-3" : signals.length === 2 ? "sm:grid-cols-2" : ""}`}
          >
            {signals.map((signal, i) => (
              <div key={i} className="rounded-xl border border-brand/20 bg-brand-xlight p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  {signal.icon}
                </div>
                <p className="font-semibold text-ink">{signal.label}</p>
                <p className="mt-1 text-sm text-ink-muted">{signal.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Score Bars ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              Score breakdown
            </CardTitle>
            <p className="text-xs text-ink-muted">Scores are calculated by the platform based on verified data and transaction history</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ScoreBar label="Network score" value={profile.networkScore} color="var(--brand)" />
            <ScoreBar label="Financial score" value={profile.financialScore} color="var(--brand)" />
            <ScoreBar label="Compliance score" value={profile.complianceScore} color="var(--success)" />
            <ScoreBar label="Win rate" value={profile.winRate} color="var(--cyan-accent)" unit="%" maxOverride={50} />
          </CardContent>
        </Card>

        {/* ── Account ── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-brand" />
                Account
              </CardTitle>
              <p className="mt-1 text-sm text-ink-muted">Hover your photo to update your personal workspace image.</p>
            </div>
            <AvatarAssetUploader currentPath={session?.avatarPath} uploadEndpoint="/api/gsa/profile/assets" variant="compact" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCell label="Email" value={session?.email ?? profile.email} />
              <InfoCell label="Primary contact" value={profile.contactName} />
              <InfoCell label="Role" value="GSA" />
            </div>
            <form action={updateContactName} className="rounded-xl border border-border-ui p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Account display name
              </label>
              <div className="flex items-center gap-3">
                <input
                  name="name"
                  defaultValue={session?.name ?? profile.contactName}
                  className="min-w-0 flex-1 rounded-lg border border-border-ui bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
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
            <p className="rounded-xl border border-border-ui bg-surface2 p-4 text-sm leading-6 text-ink-muted">
              This profile is auto-attached to every tender application this GSA submits. Airlines see company identity,
              coverage, certifications, score signals, and the commercial proposal together in their decision room.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function getInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "G";
}

function HeroKpi({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black leading-none">
        {value}
        <span className="text-base font-semibold opacity-70">{unit}</span>
      </p>
      <p className="mt-1 text-xs opacity-70">{label}</p>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  color,
  unit = "/100",
  maxOverride,
}: {
  label: string;
  value: number;
  color: string;
  unit?: string;
  maxOverride?: number;
}) {
  const max = maxOverride ?? 100;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-sm font-bold text-ink">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface3">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
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
