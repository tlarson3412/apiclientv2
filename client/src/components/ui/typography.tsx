import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      // Display variants - 48px/40px/32px, Medium weight, standard-vivid, negative letter-spacing
      "display-large": "text-[48px] leading-[57.6px] font-medium text-standard-vivid tracking-[-0.48px]",
      "display-medium": "text-[40px] leading-[48px] font-medium text-standard-vivid tracking-[-0.4px]",
      "display-small": "text-[32px] leading-[40px] font-medium text-standard-vivid tracking-[-0.32px]",
      
      // Heading variants - 28px/24px/20px, Medium weight, label-vivid
      "heading-large": "text-[28px] leading-[36.4px] font-medium text-label-vivid tracking-[0px]",
      "heading-medium": "text-[24px] leading-[31.2px] font-medium text-label-vivid tracking-[0px]",
      "heading-small": "text-[20px] leading-[26px] font-medium text-label-vivid tracking-[0px]",
      
      // Subheading variants - 16px/14px, Medium weight, label-vivid, positive letter-spacing
      "subheading-large": "text-[16px] leading-[23.2px] font-medium text-label-vivid tracking-[0.16px]",
      "subheading-small": "text-[14px] leading-[20.3px] font-medium text-label-vivid tracking-[0.14px]",
      
      // Body variants - 20px/16px/14px, Regular weight, label-mid
      "body-large": "text-[20px] leading-[32px] font-normal text-label-mid tracking-[0px]",
      "body-medium": "text-[16px] leading-[25.6px] font-normal text-label-mid tracking-[0.16px]",
      "body-small": "text-[14px] leading-[23.8px] font-normal text-label-mid tracking-[0.14px]",
      
      // Superhead - 14px, Medium weight, label-muted, uppercase, wide letter-spacing
      "superhead": "text-[14px] leading-[21px] font-medium text-label-muted tracking-[0.84px] uppercase",
      
      // Caption - 12px, Regular weight, label-muted
      "caption": "text-[12px] leading-[20.4px] font-normal text-label-muted tracking-[0.24px]",
      
      // Callout variants - 24px/20px, Light weight (300), label-mid
      "callout-large": "text-[24px] leading-[36px] font-light text-label-mid tracking-[0.24px]",
      "callout-small": "text-[20px] leading-[30px] font-light text-label-mid tracking-[0.4px]",

      // Legacy variants for backwards compatibility
      h1: "text-[48px] leading-[57.6px] font-medium text-standard-vivid tracking-[-0.48px]",
      h2: "text-[40px] leading-[48px] font-medium text-standard-vivid tracking-[-0.4px]",
      h3: "text-[32px] leading-[40px] font-medium text-standard-vivid tracking-[-0.32px]",
      h4: "text-[28px] leading-[36.4px] font-medium text-label-vivid tracking-[0px]",
      p: "text-[16px] leading-[25.6px] font-normal text-label-mid tracking-[0.16px]",
      lead: "text-[20px] leading-[32px] font-normal text-label-mid",
      large: "text-[20px] font-medium text-label-vivid",
      small: "text-[14px] font-medium text-label-vivid leading-[20.3px]",
      muted: "text-[14px] text-label-muted",
    },
  },
  defaultVariants: {
    variant: "body-medium",
  },
})

type VariantType = NonNullable<VariantProps<typeof typographyVariants>["variant"]>

const variantElementMap: Record<VariantType, keyof JSX.IntrinsicElements> = {
  "display-large": "h1",
  "display-medium": "h2",
  "display-small": "h3",
  "heading-large": "h2",
  "heading-medium": "h3",
  "heading-small": "h4",
  "subheading-large": "h5",
  "subheading-small": "h6",
  "body-large": "p",
  "body-medium": "p",
  "body-small": "p",
  "superhead": "span",
  "caption": "span",
  "callout-large": "p",
  "callout-small": "p",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  p: "p",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
}

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: keyof JSX.IntrinsicElements
}

function Typography({
  className,
  variant = "body-medium",
  as,
  ...props
}: TypographyProps) {
  const Component = as || variantElementMap[variant as VariantType] || "p"

  return React.createElement(Component, {
    className: cn(typographyVariants({ variant, className })),
    ...props,
  })
}

export {
  Typography,
  typographyVariants,
}
