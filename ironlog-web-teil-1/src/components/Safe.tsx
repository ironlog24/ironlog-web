import { Component, useEffect, useRef, useState, type ReactNode } from 'react'

/** Lokale Fehlergrenze: ein defektes Widget (z. B. Chart) reißt nicht die ganze Seite mit */
export class Safe extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: Error) {
    console.error('[IRONLOG] Widget-Fehler', e)
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? <div className="grid h-full place-items-center text-xs text-white/35">Diagramm nicht verfügbar</div>
    return this.props.children
  }
}

/** Misst die eigene Größe (ersetzt Recharts' ResponsiveContainer, ohne Abhängigkeit von Throttle/ResizeObserver-Eigenheiten) */
export function AutoSize({ children, className = 'h-full w-full' }: { children: (size: { width: number; height: number }) => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (Math.round(r.width) === s.width && Math.round(r.height) === s.height ? s : { width: Math.round(r.width), height: Math.round(r.height) }))
    }
    measure()
    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(() => measure())
        ro.observe(el)
      }
    } catch {
      ro = null
    }
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  )
}
