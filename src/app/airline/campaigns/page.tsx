import { Edit3, Plus } from "lucide-react";
import { CampaignCard, CampaignChannelTeaser } from "@/components/dashboard/campaign-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { airlineCampaigns } from "@/lib/services/platform";

export default function AirlineCampaignsPage() {
  const published = airlineCampaigns.filter((c) => c.status === "published");
  const scheduled = airlineCampaigns.filter((c) => c.status === "scheduled");
  const drafts = airlineCampaigns.filter((c) => c.status === "draft");

  const totalReach = airlineCampaigns.reduce((sum, c) => sum + (c.reach ?? 0), 0);
  const totalEngagement = airlineCampaigns.reduce((sum, c) => sum + (c.engagement ?? 0), 0);

  return (
    <>
      <Topbar title="Marketing Campaigns" subtitle="One source of truth" />
      <main className="space-y-6 p-5">

        <div className="flex items-center justify-between">
          <p className="max-w-xl text-sm text-ink-muted">
            Publish route announcements, capacity highlights, and updates directly to your GSA partners. No duplication. No inconsistencies.
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total campaigns", value: airlineCampaigns.length },
            { label: "Published", value: published.length },
            { label: "Scheduled", value: scheduled.length },
            { label: "Total reach", value: totalReach },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
                <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {published.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Published</h2>
              <Badge variant="success">{published.length}</Badge>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {published.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          </section>
        )}

        {scheduled.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Scheduled</h2>
              <Badge variant="warning">{scheduled.length}</Badge>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {scheduled.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          </section>
        )}

        {drafts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Drafts</h2>
              <Badge variant="muted">{drafts.length}</Badge>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {drafts.map((c) => (
                <div key={c.id} className="relative">
                  <CampaignCard campaign={c} />
                  <div className="absolute right-4 top-4">
                    <button className="flex items-center gap-1.5 rounded border border-border-ui bg-surface2 px-2.5 py-1 text-xs text-ink-muted hover:text-ink transition-colors">
                      <Edit3 className="h-3 w-3" />
                      Edit draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <CampaignChannelTeaser />
      </main>
    </>
  );
}
