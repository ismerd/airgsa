import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        secondary: "bg-white/10 text-white hover:bg-white/15",
        outline: "border border-white/15 bg-transparent text-white hover:bg-white/10",
        ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
        destructive: "bg-rose-500 text-white hover:bg-rose-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
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
