import { forwardRef } from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const Progress = forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary-100', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
      style={{ width: `${value || 0}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'

export { Progress }
