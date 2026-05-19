"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, KeyRound, Link2, Loader2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  linkedinImportDefaults,
  getPostedLimitLabel,
  POSTED_LIMIT_OPTIONS,
} from "@/lib/services/linkedin";
import type { LinkedinImportPostedLimit } from "@/lib/types";
import type { LinkedinPostPreview } from "@/lib/types";

export function AdminLinkedinImport() {
  const [token, setToken] = useState("");
  const [targetUrls, setTargetUrls] = useState(linkedinImportDefaults.targetUrls.join("\n"));
  const [postedLimit, setPostedLimit] = useState<LinkedinImportPostedLimit>("24h");
  const [includeReposts, setIncludeReposts] = useState(linkedinImportDefaults.includeReposts);
  const [includeQuotePosts, setIncludeQuotePosts] = useState(linkedinImportDefaults.includeQuotePosts);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    savedCount: number;
    stored: boolean;
    posts: LinkedinPostPreview[];
  } | null>(null);

  const sourceCount = useMemo(
    () =>
      targetUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean).length,
    [targetUrls],
  );

  const postedLimitLabel = getPostedLimitLabel(postedLimit);

  useEffect(() => {
    void loadActiveSources(false);
  }, []);

  async function loadActiveSources(showMessage = true) {
    setSaveMessage(null);
    setSaveError(null);
    setImportError(null);
    try {
      const response = await fetch("/api/linkedin-sources", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "LinkedIn sources could not be loaded");
      const urls = (payload?.sources ?? [])
        .filter((source: { status: string }) => source.status === "active")
        .map((source: { url: string }) => source.url)
        .join("\n");
      setTargetUrls(urls);
      if (showMessage) {
        setSaveMessage(urls ? "Active LinkedIn sources loaded from the source manager." : "No active LinkedIn sources configured.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "LinkedIn sources could not be loaded");
    }
  }

  async function runImport() {
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const response = await fetch("/api/admin/linkedin/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: token.trim() || undefined,
          targetUrls: targetUrls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean),
          postedLimit,
          includeQuotePosts,
          includeReposts,
          maxPosts: linkedinImportDefaults.maxPosts,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const detail = payload.details ? ` — ${payload.details}` : "";
        throw new Error((payload.error ?? "Import failed.") + detail);
      }

      setImportResult(payload);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn news import</CardTitle>
          <p className="text-sm text-ink-muted">
            Choose which LinkedIn pages should be watched and how often new posts should be imported.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand" />
              Access token
            </label>
            <Input
              type="password"
              placeholder="Paste LinkedIn import token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <p className="text-xs text-ink-muted">
              Prefer <code>LINKEDIN_API_TOKEN</code> in the production environment. This field is a one-time override and is not stored.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Link2 className="h-4 w-4 text-brand" />
              LinkedIn pages to watch
            </label>
            <Textarea
              className="min-h-36"
              value={targetUrls}
              onChange={(event) => setTargetUrls(event.target.value)}
              placeholder="One LinkedIn posts URL per line"
            />
            <p className="text-xs text-ink-muted">{sourceCount} source{sourceCount === 1 ? "" : "s"} selected.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border-ui bg-surface2 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock3 className="h-4 w-4 text-brand" />
                Import posts from
              </label>
              <div className="mt-3">
                <Select
                  value={postedLimit}
                  onChange={(event) => setPostedLimit(event.target.value as LinkedinImportPostedLimit)}
                >
                  {POSTED_LIMIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Apify filter: <span className="font-mono text-brand">{postedLimit}</span>
              </p>
            </div>

            <div className="rounded-md border border-border-ui bg-surface2 p-4">
              <p className="text-sm font-semibold text-ink">Run mode</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Imports run manually from this admin screen or through the secured API. Cron scheduling should be configured at the hosting layer with an admin session or service job.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-border-ui bg-surface2 p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeQuotePosts}
                onChange={(event) => setIncludeQuotePosts(event.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              Include quote posts
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border-ui bg-surface2 p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeReposts}
                onChange={(event) => setIncludeReposts(event.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              Include reposts
            </label>
          </div>

          <div className="rounded-md border border-brand/20 bg-brand-light p-4 text-sm leading-6 text-brand">
            The importer will collect posts from <strong>{postedLimitLabel.toLowerCase()}</strong>. Categories stay empty until someone reviews them manually.
            OpenAI classification can be added later, but it is not enabled by default because it creates API costs.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void loadActiveSources(true)} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Reload active sources
            </Button>
            <Button onClick={runImport} disabled={isImporting || sourceCount === 0}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isImporting ? "Importing..." : "Import now"}
            </Button>
          </div>

          {saveError ? (
            <div className="flex gap-3 rounded-md border border-rose-300/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          ) : null}

          {saveMessage ? (
            <div className="flex gap-3 rounded-md border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          ) : null}

          {importError ? (
            <div className="flex gap-3 rounded-md border border-rose-300/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          ) : null}

          {importResult ? (
            <div className="flex gap-3 rounded-md border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Imported {importResult.importedCount} post{importResult.importedCount === 1 ? "" : "s"}.
                {importResult.stored ? ` Saved ${importResult.savedCount} to the database.` : " Database saving is not configured yet."}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Current setup</CardTitle>
            <p className="text-sm text-ink-muted">A plain-language summary of what will happen.</p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <SummaryItem label="Sources watched" value={`${sourceCount}`} />
            <SummaryItem label="Posts from" value={postedLimitLabel} />
            <SummaryItem label="Apify filter value" value={postedLimit} mono />
            <SummaryItem label="Run mode" value="manual / secured API" />
            <SummaryItem label="Category mode" value="manual review" />
            <SummaryItem label="Quote posts" value={includeQuotePosts ? "included" : "ignored"} />
            <SummaryItem label="Reposts" value={includeReposts ? "included" : "ignored"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest imported posts</CardTitle>
            <p className="text-sm text-ink-muted">Only the post text and media are kept. Comments and reactions are ignored.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult?.posts.length ? importResult.posts.slice(0, 5).map((post) => (
              <div key={post.id} className="space-y-3 rounded-md border border-border-ui bg-surface2 p-3">
                <div className="rounded-md bg-white p-4 text-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">{post.authorName}</p>
                  <h3 className="mt-2 text-lg font-semibold">LinkedIn post</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-700">{post.content}</p>
                  <p className="mt-3 text-xs text-ink-muted">{post.postedAt}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {post.media.map((item) => (
                    <div key={`${post.id}-${item.type}-${item.url}`} className="rounded-md border border-border-ui bg-surface2 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{item.type}</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{item.title ?? "LinkedIn media"}</p>
                      <p className="mt-1 truncate text-xs text-ink-muted">{item.url}</p>
                      {item.width && item.height ? <p className="mt-2 text-xs text-ink-muted">{item.width} x {item.height}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="rounded-md border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
                No import has been run in this session yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border-ui bg-surface2 p-4">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
        {label}
      </div>
      <p className={`mt-2 text-base font-semibold text-ink ${mono ? "font-mono text-brand" : ""}`}>{value}</p>
    </div>
  );
}
