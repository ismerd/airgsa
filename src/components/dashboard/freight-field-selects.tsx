"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cargoProductOptions } from "@/lib/constants/cargo-products";

type LocationOption = {
  value: string;
  label: string;
  meta: string;
};

export function CargoProductSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      {cargoProductOptions.map((option) => (
        <option key={option.label} value={option.label}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function AirportCodePicker({
  value,
  onChange,
  placeholder = "Search airport or city...",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      kind: "airports",
      q: query.trim(),
      selected: value,
    });
    setLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/reference/locations?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          setOptions([]);
          return;
        }
        const data = (await response.json()) as { options?: LocationOption[] };
        setOptions(data.options ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [disabled, open, query, value]);

  function selectOption(option: LocationOption) {
    onChange(option.value);
    setQuery(option.value);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value.toUpperCase());
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (options[0]) selectOption(options[0]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        className="h-10 w-full rounded-md border border-border-ui bg-surface pl-9 pr-9 text-sm font-semibold uppercase text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder={placeholder}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setQuery("");
            setOpen(true);
          }}
          className="absolute right-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-surface2 hover:text-ink"
          aria-label="Clear airport"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border-ui bg-surface shadow-xl">
          {loading ? (
            <p className="px-3 py-3 text-sm text-ink-muted">Loading airports...</p>
          ) : options.length > 0 ? (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className="block w-full border-b border-border-ui px-3 py-2 text-left last:border-b-0 hover:bg-brand-light"
              >
                <span className="font-mono text-sm font-bold text-ink">{option.label}</span>
                <span className="ml-2 text-xs text-ink-muted">{option.meta}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-ink-muted">No airport found.</p>
          )}
          {selectedOption && (
            <p className="border-t border-border-ui px-3 py-2 text-xs text-ink-muted">
              Selected: {selectedOption.label} - {selectedOption.meta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
