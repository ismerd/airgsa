"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      const role = data.role as "airline" | "gsa" | "admin";
      const destination = next ?? (role === "admin" ? "/admin" : role === "airline" ? "/airline" : "/gsa");
      router.push(destination);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Sign in to your workspace</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-ink-muted font-normal">
            Enter your credentials to continue
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-border-ui bg-surface2 p-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Demo accounts</p>
            <DemoCredential
              label="Airline — Saudia Cargo"
              email="saudia@airgsa.demo"
              password="demo2026"
              onFill={() => { setEmail("saudia@airgsa.demo"); setPassword("demo2026"); }}
            />
            <DemoCredential
              label="GSA — Forto Logistics"
              email="christopher.braun@forto.com"
              password="demo2026"
              onFill={() => { setEmail("christopher.braun@forto.com"); setPassword("demo2026"); }}
            />
            <DemoCredential
              label="GSA — Priority Freight Europe"
              email="marco.sauer@priorityfreight.com"
              password="demo2026"
              onFill={() => { setEmail("marco.sauer@priorityfreight.com"); setPassword("demo2026"); }}
            />
            <DemoCredential
              label="GSA — Air Menzies International"
              email="samantha.leaper@airmenzies.com"
              password="demo2026"
              onFill={() => { setEmail("samantha.leaper@airmenzies.com"); setPassword("demo2026"); }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DemoCredential({
  label,
  email,
  password,
  onFill,
}: {
  label: string;
  email: string;
  password: string;
  onFill: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFill}
      className="w-full text-left rounded-lg border border-transparent hover:border-brand/30 hover:bg-brand/5 px-3 py-2 transition-colors"
    >
      <p className="text-xs font-semibold text-ink">{label}</p>
      <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
        {email} · {password}
      </p>
    </button>
  );
}
