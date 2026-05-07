import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-brand/25  bg-brand-light  text-brand",
        success: "border-[#0B7A52]/25 bg-success-bg text-success",
        warning: "border-[#B45309]/25 bg-warning-bg text-warning",
        danger:  "border-[#C0392B]/25 bg-danger-bg  text-danger",
        muted:   "border-border-ui   bg-surface2    text-ink-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
