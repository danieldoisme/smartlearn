import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary shadow-sm hover:bg-primary-dark hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm",
        secondary:
          "bg-surface-container text-on-surface-variant hover:bg-surface-high",
        outline:
          "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-dim hover:border-primary hover:text-primary",
        ghost:
          "text-on-surface-variant hover:bg-surface-dim hover:text-primary",
        destructive:
          "bg-error text-white shadow-sm hover:bg-error/90",
        success:
          "bg-tertiary text-on-tertiary shadow-sm hover:bg-tertiary/90",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3 py-1.5 text-xs rounded-lg",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
