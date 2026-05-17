"use client";

import { useEffect, useState } from "react";
import { Edit3, Plus } from "lucide-react";
import { CampaignCard, CampaignChannelTeaser } from "@/components/dashboard/campaign-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Campaign, CampaignStatus, CampaignType } from "@/lib/types";

type CampaignForm = {
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: string;
  body: string;
  scheduledFor: string;
};

const emptyForm: CampaignForm = {
  title: "",
  type: "promotion",
  status: "draft",
  audience: "Local customer accounts",
  body: "",
  scheduledFor: "",
};

export default function GsaCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/campaigns", { cache: "no-store" });
    const data = await res.json();
    setCampaigns(res.ok ? data.campaigns ?? [] : []);
    if (!res.ok) setError(data.error ?? "Campaigns could not be loaded");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate((value) => !value);
  }

  function openEdit(campaign: Campaign) {
    setEditingId(campaign.id);
    setForm({
      title: campaign.title,
      type: campaign.type,
      status: campaign.status,
      audience: campaign.audience,
      body: campaign.body,
      scheduledFor: campaign.scheduledFor ?? "",
    });
    setShowCreate(true);
  }

  async function saveCampaign() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/campaigns/${editingId}` : "/api/campaigns", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, channels: ["platform"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Campaign could not be saved");
      setForm(emptyForm);
      setEditingId(null);
      setShowCreate(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setCampaignStatus(campaign: Campaign, status: CampaignStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Campaign status could not be updated");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const partnerCampaigns = campaigns.filter((campaign) => campaign.authorRole === "airline" && campaign.status === "published");
  const myCampaigns = campaigns.filter((campaign) => campaign.authorRole === "gsa");
  const myPublished = myCampaigns.filter((campaign) => campaign.status === "published");
  const myDrafts = myCampaigns.filter((campaign) => campaign.status === "draft");
  const myScheduled = myCampaigns.filter((campaign) => campaign.status === "scheduled");
  const myArchived = myCampaigns.filter((campaign) => campaign.status === "archived");

  return (
    <>
      <Topbar title="Marketing Campaigns" subtitle="Persistent platform posts for airline partners and local customers" />
      <main className="space-y-8 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">From your airline partners</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Published platform updates from airlines you work with.
              </p>
            </div>
            <Badge variant="muted">{partnerCampaigns.length} active</Badge>
          </div>

          {partnerCampaigns.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {partnerCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-muted">No published campaigns from airline partners yet.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Your campaigns</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Content you create and distribute to your local market on behalf of your represented airlines.
              </p>
            </div>
            <Button className="gap-2" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </div>

          {showCreate && (
            <Card>
              <CardContent className="grid gap-3 p-5 lg:grid-cols-2">
                <Field label="Title"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                <Field label="Audience"><Input value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))} /></Field>
                <Field label="Type">
                  <Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CampaignType }))}>
                    <option value="route_announcement">Route announcement</option>
                    <option value="capacity_highlight">Capacity highlight</option>
                    <option value="news_update">News update</option>
                    <option value="promotion">Promotion</option>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CampaignStatus }))}>
                    <option value="draft">Draft</option>
                    <option value="published">Publish now</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
                {form.status === "scheduled" && <Field label="Scheduled for"><Input type="date" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} /></Field>}
                <div className="lg:col-span-2">
                  <Field label="Body"><Textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></Field>
                </div>
                <div className="lg:col-span-2">
                  <Button disabled={saving || !form.title || !form.body} onClick={saveCampaign}>{editingId ? "Update campaign" : "Save campaign"}</Button>
                  {editingId && <Button className="ml-2" variant="outline" disabled={saving} onClick={() => { setEditingId(null); setForm(emptyForm); setShowCreate(false); }}>Cancel edit</Button>}
                </div>
              </CardContent>
            </Card>
          )}

          <CampaignList title="Published" variant="success" campaigns={myPublished} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />
          <CampaignList title="Scheduled" variant="warning" campaigns={myScheduled} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />
          <CampaignList title="Drafts" variant="muted" campaigns={myDrafts} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />
          <CampaignList title="Archived" variant="muted" campaigns={myArchived} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />

          {myCampaigns.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-muted">No local campaigns yet. Create your first persistent post when you have a real customer message.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <CampaignChannelTeaser />
      </main>
    </>
  );
}

function CampaignList({
  title,
  variant,
  campaigns,
  onEdit,
  onStatus,
  saving,
}: {
  title: string;
  variant: "success" | "warning" | "muted";
  campaigns: Campaign[];
  onEdit: (campaign: Campaign) => void;
  onStatus: (campaign: Campaign, status: CampaignStatus) => void;
  saving: boolean;
}) {
  if (campaigns.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
        <Badge variant={variant}>{campaigns.length}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="relative">
            <CampaignCard campaign={campaign} />
            <CampaignActions campaign={campaign} onEdit={onEdit} onStatus={onStatus} saving={saving} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignActions({ campaign, onEdit, onStatus, saving }: { campaign: Campaign; onEdit: (campaign: Campaign) => void; onStatus: (campaign: Campaign, status: CampaignStatus) => void; saving: boolean }) {
  return (
    <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="outline" disabled={saving} onClick={() => onEdit(campaign)}>
        <Edit3 className="h-3 w-3" />
        Edit
      </Button>
      {campaign.status !== "published" && <Button size="sm" disabled={saving} onClick={() => onStatus(campaign, "published")}>Publish</Button>}
      {campaign.status !== "draft" && <Button size="sm" variant="outline" disabled={saving} onClick={() => onStatus(campaign, "draft")}>Draft</Button>}
      {campaign.status !== "archived" && <Button size="sm" variant="destructive" disabled={saving} onClick={() => onStatus(campaign, "archived")}>Archive</Button>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}
