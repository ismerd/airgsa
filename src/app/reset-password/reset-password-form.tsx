"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const railwayToken = searchParams.get("token");
  const isInvite = searchParams.get("mode") === "invite";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareSession() {
      if (railwayToken) {
        setReady(true);
        return;
      }
      if (!active) return;
      setError("Reset link is missing or expired.");
    }

    prepareSession();
    return () => {
      active = false;
    };
  }, [railwayToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    if (!railwayToken) {
      setLoading(false);
      setError("Reset link is missing or expired.");
      return;
    }

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: railwayToken, password }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Password could not be updated.");
      return;
    }
    if (isInvite) {
      window.location.assign("/setup/profile");
      return;
    }
    setComplete(true);
  }

  return (
    <Card>
      <CardContent className="p-5">
        {complete ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#0B7A52]/20 bg-success-bg p-4">
              <p className="font-semibold text-ink">Password updated</p>
              <p className="mt-1 text-sm text-ink-muted">You can now continue with your new password.</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">New password</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Confirm password</span>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={!ready || loading}>
              {loading ? "Updating..." : isInvite ? "Set password and continue" : "Update password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
