"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationLoadingIndicator() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const startedAtPath = useRef<string | null>(null);

  useEffect(() => {
    function start() {
      startedAtPath.current = window.location.pathname + window.location.search;
      setPending(true);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = window.location.pathname + window.location.search;
      const next = destination.pathname + destination.search;
      if (current === next) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;

    const current = window.location.pathname + window.location.search;
    if (startedAtPath.current && current !== startedAtPath.current) {
      setPending(false);
      startedAtPath.current = null;
      return;
    }

    const timeout = window.setTimeout(() => {
      setPending(false);
      startedAtPath.current = null;
    }, 12_000);

    return () => window.clearTimeout(timeout);
  }, [pathname, pending]);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="h-1 overflow-hidden bg-brand/10">
        <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-r-full bg-brand" />
      </div>
      <div className="absolute right-4 top-3 rounded-full border border-border-ui bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-lg">
        Loading...
      </div>
    </div>
  );
}
