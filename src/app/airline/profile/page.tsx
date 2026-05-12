import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Building2, UserCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { getSession } from "@/lib/auth/session";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { SAUDIA_CARGO } from "@/lib/saudia-cargo-data";

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

  revalidatePath("/airline/profile");
}

export default async function AirlineProfilePage() {
  const [session, profile] = await Promise.all([
    getSession(),
    Promise.resolve(getAirlineProfile()),
  ]);

  return (
    <>
      <Topbar title="Airline profile" subtitle="Saudia Cargo" />
      <main className="space-y-6 p-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand" />
              Airline identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-5 rounded-xl border border-border-ui bg-surface2 p-5">
              <LogoUploader currentLogo={profile.logoPath} brandColor={SAUDIA_CARGO.color} />
              <div>
                <p className="text-2xl font-bold tracking-tight text-ink">{SAUDIA_CARGO.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">Member of the Saudia Group · Saudi Arabia</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="text-ink-muted">
                    IATA <span className="ml-1 font-mono font-bold text-ink">{SAUDIA_CARGO.iata}</span>
                  </span>
                  <span className="text-ink-muted">
                    ICAO <span className="ml-1 font-mono font-bold text-ink">{SAUDIA_CARGO.icao}</span>
                  </span>
                  <span className="text-ink-muted">
                    Hub <span className="ml-1 font-mono font-bold text-ink">{SAUDIA_CARGO.hub}</span>
                  </span>
                  <span className="text-ink-muted">
                    Secondary <span className="ml-1 font-mono font-bold text-ink">{SAUDIA_CARGO.secondaryHub}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCell label="Fleet type" value="Boeing 777F · Boeing 747-8F" />
              <InfoCell label="Primary hub" value="Jeddah (JED)" />
              <InfoCell label="Secondary hub" value="Riyadh (RUH)" />
              <InfoCell label="Headquarters" value="Jeddah, Saudi Arabia" />
              <InfoCell label="Parent group" value="Saudia Airlines" />
              <InfoCell label="Alliance" value="SkyTeam Cargo" />
            </div>
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
              <InfoCell label="Email" value={session?.email ?? "—"} />
              <InfoCell label="Company" value={session?.company ?? "—"} />
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
