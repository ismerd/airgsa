"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plane,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Topbar } from "@/components/dashboard/topbar";

const LS_KEY = "airgsa_fr24_api_key";

type FlightSummaryResult = {
  status: number | null;
  count: number;
  sample: unknown[];
  error: string | null;
};

type TestResult = {
  ok: boolean;
  statusCode?: number;
  elapsed?: number;
  error?: string;
  body?: string;
  flightCount?: number;
  airline?: string;
  samplePositions?: unknown[];
  flightSummary?: FlightSummaryResult;
  endpoints?: { livePositions?: string; flightSummary?: string | null };
};

function JsonBlock({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  const str = JSON.stringify(data, null, 2);
  const lines = str.split("\n");
  const preview = lines.slice(0, 8).join("\n");

  return (
    <div className="rounded-lg border border-border-ui bg-surface2 font-mono text-[11px] text-ink-muted overflow-hidden">
      <pre className="px-4 py-3 overflow-x-auto">{open ? str : preview}</pre>
      {lines.length > 8 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border-ui py-2 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          {open ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show {lines.length - 8} more lines</>}
        </button>
      )}
    </div>
  );
}

export default function Fr24TestPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // Load persisted key on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setApiKey(stored);
  }, []);

  function saveKey() {
    if (apiKey.trim()) {
      localStorage.setItem(LS_KEY, apiKey.trim());
    } else {
      localStorage.removeItem(LS_KEY);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (apiKey.trim()) params.set("apiKey", apiKey.trim());
      const res = await fetch(`/api/admin/fr24-test?${params.toString()}`);
      const data: TestResult = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="FR24 API test" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Intro */}
          <div className="rounded-xl border border-border-ui bg-surface2 p-5">
            <p className="text-sm text-ink-muted">
              Tests the two Flightradar24 Explorer plan endpoints used by the platform to show live
              Saudia Cargo (<code className="font-mono text-brand">SVA</code>) flight positions on the world map.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-ink-muted list-disc list-inside">
              <li><code className="font-mono">live/flight-positions/light</code> — current lat/lon, heading, altitude, speed</li>
              <li><code className="font-mono">flight-summary/light</code> — origin/destination airports, flight number, registration</li>
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              Live cargo detection now uses the FR24 cargo category filter on the full positions endpoint.
            </p>
            <p className="mt-3 text-xs text-ink-muted">
              The API key entered here is saved in your browser. Set <code className="font-mono text-brand">FLIGHTRADAR24_API_KEY</code> in
              Railway environment variables for production — that takes precedence and nothing needs to be entered here.
            </p>
          </div>

          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-brand" />
                API key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  FR24 API key
                  <span className="ml-1 normal-case font-normal">(saved in browser · leave empty to use env var)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="fr24-xxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
                    className="font-mono flex-1"
                  />
                  <Button variant="outline" onClick={saveKey} className="shrink-0">
                    <Save className="h-4 w-4" />
                    {saved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
              <Button onClick={runTest} disabled={loading} size="lg">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Running test…</>
                ) : (
                  <><Plane className="h-4 w-4" /> Run connection test</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Status banner */}
              <div className={`flex items-start gap-4 rounded-xl border p-5 ${
                result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
              }`}>
                {result.ok
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                  : <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${result.ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.ok ? "Connection successful" : "Connection failed"}
                  </p>
                  {result.error && <p className="mt-1 text-sm text-ink-muted">{result.error}</p>}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {result.statusCode && (
                      <Badge variant={result.ok ? "success" : "danger"}>HTTP {result.statusCode}</Badge>
                    )}
                    {result.elapsed && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                        <Clock className="h-3 w-3" /> {result.elapsed} ms
                      </span>
                    )}
                    {result.flightCount !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                        <Plane className="h-3 w-3" /> {result.flightCount} active Saudia cargo flights
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* No key */}
              {!result.ok && result.statusCode === 400 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-amber-300">No API key configured</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Enter your key above and click <strong>Save</strong>, or set <code className="font-mono text-brand">FLIGHTRADAR24_API_KEY</code> in Railway.
                  </p>
                </div>
              )}

              {/* Endpoints */}
              {result.endpoints && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Endpoints tested</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      {result.ok ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-ink-muted" />}
                      <code className="font-mono text-xs text-ink-muted flex-1 min-w-0 truncate">{result.endpoints.livePositions}</code>
                      {result.ok && <Badge variant="success">OK</Badge>}
                    </div>
                    {result.endpoints.flightSummary && (
                      <div className="flex items-center gap-2">
                        {result.flightSummary?.status === 200
                          ? <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                          : <WifiOff className="h-3.5 w-3.5 text-ink-muted" />}
                        <code className="font-mono text-xs text-ink-muted flex-1 min-w-0 truncate">{result.endpoints.flightSummary}</code>
                        {result.flightSummary?.status === 200
                          ? <Badge variant="success">OK · {result.flightSummary.count} records</Badge>
                          : <Badge variant="danger">HTTP {result.flightSummary?.status ?? "err"}</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sample positions */}
              {result.samplePositions && result.samplePositions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sample live positions ({result.samplePositions.length} shown)</CardTitle>
                  </CardHeader>
                  <CardContent><JsonBlock data={result.samplePositions} /></CardContent>
                </Card>
              )}

              {/* Sample flight summary */}
              {result.flightSummary?.sample && result.flightSummary.sample.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sample flight summary ({result.flightSummary.sample.length} shown)</CardTitle>
                  </CardHeader>
                  <CardContent><JsonBlock data={result.flightSummary.sample} /></CardContent>
                </Card>
              )}

              {/* Error body */}
              {result.body && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Error response</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="rounded-lg border border-border-ui bg-surface2 px-4 py-3 font-mono text-[11px] text-rose-400 overflow-x-auto">
                      {result.body}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Plan reference */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-ink-muted">Explorer plan — endpoints in use</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-ink-muted font-mono">
                <p><span className="text-brand">GET</span> /api/live/flight-positions/full?painted_as=SVA&amp;categories=C&amp;limit=100</p>
                <p><span className="text-brand">GET</span> /api/flight-summary/light?flight_ids=&#123;ids&#125;&amp;limit=50</p>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Both endpoints are available on the FR24 Explorer plan ($9/month).
                Responses are cached for 5 minutes server-side — the platform makes at most 2 API calls per refresh window regardless of how many users are active.
              </p>
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}
