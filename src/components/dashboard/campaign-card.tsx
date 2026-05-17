import { Calendar, Eye, Globe, ImageIcon, MessageSquare, Send } from "lucide-react";
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
  archived: { label: "Archived", variant: "muted" },
};

const channelConfig: Record<CampaignChannel, { label: string; available: boolean }> = {
  platform: { label: "Platform", available: true },
  linkedin: { label: "LinkedIn", available: false },
  instagram: { label: "Instagram", available: false },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const status = statusConfig[campaign.status];

  return (
    <Card className="overflow-hidden">
      <CampaignBanner campaign={campaign} />
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="muted">{typeLabels[campaign.type]}</Badge>
          {campaign.publishedAt && (
            <span className="text-xs text-ink-muted">{campaign.publishedAt}</span>
          )}
          {campaign.scheduledFor && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Calendar className="h-3 w-3" />
              Scheduled {campaign.scheduledFor}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-ink">{campaign.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{campaign.body}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-ui pt-3">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-ink-muted" />
            <span className="text-xs text-ink-muted">{campaign.audience}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {campaign.channels.map((ch) => {
              const cfg = channelConfig[ch];
              return (
                <span
                  key={ch}
                  className={`text-xs font-medium px-2 py-0.5 rounded border ${
                    cfg.available
                      ? "border-brand/30 bg-brand-light text-brand"
                      : "border-slate-600/40 bg-slate-800/50 text-ink-muted"
                  }`}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>

          {(campaign.reach !== undefined || campaign.engagement !== undefined) && (
            <div className="flex items-center gap-4 text-xs text-ink-muted">
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

function CampaignBanner({ campaign }: { campaign: Campaign }) {
  if (campaign.bannerImageUrl) {
    return (
      <div className="relative h-40 border-b border-border-ui bg-surface2 sm:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={campaign.bannerImageUrl}
          alt={`${campaign.title} banner`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <CampaignLogo campaign={campaign} className="absolute bottom-3 left-4" />
      </div>
    );
  }

  return (
    <div className="relative flex h-40 items-center justify-between overflow-hidden border-b border-border-ui bg-[linear-gradient(135deg,#07111f_0%,#0e7490_48%,#d9f99d_100%)] px-5 sm:h-44">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.28),transparent_28%)]" />
      <div className="relative max-w-[68%]">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-950/80">Airline post</p>
        <p className="mt-2 line-clamp-2 text-xl font-semibold leading-tight text-white">{campaign.title}</p>
      </div>
      <CampaignLogo campaign={campaign} className="relative" large />
      <div className="absolute bottom-3 left-5 flex items-center gap-1.5 text-xs font-medium text-cyan-950/70">
        <ImageIcon className="h-3.5 w-3.5" />
        Logo fallback
      </div>
    </div>
  );
}

function CampaignLogo({
  campaign,
  className,
  large = false,
}: {
  campaign: Campaign;
  className?: string;
  large?: boolean;
}) {
  const initials = getInitials(campaign.author);
  const sizeClass = large ? "h-20 w-20 text-xl" : "h-11 w-11 text-sm";

  if (campaign.airlineLogoUrl) {
    return (
      <div className={`${sizeClass} ${className ?? ""} grid place-items-center rounded-md border border-white/20 bg-white p-2 shadow-lg`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={campaign.airlineLogoUrl} alt={`${campaign.author} logo`} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${className ?? ""} grid place-items-center rounded-md border border-white/20 bg-slate-950/90 font-semibold text-cyan-200 shadow-lg`}
      aria-label={`${campaign.author} logo`}
    >
      {initials}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CampaignChannelTeaser() {
  return (
    <div className="rounded-lg border border-dashed border-border-ui bg-surface p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface2">
          <Send className="h-5 w-5 text-ink-muted" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Phase 2 — Coming soon</p>
          <h3 className="mt-1 text-base font-semibold text-ink">Social channel distribution</h3>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
            Connect LinkedIn, Instagram, and more to extend your reach beyond the platform. Prepare content once, manage it centrally, and distribute it across your digital ecosystem with full control over timing, format, and audience.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["LinkedIn", "Instagram", "X / Twitter", "Facebook"].map((ch) => (
              <span
                key={ch}
                className="rounded border border-border-ui bg-surface2 px-3 py-1 text-xs text-ink-muted"
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
