import { Calendar, Eye, Globe, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Campaign, CampaignChannel, CampaignStatus, CampaignType } from "@/lib/types";

const typeLabels: Record<CampaignType, string> = {
  route_announcement: "Route announcement",
  capacity_highlight: "Capacity highlight",
  news_update: "News update",
  promotion: "Promotion",
};

const statusConfig: Record<CampaignStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  published: { label: "Published", variant: "success" },
  scheduled: { label: "Scheduled", variant: "warning" },
  draft: { label: "Draft", variant: "muted" },
};

const channelConfig: Record<CampaignChannel, { label: string; available: boolean }> = {
  platform: { label: "Platform", available: true },
  linkedin: { label: "LinkedIn", available: false },
  instagram: { label: "Instagram", available: false },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const status = statusConfig[campaign.status];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="muted">{typeLabels[campaign.type]}</Badge>
          {campaign.publishedAt && (
            <span className="text-xs text-slate-500">{campaign.publishedAt}</span>
          )}
          {campaign.scheduledFor && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Calendar className="h-3 w-3" />
              Scheduled {campaign.scheduledFor}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-white">{campaign.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{campaign.body}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-400">{campaign.audience}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {campaign.channels.map((ch) => {
              const cfg = channelConfig[ch];
              return (
                <span
                  key={ch}
                  className={`text-xs font-medium px-2 py-0.5 rounded border ${
                    cfg.available
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                      : "border-slate-600/40 bg-slate-800/50 text-slate-500"
                  }`}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>

          {(campaign.reach !== undefined || campaign.engagement !== undefined) && (
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {campaign.reach !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {campaign.reach} reached
                </span>
              )}
              {campaign.engagement !== undefined && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {campaign.engagement} engaged
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignChannelTeaser() {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800">
          <Send className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Phase 2 — Coming soon</p>
          <h3 className="mt-1 text-base font-semibold text-white">Social channel distribution</h3>
          <p className="mt-1.5 max-w-xl text-sm text-slate-400">
            Connect LinkedIn, Instagram, and more to extend your reach beyond the platform. Prepare content once, manage it centrally, and distribute it across your digital ecosystem with full control over timing, format, and audience.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["LinkedIn", "Instagram", "X / Twitter", "Facebook"].map((ch) => (
              <span
                key={ch}
                className="rounded border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs text-slate-500"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
