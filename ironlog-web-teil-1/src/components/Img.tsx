import { useEffect, useRef, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { tiny } from '@/lib/images'
import { BAKED_IMAGES } from '@/lib/exerciseImages'
import { cn } from '@/lib/utils'

interface Props {
  src?: string | null
  alt: string
  className?: string
  imgClassName?: string
  /** Duotone-Look (entsättigt + Neon-Stich) */
  duotone?: boolean
  /** Dunkler Verlauf von unten */
  shade?: 'none' | 'bottom' | 'full' | 'hero'
  priority?: boolean
  label?: string
}

/**
 * Bild mit Lazy Loading, Blur-Placeholder (winzige Unsplash-Variante),
 * Duotone-Stil und stimmungsvollem Fallback, falls das Bild nicht lädt.
 */
export function Img({ src, alt, className, imgClassName, duotone: duotoneProp = true, shade = 'bottom', priority, label }: Props) {
  const duotone = duotoneProp && !(src && BAKED_IMAGES.has(src))
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(!src)
  const ref = useRef<HTMLImageElement>(null)
  const ph = src ? tiny(src) : null

  useEffect(() => {
    setFailed(!src)
    setLoaded(false)
  }, [src])
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true)
  }, [src])

  return (
    <div className={cn('relative overflow-hidden bg-ink-700', className)}>
      {failed ? (
        <Fallback label={label ?? alt} />
      ) : (
        <>
          {ph && (
            <img
              src={ph}
              alt=""
              aria-hidden
              className={cn(
                'absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-700',
                duotone && 'grayscale',
                loaded ? 'opacity-0' : 'opacity-100',
              )}
            />
          )}
          <img
            ref={ref}
            src={src!}
            alt={alt}
            crossOrigin="anonymous"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700',
              duotone && 'grayscale-[0.85] contrast-[1.15] brightness-[0.85]',
              loaded ? 'opacity-100' : 'opacity-0',
              imgClassName,
            )}
          />
        </>
      )}
      {duotone && !failed && (
        <div className="pointer-events-none absolute inset-0 bg-[#9fd400] opacity-[0.16] mix-blend-color" />
      )}
      {shade !== 'none' && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            shade === 'bottom' && 'bg-gradient-to-t from-ink via-ink/40 to-transparent',
            shade === 'full' && 'bg-gradient-to-t from-ink via-ink/70 to-ink/30',
            shade === 'hero' && 'bg-[linear-gradient(to_top,#0A0A0A_0%,rgba(10,10,10,.85)_25%,rgba(10,10,10,.25)_65%,rgba(10,10,10,.55)_100%)]',
          )}
        />
      )}
    </div>
  )
}

/** Generatives Ersatzmotiv im IRONLOG-Stil */
function Fallback({ label }: { label: string }) {
  let h = 0
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const angle = h % 360
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(120% 80% at ${20 + (h % 60)}% 0%, rgba(198,255,0,.22), transparent 60%),
          radial-gradient(90% 70% at 100% 100%, rgba(255,95,31,.14), transparent 60%),
          repeating-linear-gradient(${angle}deg, rgba(255,255,255,.035) 0 2px, transparent 2px 14px), #141414`,
      }}
    >
      <Dumbbell className="absolute right-[8%] top-1/2 h-1/2 w-1/2 -translate-y-1/2 rotate-[-25deg] text-white/[0.06]" strokeWidth={1.2} />
    </div>
  )
}
