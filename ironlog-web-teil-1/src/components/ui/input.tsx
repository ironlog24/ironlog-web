import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-12 w-full rounded-2xl border border-white/10 bg-ink-700 px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition focus:border-lime/60 focus:shadow-glow-sm',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
