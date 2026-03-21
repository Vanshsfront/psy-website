import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans placeholder:text-taupe/60 focus:border-psy-green focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[400ms]",
          "file:border-0 file:bg-transparent file:text-caption file:font-medium file:text-taupe",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
