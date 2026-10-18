import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Img } from './Img'
import { cn } from '@/lib/utils'
import { HERO } from '@/lib/images'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('font-display tracking-[0.06em] text-white', className)}>
      IRON<span className="text-lime drop-shadow-[0_0_14px_rgba(198,255,0,.55)]">LOG</span>
    </div>
  )
}

/** Hero-Kopf mit Bild, Verlauf und großer Überschrift */
export function PageHero({ image, kicker, title, children, className }: { image: string; kicker?: ReactNode; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn('relative h-[300px] overflow-hidden md:h-[340px] md:rounded-b-[36px]', className)}>
      <Img src={image} alt="" priority shade="hero" className="absolute inset-0" imgClassName="animate-kenburns" />
      <div className="pt-safe absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-7 md:px-10">
        {kicker && <div className="label mb-2 !text-lime">{kicker}</div>}
        <h1 className="h-display text-[56px] md:text-[84px]">{title}</h1>
        {children}
      </div>
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="h-display text-[30px] md:text-4xl">{children}</h2>
      {action}
    </div>
  )
}

export function StatTile({ icon: Icon, label, children, sub, accent, className }: { icon: LucideIcon; label: string; children: ReactNode; sub?: ReactNode; accent?: 'lime' | 'blaze'; className?: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className={cn('card group relative overflow-hidden p-4 md:p-5', className)}>
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100', accent === 'blaze' ? 'bg-blaze/20' : 'bg-lime/10', 'opacity-60')} />
      <div className="relative mb-3 flex items-center gap-2">
        <Icon size={16} className={accent === 'blaze' ? 'text-blaze' : 'text-lime'} />
        <span className="label">{label}</span>
      </div>
      <div className="relative num text-[34px] leading-none md:text-[40px]">{children}</div>
      {sub && <div className="relative mt-1.5 text-xs text-white/45">{sub}</div>}
    </motion.div>
  )
}

export function EmptyState({ title, text, image = HERO.empty, action }: { title: string; text: string; image?: string; action?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.06]">
      <Img src={image} alt="" shade="full" className="absolute inset-0" />
      <div className="relative flex min-h-[300px] flex-col items-center justify-end px-6 py-10 text-center">
        <h3 className="h-display text-4xl">{title}</h3>
        <p className="mt-2 max-w-xs text-sm italic text-white/70">„{text}“</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  )
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-6xl px-4 md:px-10', className)}>{children}</div>
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-2xl border border-white/[0.06] bg-ink-800 p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn('relative h-8 rounded-xl px-3 text-xs font-bold transition', value === o.v ? 'text-ink' : 'text-white/55 hover:text-white')}>
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join()}`} className="absolute inset-0 rounded-xl bg-lime shadow-glow-sm" transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
          <span className="relative">{o.l}</span>
        </button>
      ))}
    </div>
  )
}
