/* eslint-disable react-refresh/only-export-components */
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/15 hover:shadow-primary-500/25 hover:brightness-105 active:brightness-95',
        secondary:
          'glass text-slate-700 hover:bg-white/90 hover:text-slate-900',
        outline:
          'border border-slate-200 bg-white/50 text-slate-700 hover:bg-white hover:border-primary-300 hover:text-slate-900',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        danger:
          'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700',
        link:
          'text-primary-600 underline-offset-4 hover:underline hover:text-primary-700',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
