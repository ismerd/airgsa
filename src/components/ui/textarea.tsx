import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-border-ui bg-surface2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}

