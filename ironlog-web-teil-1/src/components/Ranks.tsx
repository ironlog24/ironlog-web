import { useEffect, useMemo, useState } from 'react'
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

/* ── Körperkarte (anatomische Figur, vorne/hinten) ── */

type P = [number, number]
function sm(pts: P[], t = 0.55) {
  const n = pts.length
  const at = (i: number) => pts[(i + n) % n]
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return d + ' Z'
}
const mir = 'translate(120 0) scale(-1 1)'

// linke Körperhälfte (x < 60), wird gespiegelt
const BODY_HALF: P[] = [[60,27],[54.5,28],[54,34],[46,37],[35,38],[26,41.5],[21,50],[20.5,62],[20.5,74],[20,82],[16.5,88],[13,100],[12,110],[9.5,117],[11,124],[16,125.5],[19,118],[20,111],[24,103],[28,92],[30.5,84],[32,74],[33,64],[35,62],[35.5,72],[37,86],[39.5,98],[38,110],[35.5,122],[34.5,138],[37,152],[39.5,160],[37,172],[38.5,188],[42.5,200],[41,206],[44,209],[54,209],[54.5,202],[55,192],[56.5,178],[56.5,164],[57.5,152],[58.5,136],[60,120]]
const DELT: P[] = [[43,39],[36,38.8],[28.5,41.5],[23.5,48],[22,56],[23,61],[27.5,59.5],[31,53],[35.5,47.5],[41.5,43.5]]
const FOREARM: P[] = [[23.5,85],[18.5,89],[15,98],[14,107],[17,110.5],[21.5,105.5],[25.5,96],[27.5,89]]
const ABS = 'M51.3 66.5h7.7v7h-7.7z M51.3 75h7.7v7h-7.7z M51.5 83.5h7.5v7.5h-7.5z M52 92.5h7v14q-4.5 -2 -7 -8z'

type Region = { g: MuscleGroup; d: string; whole?: boolean }
const FRONT: Region[] = [
  { g: 'ruecken', d: sm([[55.5,30],[50,35],[45,38.5],[52,38],[56,35]]) },
  { g: 'schultern', d: sm(DELT) },
  { g: 'brust', d: sm([[59,42],[50,40],[43,43.5],[37.5,48],[35.5,55],[37.5,61],[44,64.5],[52,64],[59,62]]) },
  { g: 'arme', d: sm([[31,57.5],[25.5,61],[22,67],[21.5,75],[23.5,82],[27.5,80.5],[31,73],[32.5,64]]) },
  { g: 'arme', d: sm(FOREARM) },
  { g: 'core', d: sm([[38,65],[37,74],[38.5,86],[42,96],[47,101],[49.3,92],[48.5,78],[46,66.5]]) },
  { g: 'core', d: ABS },
  { g: 'beine', d: sm([[40,112],[37,122],[36.5,135],[38.5,148],[43,157],[49,158],[52.5,151],[53,138],[52,122],[49,113]]) },
  { g: 'beine', d: sm([[56,116],[54.5,127],[55.5,140],[58,136],[59.3,122]]) },
  { g: 'beine', d: sm([[41,166],[38.5,176],[40,188],[44,198],[47.5,196],[48.5,184],[47.5,170],[45,164]]) },
  { g: 'beine', d: sm([[50.5,166],[51,180],[53,192],[55,182],[54.5,168]]) },
]
const BACK: Region[] = [
  { g: 'ruecken', d: sm([[60,27],[54,31],[44,37],[38,40],[44,44],[52,52],[56,62],[60,71],[64,62],[68,52],[76,44],[82,40],[76,37],[66,31]]), whole: true },
  { g: 'schultern', d: sm(DELT) },
  { g: 'ruecken', d: sm([[56,66],[51,57],[44,50],[38,51],[36,60],[37.5,74],[41,88],[47,97],[53,98],[54.5,89],[57.5,74]]) },
  { g: 'ruecken', d: sm([[59,84],[56.5,92],[56,103],[59,106]]) },
  { g: 'arme', d: sm([[31,57.5],[25.5,61],[22,67],[21.5,75],[23.5,82],[27.5,80.5],[31,73],[32.5,64]]) },
  { g: 'arme', d: sm(FOREARM) },
  { g: 'beine', d: sm([[59,108],[50,106],[41,111],[38.5,122],[42,131],[51,133],[59,129]]) },
  { g: 'beine', d: sm([[40,135],[37.5,146],[40,157],[45,160],[48.5,150],[48,138]]) },
  { g: 'beine', d: sm([[51,136],[50.5,148],[53,158],[57.5,154],[58.5,140]]) },
  { g: 'beine', d: sm([[42,166],[39,177],[41.5,189],[46,192],[48.5,182],[47.5,169]]) },
  { g: 'beine', d: sm([[50.5,167],[50,180],[52.5,190],[56,186],[56.5,174],[54.5,166]]) },
]

export function BodyMap({ groups, side, selected, onSelect }: { groups: GroupRank[]; side: 'front' | 'back'; selected?: MuscleGroup | null; onSelect?: (g: MuscleGroup) => void }) {
  const byG = new Map(groups.map((g) => [g.group, g]))
  const regions = side === 'front' ? FRONT : BACK
  const body = sm(BODY_HALF, 0.4)
  return (
    <svg viewBox="6 2 108 210" className="h-full w-full" role="img" aria-label={side === 'front' ? 'Körper vorne' : 'Körper hinten'}>
      <defs>
        <linearGradient id={`bm-skin-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9d2da" />
          <stop offset="100%" stopColor="#8f9aa5" />
        </linearGradient>
        <filter id={`bm-glow-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Körper */}
      <g fill={`url(#bm-skin-${side})`}>
        <ellipse cx="60" cy="17" rx="9.5" ry="12" />
                <path d={body} />
        <path d={body} transform={mir} />
      </g>
            {/* Muskeln */}
      {regions.map((r, i) => {
        const gr = byG.get(r.g)
        const t = gr?.tier ?? UNRANKED
        const none = t.key === UNRANKED.key
        const hi = tierIndex(t) >= 4
        const dim = selected && selected !== r.g
        const props = {
          fill: none ? '#6c7782' : t.color,
          stroke: '#20242a',
          strokeWidth: 0.6,
          strokeLinejoin: 'round' as const,
          opacity: dim ? 0.28 : 1,
          filter: hi && !dim ? `url(#bm-glow-${side})` : undefined,
          style: { cursor: onSelect ? 'pointer' : undefined, transition: 'opacity .25s' },
          onClick: () => onSelect?.(r.g),
        }
        return (
          <g key={i} {...props}>
            <path d={r.d} />
            {!r.whole && <path d={r.d} transform={mir} />}
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
          <div key={s} className="relative h-72 pb-5 md:h-96">
            <BodyMap groups={r.groups} side={s} selected={sel} onSelect={(g) => setSel((x) => (x === g ? null : g))} />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/30">{s === 'front' ? 'Vorne' : 'Hinten'}</span>
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
