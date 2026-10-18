import { useEffect, useState } from 'react'
import { nf } from '@/lib/utils'

const reduced = () => {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/** Zählt beim Laden hoch – eigenständig, ohne Observer; endet immer beim Zielwert */
export function CountUp({ value, decimals = 0, duration = 1.1, className }: { value: number; decimals?: number; duration?: number; className?: string }) {
  const [v, setV] = useState(() => (reduced() ? value : 0))
  useEffect(() => {
    if (reduced() || typeof requestAnimationFrame !== 'function') {
      setV(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const safety = setTimeout(() => setV(value), duration * 1000 + 300) // falls rAF gedrosselt ist
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000))
      setV(value * (1 - Math.pow(1 - p, 4)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(safety)
    }
  }, [value, duration])
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {nf(v, decimals)}
    </span>
  )
}
