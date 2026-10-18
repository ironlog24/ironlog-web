import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
  {
    variants: {
      variant: {
        neon: 'bg-lime text-ink shadow-glow-sm hover:shadow-glow hover:scale-[1.02] hover:bg-lime-400',
        outline: 'border border-white/25 text-white hover:border-lime hover:text-lime hover:shadow-glow-sm',
        ghost: 'text-white/70 hover:bg-white/5 hover:text-white',
        glass: 'glass text-white hover:bg-white/10',
        soft: 'bg-white/[0.06] text-white hover:bg-white/10',
        danger: 'bg-blaze/15 text-blaze border border-blaze/30 hover:bg-blaze hover:text-ink hover:shadow-glow-orange',
      },
      size: {
        sm: 'h-9 rounded-xl px-3.5 text-[11px]',
        md: 'h-12 rounded-2xl px-5 text-xs',
        lg: 'h-14 rounded-2xl px-7 text-sm',
        xl: 'h-16 rounded-[22px] px-8 text-base',
        icon: 'h-11 w-11 rounded-2xl',
      },
    },
    defaultVariants: { variant: 'neon', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'
