"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const quickLoginGroups = [
  {
    title: "Airlines",
    company: "Local staging airlines",
    accounts: [
      {
        label: "Global Air Logistics",
        description: "Airline admin workspace",
        email: "m.weber@globalairexample.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "AeroNova Cargo",
        description: "Airline admin workspace",
        email: "ops@aeronova-cargo.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "Northstar Air Cargo",
        description: "Airline admin workspace",
        email: "network@northstar-air.test",
        password: "AirGSA-Test-2026!",
      },
    ],
  },
  {
    title: "GSAs",
    company: "Local staging GSAs",
    accounts: [
      {
        label: "Koklu Crew Cargo",
        description: "GSA admin workspace",
        email: "serkan@koklu-crew.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "RhineBridge GSA",
        description: "GSA admin workspace",
        email: "ops@rhinebridge-gsa.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "AtlasLift Partners",
        description: "GSA admin workspace",
        email: "sales@atlaslift-partners.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "MedCargo Hub",
        description: "GSA admin workspace",
        email: "team@medcargo-hub.test",
        password: "AirGSA-Test-2026!",
      },
      {
        label: "Pacific GSA Network",
        description: "GSA admin workspace",
        email: "desk@pacific-gsa.test",
        password: "AirGSA-Test-2026!",
      },
    ],
  },
];

const showQuickLoginAccounts = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" || process.env.NODE_ENV !== "production";

type QuickLoginAccount = (typeof quickLoginGroups)[number]["accounts"][number];

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeQuickLogin, setActiveQuickLogin] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await signIn(email, password, true);
  }

  async function quickLogin(account: QuickLoginAccount) {
    setActiveQuickLogin(account.email);
    await signIn(account.email, account.password, false);
  }

  async function signIn(loginEmail: string, loginPassword: string, useNext: boolean) {
    setEmail(loginEmail);
    setPassword(loginPassword);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      const role = data.role as "airline" | "gsa" | "admin";
      const accessRole = data.accessRole as string | undefined;
      const fallbackDestination =
        role === "admin"
          ? "/admin"
          : role === "airline"
            ? "/airline"
            : accessRole === "operator"
              ? "/gsa/cargo-workspace"
              : "/gsa";
      const destination = useNext && next && next.startsWith("/") && !next.startsWith("//") ? next : fallbackDestination;
      window.location.assign(destination);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setActiveQuickLogin(null);
    }
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Sign in to your workspace</h1>
      </div>

      <Card className="overflow-hidden">
        <div className={showQuickLoginAccounts ? "grid gap-0 lg:grid-cols-[0.85fr_1.15fr]" : ""}>
          <div className={showQuickLoginAccounts ? "border-b border-border-ui p-6 lg:border-b-0 lg:border-r" : "p-6"}>
            <CardHeader className="p-0">
              <CardTitle className="text-base font-normal text-ink-muted">
                Enter your credentials to continue
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-6 p-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-muted">
                Not registered yet?{" "}
                <Link href="/signup" className="font-semibold text-brand hover:underline">
                  Request access
                </Link>
              </p>
            </CardContent>
          </div>

          {showQuickLoginAccounts && (
          <div className="bg-surface2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Local staging accounts</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Quick login</h2>
              </div>
              <span className="rounded-full border border-border-ui bg-surface px-3 py-1 text-xs font-semibold text-ink-muted">
                Test only
              </span>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {quickLoginGroups.map((group) => (
                <QuickLoginGroup
                  key={`${group.title}-${group.company}`}
                  group={group}
                  activeQuickLogin={activeQuickLogin}
                  loading={loading}
                  onLogin={quickLogin}
                />
              ))}
            </div>
          </div>
          )}
        </div>
      </Card>
    </div>
  );
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { error: `Login request failed with status ${res.status}` };
  }
}

function QuickLoginGroup({
  group,
  activeQuickLogin,
  loading,
  onLogin,
}: {
  group: (typeof quickLoginGroups)[number];
  activeQuickLogin: string | null;
  loading: boolean;
  onLogin: (account: QuickLoginAccount) => void;
}) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">{group.title}</p>
          <p className="text-sm font-bold text-ink">{group.company}</p>
        </div>
        <span className="rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">
          {group.accounts.length}
        </span>
      </div>
      <div className="grid gap-2">
        {group.accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onLogin(account)}
            disabled={loading}
            className="w-full rounded-lg border border-border-ui bg-surface2 px-3 py-3 text-left transition hover:border-brand/40 hover:bg-brand/5 disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{account.label}</p>
                <p className="mt-1 text-xs text-ink-muted">{account.description}</p>
              </div>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-brand">
                {activeQuickLogin === account.email ? "Opening" : "Login"}
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-ink-muted">
              {account.email} - {account.password}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
