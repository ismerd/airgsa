"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COUNTRIES = [
  "Germany", "United Kingdom", "France", "Netherlands", "Belgium",
  "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland",
  "Spain", "Portugal", "Italy", "Poland", "Saudi Arabia", "United Arab Emirates",
  "Qatar", "Kuwait", "Bahrain", "India", "Singapore", "Hong Kong",
  "Japan", "China", "United States", "Canada", "Brazil", "South Africa",
  "Other",
];

type FormState = {
  name: string;
  company: string;
  email: string;
  role: "airline" | "gsa" | "";
  country: string;
  phone: string;
  message: string;
};

export function SignupForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    company: "",
    email: "",
    role: "",
    country: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role) { setError("Please select a role."); return; }
    if (!form.country) { setError("Please select your country."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
              <CheckCircle2 className="h-8 w-8 text-brand" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">Request received</h2>
            <p className="mt-3 text-ink-muted">
              Thank you, <strong>{form.name}</strong>. We&apos;ve received your access request for <strong>{form.company}</strong>.
            </p>
            <div className="mt-6 rounded-xl border border-border-ui bg-surface2 p-4 text-left">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                <div>
                  <p className="text-sm font-semibold text-ink">What happens next</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                    <li>Our team reviews your request within <strong>48 hours</strong></li>
                    <li>You&apos;ll receive a confirmation email with login credentials once approved</li>
                    <li>Questions? Contact us at <a href="mailto:access@airgsa.com" className="text-brand hover:underline">access@airgsa.com</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
              Back to homepage
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Request access</h1>
        <p className="mt-2 text-ink-muted">
          AirGSA is currently invite-only. Fill in your details and our team will review your application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-ink">Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Full name *</label>
                <Input
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={set("name")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Company *</label>
                <Input
                  placeholder="Acme Cargo GmbH"
                  value={form.company}
                  onChange={set("company")}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Work email *</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your role *</label>
                <Select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "airline" | "gsa" }))}
                  required
                >
                  <option value="" disabled>Select role…</option>
                  <option value="airline">Airline — cargo commercial team</option>
                  <option value="gsa">GSA — General Sales Agent</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Country *</label>
                <Select value={form.country} onChange={set("country")} required>
                  <option value="" disabled>Select country…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Phone <span className="normal-case font-normal">(optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="+49 69 123 456"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Message <span className="normal-case font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Tell us briefly about your cargo operations and what you'd like to use AirGSA for…"
                value={form.message}
                onChange={set("message")}
                rows={3}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Submitting…" : "Submit access request"}
            </Button>

            <p className="text-center text-sm text-ink-muted">
              Already have access?{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
