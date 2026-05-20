"use client";

import { useEffect, useState } from "react";
import { Edit3, Plus } from "lucide-react";
import { CampaignCard } from "@/components/dashboard/campaign-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LivePartnerContract } from "@/lib/services/tender-workflow-store";
import type { Campaign, CampaignStatus, CampaignType } from "@/lib/types";

type CampaignForm = {
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: string;
  targetCompanyIds: string[];
  body: string;
  scheduledFor: string;
  bannerImageUrl: string;
};

const emptyForm: CampaignForm = {
  title: "",
  type: "route_announcement",
  status: "draft",
  audience: "Assigned GSA partners",
  targetCompanyIds: [],
  body: "",
  scheduledFor: "",
  bannerImageUrl: "",
};

export default function AirlineCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [res, contractRes] = await Promise.all([
      fetch("/api/campaigns", { cache: "no-store" }),
      fetch("/api/contracts", { cache: "no-store" }),
    ]);
    const [data, contractData] = await Promise.all([res.json(), contractRes.json()]);
    setCampaigns(res.ok ? data.campaigns ?? [] : []);
    setContracts(contractRes.ok ? contractData.contracts ?? [] : []);
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
      targetCompanyIds: campaign.targetCompanyIds ?? [],
      body: campaign.body,
      scheduledFor: campaign.scheduledFor ?? "",
      bannerImageUrl: campaign.bannerImageUrl ?? "",
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

  const published = campaigns.filter((campaign) => campaign.status === "published");
  const scheduled = campaigns.filter((campaign) => campaign.status === "scheduled");
  const drafts = campaigns.filter((campaign) => campaign.status === "draft");
  const archived = campaigns.filter((campaign) => campaign.status === "archived");
  const totalReach = campaigns.reduce((sum, campaign) => sum + (campaign.reach ?? 0), 0);
  const totalEngagement = campaigns.reduce((sum, campaign) => sum + (campaign.engagement ?? 0), 0);

  return (
    <>
      <Topbar title="Marketing Campaigns" subtitle="Persistent platform posts for GSA partners" />
      <main className="space-y-6 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <div className="flex items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-ink-muted">
            Publish route announcements, capacity highlights and commercial updates directly to assigned GSA partners.
          </p>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardContent className="grid gap-3 p-5 lg:grid-cols-2">
              <Field label="Title"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
              <Field label="Audience">
                <Select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}>
                  <option value="Assigned GSA partners">Assigned GSA partners</option>
                  <option value="Selected GSA partners">Selected GSA partners</option>
                  <option value="All accepted partner contacts">All accepted partner contacts</option>
                  <option value="Route-specific GSA desks">Route-specific GSA desks</option>
                </Select>
              </Field>
              <div className="lg:col-span-2">
                <Field label="Target GSA partners">
                  <div className="grid gap-2 rounded-lg border border-border-ui bg-surface2 p-3 md:grid-cols-2">
                    {getTargetableGsas(contracts).map((partner) => (
                      <label key={partner.companyId} className="flex items-center gap-2 text-sm text-ink-muted">
                        <input
                          type="checkbox"
                          checked={form.targetCompanyIds.includes(partner.companyId)}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            targetCompanyIds: event.target.checked
                              ? [...current.targetCompanyIds, partner.companyId]
                              : current.targetCompanyIds.filter((id) => id !== partner.companyId),
                          }))}
                          className="h-4 w-4 accent-cyan-400"
                        />
                        <span className="font-medium text-ink">{partner.name}</span>
                        <span>{partner.market}</span>
                      </label>
                    ))}
                    {getTargetableGsas(contracts).length === 0 && (
                      <p className="text-sm text-ink-muted">No accepted GSA contracts available for targeting yet.</p>
                    )}
                  </div>
                </Field>
              </div>
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
                <Field label="Banner image URL">
                  <Input value={form.bannerImageUrl} onChange={(event) => setForm((current) => ({ ...current, bannerImageUrl: event.target.value }))} placeholder="https://..." />
                </Field>
              </div>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total campaigns", value: campaigns.length },
            { label: "Published", value: published.length },
            { label: "Scheduled", value: scheduled.length },
            { label: "Total reach", value: totalReach },
            { label: "Engagement", value: totalEngagement },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
                <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CampaignSection title="Published" variant="success" campaigns={published} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />
        <CampaignSection title="Scheduled" variant="warning" campaigns={scheduled} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />

        {drafts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Drafts</h2>
              <Badge variant="muted">{drafts.length}</Badge>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {drafts.map((campaign) => (
                <div key={campaign.id} className="space-y-2">
                  <CampaignCard campaign={campaign} />
                  <CampaignActions campaign={campaign} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />
                </div>
              ))}
            </div>
          </section>
        )}

        <CampaignSection title="Archived" variant="muted" campaigns={archived} onEdit={openEdit} onStatus={setCampaignStatus} saving={saving} />

        {campaigns.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-ink-muted">No campaigns yet. Create a persistent platform post to brief GSA partners.</CardContent>
          </Card>
        )}

      </main>
    </>
  );
}

function CampaignSection({
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
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <Badge variant={variant}>{campaigns.length}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="space-y-2">
            <CampaignCard campaign={campaign} />
            <CampaignActions campaign={campaign} onEdit={onEdit} onStatus={onStatus} saving={saving} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CampaignActions({ campaign, onEdit, onStatus, saving }: { campaign: Campaign; onEdit: (campaign: Campaign) => void; onStatus: (campaign: Campaign, status: CampaignStatus) => void; saving: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5 rounded-lg border border-border-ui bg-surface p-2">
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

function getTargetableGsas(contracts: LivePartnerContract[]) {
  const byCompany = new Map<string, { companyId: string; name: string; market: string }>();
  for (const contract of contracts) {
    if (!contract.gsaCompanyId) continue;
    const existing = byCompany.get(contract.gsaCompanyId);
    byCompany.set(contract.gsaCompanyId, {
      companyId: contract.gsaCompanyId,
      name: contract.gsaName,
      market: existing?.market
        ? Array.from(new Set([...existing.market.split(", "), contract.market])).join(", ")
        : contract.market,
    });
  }
  return Array.from(byCompany.values()).sort((left, right) => left.name.localeCompare(right.name));
}
