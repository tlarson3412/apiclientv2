import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

export interface DividerProps extends Omit<React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>, 'decorative'> {
  type?: "decorative" | "semantic"
}

const Divider = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  DividerProps
>(
  (
    { className, orientation = "horizontal", type = "decorative", ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={type === "decorative"}
      orientation={orientation}
      className={cn(
        "shrink-0",
        type === "decorative" ? "bg-utility-subdued" : "bg-utility-mid",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Divider.displayName = "Divider"

export { Divider }
