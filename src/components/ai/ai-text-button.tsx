"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiTextButton({
  value,
  onChange,
  fieldLabel,
  context,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  fieldLabel: string;
  context?: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function improveText() {
    const text = value.trim();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fieldLabel, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI rewrite failed.");
        return;
      }
      onChange(data.text);
    } catch {
      setError("AI rewrite failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
      {error && <span className="rounded-md bg-danger-bg px-2 py-1 text-[11px] font-semibold text-danger shadow-sm">{error}</span>}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={improveText}
        className="h-7 rounded-md border border-brand/20 bg-surface/90 px-2 text-[11px] shadow-sm backdrop-blur hover:bg-brand-light"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {pending ? (value.trim() ? "Improving" : "Generating") : value.trim() ? "Improve" : "Generate"}
        </span>
      </Button>
    </div>
  );
}
