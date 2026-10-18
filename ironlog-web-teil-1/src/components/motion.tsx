import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
export const rise: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0.4, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative min-h-dvh pb-32 md:pb-12', className)}
    >
      {children}
    </motion.main>
  )
}

export function Stagger({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className} {...rest}>
      {children}
    </motion.div>
  )
}

export function Rise({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={rise} className={className} {...rest}>
      {children}
    </motion.div>
  )
}

/** Tap/Hover-Feedback: leichtes Scale */
export const tap = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 }, transition: { type: 'spring', stiffness: 400, damping: 22 } } as const
