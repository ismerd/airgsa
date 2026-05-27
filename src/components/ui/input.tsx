import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border-ui bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted transition-all duration-150 focus:border-brand/60 focus:ring-2 focus:ring-brand/12 hover:border-brand/30",
        className,
      )}
      {...props}
    />
  );
}
