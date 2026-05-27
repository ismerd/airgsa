import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:     "bg-brand text-white shadow-[0_2px_12px_rgba(26,90,255,0.4)] hover:bg-brand-dark hover:shadow-[0_4px_20px_rgba(26,90,255,0.5)] active:scale-[0.98]",
        secondary:   "bg-brand-light text-brand hover:bg-brand-xlight active:scale-[0.98]",
        outline:     "border border-border-ui bg-surface text-ink hover:bg-surface2 hover:border-brand/40 active:scale-[0.98]",
        ghost:       "text-ink-muted hover:bg-surface2 hover:text-ink active:scale-[0.98]",
        destructive: "bg-danger text-white hover:bg-[#A93226] shadow-[0_2px_8px_rgba(192,57,43,0.3)] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-12 px-5 text-base",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const buttonClassName = cn(buttonVariants({ variant, size, className }));

  if (asChild && React.isValidElement<{ className?: string }>(props.children)) {
    return React.cloneElement(props.children, {
      className: cn(buttonClassName, props.children.props.className),
    });
  }

  return <button className={buttonClassName} {...props} />;
}
