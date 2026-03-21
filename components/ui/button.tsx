"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "text" | "neon" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
}

const buttonVariants = {
  base: "inline-flex items-center justify-center whitespace-nowrap font-sans font-medium transition-all duration-[400ms] ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  variant: {
    primary:
      "border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption hover:bg-psy-green hover:text-ink py-3 px-8 rounded-[2px]",
    ghost:
      "border border-taupe bg-transparent text-taupe uppercase tracking-widest text-caption hover:border-bone hover:text-bone py-3 px-8 rounded-[2px]",
    text: "bg-transparent text-bone relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-bone after:transition-[width] after:duration-500 after:ease-out hover:after:w-full uppercase tracking-widest text-caption",
    // Admin backward-compat aliases
    neon: "border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption hover:bg-psy-green hover:text-ink py-3 px-8 rounded-[2px]",
    outline: "border border-taupe bg-transparent text-taupe uppercase tracking-widest text-caption hover:border-bone hover:text-bone py-3 px-8 rounded-[2px]",
    default: "border border-taupe/30 bg-transparent text-bone uppercase tracking-widest text-caption hover:border-bone py-3 px-8 rounded-[2px]",
  },
  size: {
    default: "",
    sm: "text-micro py-2 px-4",
    lg: "text-body py-4 px-10",
    icon: "h-10 w-10 p-0",
  },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          buttonVariants.base,
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
