import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-cyan-300/30 bg-cyan-300/15 text-cyan-100",
      success: "border-emerald-300/30 bg-emerald-300/15 text-emerald-100",
      warning: "border-amber-300/30 bg-amber-300/15 text-amber-100",
      danger: "border-rose-300/30 bg-rose-300/15 text-rose-100",
      muted: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

