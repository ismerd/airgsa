import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300",
        className,
      )}
      {...props}
    />
  );
}

