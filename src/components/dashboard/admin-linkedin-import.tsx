"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, KeyRound, Link2, Loader2, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPostedLimitLabel,
  getScheduleLabel,
  linkedinImportDefaults,
  POSTED_LIMIT_OPTIONS,
} from "@/lib/services/linkedin";
import type { LinkedinImportPostedLimit, LinkedinImportScheduleUnit } from "@/lib/types";
import type { LinkedinPostPreview } from "@/lib/types";

const SETTINGS_STORAGE_KEY = "airgsa.linkedin-import-settings";

type SavedImportSettings = {
  token: string;
  targetUrls: string;
  postedLimit: LinkedinImportPostedLimit;
  scheduleEnabled: boolean;
  scheduleValue: number;
  scheduleUnit: LinkedinImportScheduleUnit;
  includeReposts: boolean;
  includeQuotePosts: boolean;
};

export function AdminLinkedinImport() {
  const [token, setToken] = useState("");
  const [targetUrls, setTargetUrls] = useState(linkedinImportDefaults.targetUrls.join("\n"));
  const [postedLimit, setPostedLimit] = useState<LinkedinImportPostedLimit>("24h");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(12);
  const [scheduleUnit, setScheduleUnit] = useState<LinkedinImportScheduleUnit>("hours");
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

  const scheduleLabel = getScheduleLabel(scheduleValue, scheduleUnit);
  const postedLimitLabel = getPostedLimitLabel(postedLimit);

  useEffect(() => {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved) as SavedImportSettings;
        setToken(settings.token ?? "");
        setTargetUrls(settings.targetUrls);
        setPostedLimit(settings.postedLimit ?? "24h");
        setScheduleEnabled(settings.scheduleEnabled);
        setScheduleValue(settings.scheduleValue);
        setScheduleUnit(settings.scheduleUnit);
        setIncludeReposts(settings.includeReposts);
        setIncludeQuotePosts(settings.includeQuotePosts);
        return;
      } catch {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    }

    void fetch("/api/linkedin-sources", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const urls = (payload?.sources ?? [])
          .filter((source: { status: string }) => source.status === "active")
          .map((source: { url: string }) => source.url)
          .join("\n");
        if (urls) setTargetUrls(urls);
      })
      .catch(() => undefined);
  }, []);

  function saveSettings() {
    setSaveMessage(null);
    setSaveError(null);
    setImportError(null);

    if (sourceCount === 0) {
      setSaveError("Bitte mindestens eine LinkedIn Seite eintragen.");
      return;
    }

    if (scheduleValue < 1) {
      setSaveError("Wiederholung muss groesser als 0 sein.");
      return;
    }

    const settings: SavedImportSettings = {
      token,
      targetUrls,
      postedLimit,
      scheduleEnabled,
      scheduleValue,
      scheduleUnit,
      includeReposts,
      includeQuotePosts,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSaveMessage("Einstellungen und Token wurden lokal in diesem Browser gespeichert.");
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
              Local testing stores this token in your browser. For Railway, also add it as <code>LINKEDIN_API_TOKEN</code>.
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
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CalendarClock className="h-4 w-4 text-brand" />
                Automatic import
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(event) => setScheduleEnabled(event.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
                Run automatically
              </label>
              <div className="mt-3 grid grid-cols-[1fr_1.3fr] gap-2">
                <Input
                  type="number"
                  min={1}
                  disabled={!scheduleEnabled}
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(Number(event.target.value))}
                />
                <Select
                  disabled={!scheduleEnabled}
                  value={scheduleUnit}
                  onChange={(event) => setScheduleUnit(event.target.value as LinkedinImportScheduleUnit)}
                >
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </Select>
              </div>
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
            <Button onClick={saveSettings}>
              <Save className="h-4 w-4" />
              Save settings
            </Button>
            <Button variant="outline" onClick={runImport} disabled={isImporting}>
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
                {importResult.stored ? ` Saved ${importResult.savedCount} to Supabase.` : " Supabase saving is not configured yet."}
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
            <SummaryItem label="Automatic schedule" value={scheduleEnabled ? scheduleLabel : "off"} />
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
