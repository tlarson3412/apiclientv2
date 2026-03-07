import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-[24px] py-[8px] text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border [border-color:var(--button-outline)] bg-transparent",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void
  removable?: boolean
}

function Chip({
  className,
  variant,
  onRemove,
  removable = false,
  children,
  ...props
}: ChipProps) {
  return (
    <div className={cn(chipVariants({ variant }), className)} {...props}>
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none"
          data-testid="button-chip-remove"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </button>
      )}
    </div>
  )
}

export interface ChipsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function Chips({ className, children, ...props }: ChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="list"
      {...props}
    >
      {children}
    </div>
  )
}

export { Chip, Chips, chipVariants }
