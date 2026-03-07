import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
    " hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        primary:
          "bg-standard-subdued text-primary-foreground border border-primary-border",
        secondary:
          // Blue text, blue border, transparent background
          "bg-transparent text-primary border border-primary",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border",
        text:
          // No border/background, subdued blue text
          "border border-transparent text-primary",
        utility:
          // Like secondary but with utility-vivid (grey) for text and border
          "bg-transparent text-utility-vivid border border-utility-vivid",
      },
      // Sizes based on Figma specs: horizontal padding / vertical padding / font size
      size: {
        small: "px-3 py-2 text-[14px]", // 12px / 8px / 14px font
        medium: "px-6 py-2 text-[16px]", // 24px / 8px / 16px font
        large: "px-8 py-3 text-[16px]", // 32px / 12px / 16px font
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
