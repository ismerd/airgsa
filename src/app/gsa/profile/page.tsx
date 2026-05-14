import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Building2, Mail, MapPin, ShieldCheck, TrendingUp, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { realGsaPartners } from "@/lib/real-gsa-data";

export const dynamic = "force-dynamic";

async function updateContactName(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const cookieStore = await cookies();
  const raw = cookieStore.get("airgsa-session")?.value;
  if (!raw) return;

  try {
    const session = JSON.parse(raw);
    session.name = name;
    cookieStore.set("airgsa-session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  } catch {
    return;
  }

  revalidatePath("/gsa/profile");
}

export default async function GsaCompanyProfilePage() {
  const session = await getSession();
  const profile = realGsaPartners.find((partner) => partner.email === session?.email) ??
    realGsaPartners.find((partner) => partner.name === session?.company) ??
    realGsaPartners[0];

  return (
    <>
      <Topbar title="GSA company profile" subtitle={profile.name} />
      <main className="space-y-6 p-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand" />
              Company identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-5 rounded-xl border border-border-ui bg-surface2 p-5 md:flex-row md:items-center">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm"
                style={{ backgroundColor: profile.color }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-ink">{profile.name}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                  <MapPin className="h-4 w-4" />
                  {profile.headquarters}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{profile.summary}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCell label="Cargo focus" value={profile.cargoFocus} />
              <InfoCell label="Country" value={profile.country} />
              <InfoCell label="Markets" value={profile.markets.join(", ")} />
              <InfoCell label="Coverage" value={profile.coverage.join(", ")} />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((item) => (
                  <Badge key={item} variant="success">{item}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Sales capability profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Network score" value={`${profile.networkScore}/100`} />
              <Metric label="Financial score" value={`${profile.financialScore}/100`} />
              <Metric label="Compliance score" value={`${profile.complianceScore}/100`} />
              <Metric label="Win rate" value={`${profile.winRate}%`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-brand" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCell label="Email" value={session?.email ?? profile.email} />
                <InfoCell label="Role" value="GSA" />
              </div>
              <div className="rounded-xl border border-border-ui bg-surface2 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Mail className="h-4 w-4 text-brand" />
                  Primary contact
                </p>
                <p className="mt-1 text-sm text-ink-muted">{profile.contactName} - {profile.email}</p>
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
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Airline-facing profile data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-ink-muted">
              This is the profile data that is attached automatically when this GSA submits a tender application.
              Airlines see the company identity, coverage, certifications, score signals, and proposal documents together.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
