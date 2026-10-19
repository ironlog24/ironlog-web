import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useData } from '@/state/store'
import { muscleDistribution } from '@/data/stats'
import { MUSCLE_LABEL, type MuscleGroup } from '@/data/types'
import { SectionTitle } from '@/components/bits'

/**
 * IRONLOG-Avatar: wird mit jedem Training breiter.
 * - Gesamtwachstum: Anzahl abgeschlossener Trainings
 * - Proportionen: welche Muskelgruppen in den letzten 6 Wochen trainiert wurden
 *   (wer Beine auslässt, bekommt dünne Beine 🍗)
 */

const LEVELS = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150, 200, 260, 330, 420, 520]
const TITLES = ['Rookie', 'Anfänger', 'Regelmäßig', 'Eisenfresser', 'Athlet', 'Biest', 'Koloss', 'Titan', 'Legende', 'Halbgott', 'Gott des Eisens', 'Olymp', 'Mythos', 'Unsterblich', 'IRONLOG-Ikone']

export function avatarStats(total: number) {
  let lvl = 0
  while (lvl < LEVELS.length - 1 && total >= LEVELS[lvl + 1]) lvl++
  const cur = LEVELS[lvl]
  const next = LEVELS[lvl + 1] ?? cur
  return {
    level: lvl + 1,
    title: TITLES[Math.min(lvl, TITLES.length - 1)],
    progress: next > cur ? (total - cur) / (next - cur) : 1,
    toNext: Math.max(0, next - total),
    // 0 … 1, sättigt langsam (die ersten Trainings sieht man am deutlichsten)
    growth: Math.min(1, Math.sqrt(total / 260)),
  }
}

type Sizes = Record<MuscleGroup, number>

export function useAvatar() {
  const { workouts, exercises } = useData()
  return useMemo(() => {
    const total = workouts.filter((w) => w.ended_at).length
    const st = avatarStats(total)
    const dist = muscleDistribution(workouts, exercises, 42)
    const groups = Object.keys(dist) as MuscleGroup[]
    const sum = groups.reduce((a, g) => a + dist[g], 0)
    const avg = sum / groups.length
    // Anteil je Gruppe relativ zum Durchschnitt (0.3 … 1.5); ohne Daten neutral
    const share = Object.fromEntries(groups.map((g) => [g, sum ? Math.min(1.5, Math.max(0.3, dist[g] / Math.max(1, avg))) : 1])) as Sizes
    const sizes = Object.fromEntries(groups.map((g) => [g, st.growth * share[g]])) as Sizes
    const weakest = sum >= 12 ? groups.reduce((a, g) => (dist[g] < dist[a] ? g : a), groups[0]) : null
    const weak = weakest && dist[weakest] < avg * 0.45 ? weakest : null
    return { ...st, total, sizes, weak }
  }, [workouts, exercises])
}

const LIME = '#C6FF00'
const spring = { type: 'spring', stiffness: 60, damping: 14 } as const

/** Stilisierte Figur von vorn, jede Muskelgruppe skaliert einzeln */
export function AvatarFigure({ sizes, className }: { sizes: Sizes; className?: string }) {
  const s = sizes
  const sh = s.schultern
  const ch = s.brust
  const ba = s.ruecken
  const ar = s.arme
  const co = s.core
  const le = s.beine

  // Schulterbreite: Schultern + Rücken (V-Form)
  const shoulderX = 30 + sh * 12 + ba * 8
  const waist = 20 + co * 5
  const armX = shoulderX + 10 + ar * 4
  const hipY = 168

  const torso = `M ${100 - shoulderX + 6} 70 Q 100 ${60 - ba * 4} ${100 + shoulderX - 6} 70 L ${100 + waist + 4} ${hipY - 30} Q ${100 + waist} ${hipY} 100 ${hipY + 2} Q ${100 - waist} ${hipY} ${100 - waist - 4} ${hipY - 30} Z`

  const part = (p: Record<string, number>) => ({ animate: p, initial: false as const, transition: spring })

  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label="Dein Avatar">
      <defs>
        <radialGradient id="av-fill" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={LIME} stopOpacity="0.55" />
          <stop offset="100%" stopColor={LIME} stopOpacity="0.12" />
        </radialGradient>
        <filter id="av-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g fill="url(#av-fill)" stroke={LIME} strokeWidth="1.6" filter="url(#av-glow)">
        {/* Beine */}
        {[-1, 1].map((d) => (
          <g key={`leg${d}`}>
            <motion.ellipse {...part({ cx: 100 + d * (13 + le * 5), cy: 205, rx: 11 + le * 9, ry: 36 })} />
            <motion.ellipse {...part({ cx: 100 + d * (12 + le * 4), cy: 262, rx: 7 + le * 5, ry: 22 })} />
          </g>
        ))}
        {/* Arme */}
        {[-1, 1].map((d) => (
          <g key={`arm${d}`}>
            <motion.ellipse {...part({ cx: 100 + d * armX, cy: 104, rx: 7 + ar * 7, ry: 20 + ar * 2 })} />
            <motion.ellipse {...part({ cx: 100 + d * (armX + 3), cy: 144, rx: 5.5 + ar * 4, ry: 19 })} />
          </g>
        ))}
        {/* Rumpf */}
        <motion.path animate={{ d: torso }} initial={false} transition={spring} />
        {/* Schultern */}
        {[-1, 1].map((d) => (
          <motion.ellipse key={`sh${d}`} {...part({ cx: 100 + d * (shoulderX - 2), cy: 74, rx: 10 + sh * 9, ry: 10 + sh * 5 })} />
        ))}
        {/* Brust */}
        {[-1, 1].map((d) => (
          <motion.ellipse key={`ch${d}`} {...part({ cx: 100 + d * (12 + ch * 6), cy: 92, rx: 13 + ch * 9, ry: 10 + ch * 5 })} />
        ))}
        {/* Bauch */}
        {[0, 1, 2].map((r) =>
          [-1, 1].map((d) => (
            <motion.rect key={`ab${r}${d}`} rx="3" {...part({ x: 100 + (d < 0 ? -(7 + co * 3) - 1 : 1), y: 112 + r * 14, width: 7 + co * 3, height: 11 })} strokeWidth={1.2} />
          )),
        )}
        {/* Nacken + Kopf */}
        <motion.path animate={{ d: `M ${92 - sh * 4} 62 Q 100 ${52 - sh * 3} ${108 + sh * 4} 62 L 104 50 L 96 50 Z` }} initial={false} transition={spring} />
        <circle cx="100" cy="34" r="16" />
      </g>
    </svg>
  )
}

/** Dashboard-Karte */
export function AvatarCard() {
  const a = useAvatar()
  return (
    <section>
      <SectionTitle>Dein Avatar</SectionTitle>
      <div className="card relative grid grid-cols-[120px_1fr] items-center gap-4 overflow-hidden p-4 md:grid-cols-[160px_1fr]" data-testid="avatar-card">
        <div className="absolute -left-10 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-lime/10 blur-3xl" />
        <AvatarFigure sizes={a.sizes} className="relative h-44 w-full md:h-56" />
        <div className="relative min-w-0">
          <div className="label !text-lime/90 flex items-center gap-1.5"><Sparkles size={12} /> Level {a.level}</div>
          <div className="h-display mt-1 text-4xl leading-none">{a.title}</div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(a.progress * 100)}%` }} transition={{ duration: 0.9 }} className="h-full rounded-full bg-lime shadow-glow-sm" />
          </div>
          <p className="mt-2 text-xs text-white/55">
            {a.total === 0
              ? 'Dein Avatar wächst mit jedem Training. Leg los!'
              : a.toNext > 0
                ? `${a.total} Trainings · noch ${a.toNext} bis Level ${a.level + 1}`
                : `${a.total} Trainings · Max-Level erreicht 👑`}
          </p>
          {a.weak && (
            <p className="mt-2 rounded-xl bg-blaze/10 px-3 py-2 text-xs font-semibold text-blaze">
              {a.weak === 'beine' ? 'Skip Leg Day? 🍗 Deine Beine schrumpfen.' : `${MUSCLE_LABEL[a.weak]} kommt zu kurz – dein Avatar sieht's.`}
            </p>
          )}
          <Link to="/training" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-lime">
            Training starten <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  )
}
