"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  filterNavigationActions,
  getDashboardRole,
  type NavigationAction,
} from "@/components/dashboard/navigation-actions";

export function GlobalCommandSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const role = getDashboardRole(pathname);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => filterNavigationActions(query, role, 6), [query, role]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, role]);

  function openAction(action: NavigationAction) {
    setQuery("");
    setOpen(false);
    router.push(action.href);
  }

  return (
    <div ref={wrapperRef} className="relative hidden w-72 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <Input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }
          if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            openAction(results[activeIndex]);
          }
        }}
        className="pl-9 pr-3"
        placeholder="Search workspace actions..."
        aria-label="Search workspace actions"
        role="combobox"
        aria-expanded={open}
      />

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-2xl border border-border-ui bg-surface animate-scale-in"
          style={{
            transformOrigin: "top right",
            boxShadow: "0 24px 64px rgba(0,0,0,0.24), 0 0 0 1px rgba(96,165,250,0.06)",
          }}
        >
          <div className="border-b border-border-ui px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {query.trim() ? "Matching actions" : "Frequent actions"}
            </p>
          </div>
          {results.length === 0 ? (
            <div className="px-4 py-5 text-sm text-ink-muted">No matching workspace action.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2" role="listbox">
              {results.map((action, index) => (
                <button
                  key={action.href}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openAction(action)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    index === activeIndex ? "bg-brand-light text-brand" : "text-ink hover:bg-surface2"
                  }`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{action.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">{action.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
