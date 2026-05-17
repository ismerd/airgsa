"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { LinkedinSource, NewsCategory } from "@/lib/types";

type SourceForm = {
  name: string;
  url: string;
  category: NewsCategory | "";
};

const emptyForm: SourceForm = {
  name: "",
  url: "",
  category: "",
};

export function LinkedinSourceManager({
  canManage = true,
  categories,
  initialSources,
}: {
  canManage?: boolean;
  categories: NewsCategory[];
  initialSources: LinkedinSource[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns: Column<LinkedinSource>[] = [
    { header: "Source", cell: (row) => row.name },
    { header: "URL", cell: (row) => <span className="text-brand">{row.url}</span> },
    { header: "Category", cell: (row) => row.category ?? "unclassified" },
    { header: "Last import", cell: (row) => row.lastImport },
    { header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "active" : "closed"} /> },
    ...(canManage
      ? [{
          header: "Action",
          cell: (row: LinkedinSource) => (
            <Button type="button" size="sm" variant="ghost" onClick={() => toggleSource(row)} disabled={saving}>
              {row.status === "active" ? "Pause" : "Activate"}
            </Button>
          ),
        } satisfies Column<LinkedinSource>]
      : []),
  ];

  async function refresh() {
    const response = await fetch("/api/linkedin-sources", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setSources(payload.sources ?? []);
  }

  async function addSource() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/linkedin-sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          category: form.category || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Source could not be saved");
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleSource(source: LinkedinSource) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/linkedin-sources/${source.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: source.status === "active" ? "paused" : "active" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Source could not be updated");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={canManage ? "grid gap-5 xl:grid-cols-[.45fr_1fr]" : "grid gap-5"}>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add LinkedIn source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Company or page name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              placeholder="LinkedIn URL"
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            />
            <Select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as NewsCategory | "" }))}
            >
              <option value="">Unclassified / manual review</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
            <Button className="w-full" onClick={addSource} disabled={saving}>
              {saving ? "Saving..." : "Add source"}
            </Button>
            {error ? <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">{error}</p> : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Source manager</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length > 0 ? (
            <DataTable columns={columns} data={sources} />
          ) : (
            <div className="rounded-xl border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
              No LinkedIn sources configured yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
