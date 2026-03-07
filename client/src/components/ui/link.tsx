import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronRight, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

const linkVariants = cva(
  "inline-flex items-center gap-1 underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-medium underline",
  {
    variants: {
      variant: {
        default: "",
        muted: "text-muted-foreground hover:text-foreground",
        ghost: "no-underline hover:underline",
      },
      size: {
        default: "text-[16px]",
        sm: "text-sm",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type LinkType = "forward-arrow" | "back-arrow" | "basic" | "subtle"

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean
  linkType?: LinkType
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, size, external, linkType = "basic", children, ...props }, ref) => {
    const externalProps = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {}

    const isSubtle = linkType === "subtle"
    const hasArrow = linkType === "forward-arrow" || linkType === "back-arrow"
    const colorClass = isSubtle 
      ? "text-utility-vivid hover:text-utility-vivid/80 text-[12px]" 
      : "text-standard-subdued hover:text-standard-vivid text-[16px]"
    const underlineClass = hasArrow ? "no-underline" : ""

    return (
      <a
        ref={ref}
        className={cn(linkVariants({ variant, size }), colorClass, underlineClass, className)}
        {...externalProps}
        {...props}
      >
        {linkType === "back-arrow" && <ChevronLeft className="w-4 h-4" />}
        {children}
        {linkType === "forward-arrow" && <ChevronRight className="w-4 h-4" />}
      </a>
    )
  }
)
Link.displayName = "Link"

export { Link, linkVariants }
