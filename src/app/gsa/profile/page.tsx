import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { gsaProfiles } from "@/lib/services/platform";

export default function GsaCompanyProfilePage() {
  const profile = gsaProfiles[0];
  return (
    <>
      <Topbar title="GSA company profile" subtitle={profile.name} />
      <main className="grid gap-5 p-5 xl:grid-cols-[.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{profile.name}</CardTitle>
            <p className="text-sm text-ink-muted">{profile.headquarters}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-ink-muted">{profile.summary}</p>
            <div className="flex flex-wrap gap-2">
              {profile.certifications.map((item) => <Badge key={item} variant="success">{item}</Badge>)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales capability profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Cargo focus" value={profile.cargoFocus} />
            <Field label="Coverage" value={profile.coverage.join(", ")} />
            <Field label="Win rate" value={`${profile.winRate}%`} />
            <Field label="Compliance score" value={`${profile.complianceScore}/100`} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface2 border border-border-ui p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
