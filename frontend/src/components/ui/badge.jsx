import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-container text-primary",
        secondary: "border-transparent bg-secondary-container text-secondary",
        tertiary: "border-transparent bg-tertiary-container text-tertiary",
        destructive: "border-transparent bg-error-container text-error",
        outline: "border-outline-variant text-on-surface-variant",
        success: "border-transparent bg-tertiary-container text-tertiary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
))
Badge.displayName = "Badge"

export { Badge, badgeVariants }
