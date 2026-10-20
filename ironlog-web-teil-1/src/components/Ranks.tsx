import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronUp, Scale, Trophy } from 'lucide-react'
import { useData } from '@/state/store'
import { bodyStore } from '@/data/account'
import { MUSCLE_LABEL, type MuscleGroup } from '@/data/types'
import { computeRanks, TIERS, tierIndex, UNRANKED, type GroupRank, type Tier } from '@/lib/ranks'
import { useLook } from '@/components/Avatar'
import { cn } from '@/lib/utils'

/* ── Daten ── */

let bwCache: number | null = null

export function useBodyweight() {
  const [kg, setKg] = useState<number | null>(bwCache)
  useEffect(() => {
    let alive = true
    bodyStore
      .list()
      .then((rows) => {
        const last = [...rows].sort((a, b) => a.day.localeCompare(b.day)).pop()
        bwCache = last?.kg ?? null
        if (alive) setKg(bwCache)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  return kg
}

export function useRanks(excludeWorkoutId?: string) {
  const { workouts, exercises } = useData()
  const { look } = useLook()
  const bw = useBodyweight()
  const female = look.body === 'w'
  const kg = bw ?? (female ? 65 : 80)
  return useMemo(() => {
    const list = excludeWorkoutId ? workouts.filter((w) => w.id !== excludeWorkoutId) : workouts
    return { ...computeRanks(list, exercises, kg, female), bodyweight: kg, estimated: bw == null }
  }, [workouts, exercises, kg, female, bw, excludeWorkoutId])
}

/* ── Abzeichen ── */

let badgeId = 0
export function RankBadge({ tier, size = 44, className }: { tier: Tier; size?: number; className?: string }) {
  const [id] = useState(() => `rb${++badgeId}`)
  const idx = tierIndex(tier)
  const none = tier.key === UNRANKED.key
  const wings = idx >= 6
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-label={`Rang ${tier.name}`} role="img">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tier.glow} />
          <stop offset="100%" stopColor={tier.color} />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor={tier.glow} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {wings && (
        <g fill={`url(#${id}g)`} opacity="0.9">
          <path d="M14 26 L2 20 L6 30 L1 34 L9 38 L6 44 L16 42 Z" />
          <path d="M50 26 L62 20 L58 30 L63 34 L55 38 L58 44 L48 42 Z" />
        </g>
      )}
      <path d="M32 4 L54 15 L54 39 Q54 52 32 61 Q10 52 10 39 L10 15 Z" fill={none ? '#24272c' : `url(#${id}g)`} stroke={none ? '#3a3d44' : '#0a0a0a'} strokeWidth="2.5" />
      <path d="M32 10 L49 18.5 L49 38 Q49 48 32 55 Q15 48 15 38 L15 18.5 Z" fill="#0a0a0a" opacity={none ? 0.4 : 0.28} />
      {!none && idx >= 1 && <path d="M32 18 L42 30 L32 46 L22 30 Z" fill={`url(#${id}d)`} stroke="#0a0a0a" strokeWidth="1.2" />}
      {!none && idx >= 3 && <path d="M32 18 L36 30 L32 46 L28 30 Z" fill="#fff" opacity="0.35" />}
      {!none && idx === 0 && <path d="M24 26 h16 M24 32 h16 M24 38 h16" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />}
      {idx === TIERS.length - 1 && <path d="M32 0 l2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7Z" fill="#FFDD66" />}
      {none && <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="800" fill="#5a5e66">?</text>}
    </svg>
  )
}

/* ── Körperkarte ── */

type Region = { g: MuscleGroup; el: ReactNode }
const mir = 'translate(100 0) scale(-1 1)'

const FRONT: Region[] = [
  { g: 'schultern', el: <ellipse cx="29" cy="43" rx="7.5" ry="8" /> },
  { g: 'brust', el: <path d="M49 41 L49 58 Q38 61 32 55 Q30 46 34 41 Q41 38 49 41 Z" /> },
  { g: 'arme', el: <ellipse cx="25.5" cy="61" rx="4.6" ry="10" transform="rotate(10 25.5 61)" /> },
  { g: 'arme', el: <ellipse cx="21.5" cy="83" rx="4" ry="11" transform="rotate(12 21.5 83)" /> },
  { g: 'core', el: <g><rect x="43" y="61" width="5.6" height="7" rx="1.6" /><rect x="43" y="69.5" width="5.6" height="7" rx="1.6" /><rect x="43.4" y="78" width="5.2" height="8" rx="1.6" /></g> },
  { g: 'core', el: <path d="M41.5 62 L41.5 88 Q37 86 35 78 Q35 68 36.5 61 Z" /> },
  { g: 'beine', el: <path d="M48.5 100 Q47 124 45 141 Q38 143 35 138 Q33 118 36 100 Q42 97 48.5 100 Z" /> },
  { g: 'beine', el: <ellipse cx="39.5" cy="165" rx="5" ry="13" /> },
]
const BACK: Region[] = [
  { g: 'ruecken', el: <path d="M50 28 L35 38 L41 43 L50 62 Z" /> },
  { g: 'schultern', el: <ellipse cx="29" cy="43" rx="7.5" ry="8" /> },
  { g: 'ruecken', el: <path d="M48.5 47 L48.5 74 Q42 82 37 78 Q34 64 35.5 50 Q41 45 48.5 47 Z" /> },
  { g: 'ruecken', el: <rect x="44" y="77" width="5" height="15" rx="2" /> },
  { g: 'arme', el: <ellipse cx="25" cy="60" rx="5" ry="10.5" transform="rotate(10 25 60)" /> },
  { g: 'arme', el: <ellipse cx="21.5" cy="83" rx="4" ry="11" transform="rotate(12 21.5 83)" /> },
  { g: 'beine', el: <ellipse cx="41.5" cy="104" rx="8.5" ry="9" /> },
  { g: 'beine', el: <path d="M48 116 Q47 132 45 143 Q38 145 35.5 140 Q34 124 35.5 114 Q42 112 48 116 Z" /> },
  { g: 'beine', el: <ellipse cx="40" cy="163" rx="6" ry="12.5" /> },
]

function Silhouette() {
  const half = (
    <g>
      <path d="M50 30 L44 30 L44 34 Q33 35 26 38 Q21 42 21 50 L18 70 L13 94 L15 98 L19 97 L26 74 L30 58 L33 64 L35 92 L34 100 L33 140 L35 178 L33 190 L46 190 L45 178 L47 140 L50 108 Z" />
    </g>
  )
  return (
    <g fill="#1b1e23" stroke="#2c3037" strokeWidth="0.8">
      <ellipse cx="50" cy="15" rx="9" ry="11" />
      {half}
      <g transform={mir}>{half}</g>
    </g>
  )
}

export function BodyMap({ groups, side, selected, onSelect }: { groups: GroupRank[]; side: 'front' | 'back'; selected?: MuscleGroup | null; onSelect?: (g: MuscleGroup) => void }) {
  const byG = new Map(groups.map((g) => [g.group, g]))
  const regions = side === 'front' ? FRONT : BACK
  return (
    <svg viewBox="0 0 100 196" className="h-full w-full" role="img" aria-label={side === 'front' ? 'Körper vorne' : 'Körper hinten'}>
      <defs>
        <filter id={`bm-glow-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <Silhouette />
      {regions.map((r, i) => {
        const gr = byG.get(r.g)
        const t = gr?.tier ?? UNRANKED
        const hi = tierIndex(t) >= 4
        const dim = selected && selected !== r.g
        const props = {
          fill: t.color,
          stroke: '#0a0a0a',
          strokeWidth: 0.7,
          opacity: dim ? 0.3 : 0.95,
          filter: hi && !dim ? `url(#bm-glow-${side})` : undefined,
          style: { cursor: onSelect ? 'pointer' : undefined, transition: 'opacity .25s' },
          onClick: () => onSelect?.(r.g),
        }
        return (
          <g key={i} {...props}>
            {r.el}
            <g transform={mir}>{r.el}</g>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Karte für den Fortschritt ── */

export function RankCard() {
  const r = useRanks()
  const [sel, setSel] = useState<MuscleGroup | null>(null)
  const oi = tierIndex(r.overall)
  const nextOverall = TIERS[oi + 1]
  const overallTo = nextOverall && oi >= 0 ? Math.max(0, Math.min(1, (r.overallScore - r.overall.min) / (nextOverall.min - r.overall.min))) : 1
  const list = sel ? r.groups.filter((g) => g.group === sel) : r.groups
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden" data-testid="rank-card">
      <div className="flex items-center gap-4 border-b border-white/[0.06] p-5">
        <RankBadge tier={r.overall} size={76} />
        <div className="min-w-0 flex-1">
          <div className="label flex items-center gap-1.5 !text-lime/90">
            <Trophy size={12} /> Dein Gym-Rang
          </div>
          <div className="font-display text-4xl leading-none tracking-wide" style={{ color: r.overall.key === 'none' ? undefined : r.overall.glow }}>
            {r.overall.name}
          </div>
          {nextOverall && r.ranked > 0 && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${overallTo * 100}%`, background: r.overall.color }} />
              </div>
              <div className="mt-1 text-xs text-white/45">Nächster Rang: {nextOverall.name}</div>
            </>
          )}
          {r.ranked === 0 && <div className="mt-1 text-xs text-white/45">Trainiere mit Gewicht – nach dem ersten Training bekommst du deine Ränge.</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-4">
        {(['front', 'back'] as const).map((s) => (
          <div key={s} className="relative h-64 md:h-80">
            <BodyMap groups={r.groups} side={s} selected={sel} onSelect={(g) => setSel((x) => (x === g ? null : g))} />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/30">{s === 'front' ? 'Vorne' : 'Hinten'}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-white/35">{sel ? 'Nochmal tippen für alle Muskeln' : 'Tippe auf einen Muskel für Details'}</p>

      {r.estimated && (
        <Link to="/fortschritt#koerpergewicht" className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-blaze/10 px-3 py-2 text-xs font-semibold text-blaze">
          <Scale size={14} /> Kein Körpergewicht eingetragen – gerechnet mit {r.bodyweight} kg. Für genaue Ränge eintragen.
        </Link>
      )}

      <ul className="mt-3 divide-y divide-white/[0.05] border-t border-white/[0.06]">
        {list.map((g) => (
          <li key={g.group} className="flex items-center gap-3 px-4 py-3">
            <RankBadge tier={g.tier} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{MUSCLE_LABEL[g.group]}</span>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: g.tier.key === 'none' ? '#6b7079' : g.tier.glow }}>
                  {g.tier.name}
                </span>
              </div>
              {g.best ? (
                <>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${g.toNext * 100}%`, background: g.tier.color }} />
                  </div>
                  <div className="mt-1 truncate text-xs text-white/45">{g.goal ? <>Für {g.next?.name}: {g.goal}</> : 'Höchster Rang erreicht 👑'}</div>
                </>
              ) : (
                <div className="text-xs text-white/40">Noch nicht trainiert</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 overflow-x-auto border-t border-white/[0.06] px-4 py-3">
        {TIERS.map((t) => (
          <div key={t.key} className={cn('flex shrink-0 flex-col items-center gap-0.5', t.key === r.overall.key ? 'opacity-100' : 'opacity-50')}>
            <RankBadge tier={t} size={30} />
            <span className="text-[9px] font-bold uppercase" style={{ color: t.glow }}>{t.name}</span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

/* ── Aufstieg nach dem Training (Recap) ── */

export function RankUps({ workoutId }: { workoutId: string }) {
  const before = useRanks(workoutId)
  const after = useRanks()
  const ups = after.groups
    .map((g) => ({ g, prev: before.groups.find((x) => x.group === g.group)! }))
    .filter(({ g, prev }) => tierIndex(g.tier) > tierIndex(prev.tier))
  const overallUp = tierIndex(after.overall) > tierIndex(before.overall)
  if (!ups.length && !overallUp) return null
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card p-4" data-testid="rank-ups">
      <div className="label mb-3 flex items-center gap-1.5 !text-lime">
        <ChevronUp size={14} /> Rang-Aufstieg!
      </div>
      <div className="space-y-2">
        {overallUp && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5">
            <RankBadge tier={after.overall} size={40} />
            <div className="text-sm">
              <b>Gesamtrang</b>: {before.overall.name} → <b style={{ color: after.overall.glow }}>{after.overall.name}</b>
            </div>
          </div>
        )}
        {ups.map(({ g, prev }) => (
          <div key={g.group} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5">
            <RankBadge tier={g.tier} size={36} />
            <div className="text-sm">
              <b>{MUSCLE_LABEL[g.group]}</b>: {prev.tier.name} → <b style={{ color: g.tier.glow }}>{g.tier.name}</b>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
