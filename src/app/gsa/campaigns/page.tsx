import { Plus } from "lucide-react";
import { CampaignCard, CampaignChannelTeaser } from "@/components/dashboard/campaign-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { airlineCampaigns, gsaCampaigns } from "@/lib/services/platform";

export default function GsaCampaignsPage() {
  const partnerCampaigns = airlineCampaigns.filter((c) => c.status === "published");

  const myPublished = gsaCampaigns.filter((c) => c.status === "published");
  const myDrafts = gsaCampaigns.filter((c) => c.status === "draft");

  return (
    <>
      <Topbar title="Marketing Campaigns" subtitle="One source of truth" />
      <main className="space-y-8 p-5">

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">From your airline partners</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Latest updates, route announcements, and capacity highlights published by the airlines you represent.
              </p>
            </div>
            <Badge variant="muted">{partnerCampaigns.length} active</Badge>
          </div>

          {partnerCampaigns.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {partnerCampaigns.map((c) => (
                <div key={c.id} className="relative">
                  <CampaignCard campaign={c} />
                  <div className="absolute left-5 bottom-[3.4rem]">
                    <span className="text-xs text-ink-muted">by {c.author}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-muted">No campaigns from airline partners yet.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Your campaigns</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Content you create and distribute to your local market on behalf of your airline partners.
              </p>
            </div>
            <Button className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </div>

          {myPublished.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Published</p>
                <Badge variant="success">{myPublished.length}</Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {myPublished.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </div>
          )}

          {myDrafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Drafts</p>
                <Badge variant="muted">{myDrafts.length}</Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {myDrafts.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </div>
          )}

          {gsaCampaigns.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-muted">No campaigns yet. Create your first to start distributing to your local market.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <CampaignChannelTeaser />
      </main>
    </>
  );
}
