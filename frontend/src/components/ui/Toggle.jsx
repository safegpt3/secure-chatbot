import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "relative inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        toggled: "bg-green-500 border-green-500",
      },
      size: {
        default: "h-6 w-12",
        sm: "h-4 w-8",
        lg: "h-8 w-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef(
  ({ className, variant, size, asChild = false, toggled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(
          toggleVariants({ variant: toggled ? "toggled" : "default", size, className }),
          "cursor-pointer"
        )}
        ref={ref}
        onClick={onClick}
        {...props}
      >
        <span
          className={cn(
            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform",
            toggled ? "translate-x-6 bg-green-500" : "translate-x-0"
          )}
        />
      </Comp>
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };