import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300",
        className,
      )}
      {...props}
    />
  );
}

