"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const demoGroups = [
  {
    title: "Airline",
    company: "Saudia Cargo",
    accounts: [
      {
        label: "Company admin",
        description: "Tender, applications, partner profiles",
        email: "saudia@airgsa.demo",
        password: "demo2026",
      },
      {
        label: "Employee",
        description: "Restricted airline operations view",
        email: "fatima.ops@saudia.example",
        password: "demo2026",
      },
    ],
  },
  {
    title: "GSA",
    company: "Forto Logistics",
    accounts: [
      {
        label: "Company admin",
        description: "Team, profile, tenders and oversight",
        email: "christopher.braun@forto.com",
        password: "demo2026",
      },
      {
        label: "Cargo operator",
        description: "Cargo workspace and own performance",
        email: "lena.hartmann@forto.example",
        password: "demo2026",
      },
    ],
  },
  {
    title: "GSA",
    company: "Priority Freight Europe",
    accounts: [
      {
        label: "Company admin",
        description: "GSA admin workspace",
        email: "marco.sauer@priorityfreight.com",
        password: "demo2026",
      },
    ],
  },
  {
    title: "GSA",
    company: "Air Menzies International",
    accounts: [
      {
        label: "Company admin",
        description: "GSA admin workspace",
        email: "samantha.leaper@airmenzies.com",
        password: "demo2026",
      },
    ],
  },
];

const showDemoAccounts = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" || process.env.NODE_ENV !== "production";

type DemoAccount = (typeof demoGroups)[number]["accounts"][number];

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await signIn(email, password, true);
  }

  async function demoLogin(account: DemoAccount) {
    setActiveDemo(account.email);
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
      setActiveDemo(null);
    }
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Sign in to your workspace</h1>
      </div>

      <Card className="overflow-hidden">
        <div className={showDemoAccounts ? "grid gap-0 lg:grid-cols-[0.9fr_1.1fr]" : ""}>
          <div className={showDemoAccounts ? "border-b border-border-ui p-6 lg:border-b-0 lg:border-r" : "p-6"}>
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

          {showDemoAccounts && (
          <div className="bg-surface2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Demo accounts</p>
                <h2 className="mt-1 text-lg font-bold text-ink">One-click access</h2>
              </div>
              <span className="rounded-full border border-border-ui bg-surface px-3 py-1 text-xs font-semibold text-ink-muted">
                Admin + employee
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {demoGroups.map((group) => (
                <DemoGroup
                  key={`${group.title}-${group.company}`}
                  group={group}
                  activeDemo={activeDemo}
                  loading={loading}
                  onLogin={demoLogin}
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

function DemoGroup({
  group,
  activeDemo,
  loading,
  onLogin,
}: {
  group: (typeof demoGroups)[number];
  activeDemo: string | null;
  loading: boolean;
  onLogin: (account: DemoAccount) => void;
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
                {activeDemo === account.email ? "Opening" : "Login"}
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
