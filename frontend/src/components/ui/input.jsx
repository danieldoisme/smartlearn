import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface transition-all duration-200",
      "placeholder:text-outline-variant",
      "hover:border-muted",
      "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
