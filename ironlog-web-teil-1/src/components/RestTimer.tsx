import { AnimatePresence, motion } from 'framer-motion'
import { SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/state/store'
import { Button } from './ui/button'

export function RestTimer() {
  const { rest, adjustRest, skipRest } = useSession()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!rest) return
    let raf = 0
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rest])

  const left = rest ? Math.max(0, rest.endsAt - now) : 0
  const pct = rest ? Math.min(1, left / (rest.total * 1000)) : 0
  const sec = Math.ceil(left / 1000)
  const R = 120
  const C = 2 * Math.PI * R
  const urgent = sec <= 10

  return (
    <AnimatePresence>
      {rest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/65 px-6 backdrop-blur-2xl"
        >
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="flex flex-col items-center">
            <div className="label mb-6 !text-white/60">Pause</div>
            <div className="relative h-[280px] w-[280px]">
              <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
                <defs>
                  <linearGradient id="rg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor={urgent ? '#FF5F1F' : '#C6FF00'} />
                    <stop offset="100%" stopColor={urgent ? '#FF9A5A' : '#7DFF6A'} />
                  </linearGradient>
                  <filter id="glow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
                <circle cx="140" cy="140" r={R} fill="none" stroke="url(#rg)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} filter="url(#glow)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`num text-[84px] leading-none transition-colors ${urgent ? 'text-blaze' : 'text-white'}`}>
                  {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">von {Math.floor(rest.total / 60)}:{String(rest.total % 60).padStart(2, '0')}</div>
              </div>
            </div>
            <div className="mt-10 flex items-center gap-3">
              <Button variant="glass" size="lg" onClick={() => adjustRest(-15)} className="w-24">−15 s</Button>
              <Button variant="glass" size="lg" onClick={() => adjustRest(15)} className="w-24">+15 s</Button>
            </div>
            <Button variant="neon" size="lg" onClick={skipRest} className="mt-4 w-[204px]"><SkipForward size={18} />Überspringen</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
