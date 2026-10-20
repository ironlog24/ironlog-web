import type { Exercise, MuscleGroup, Workout } from '@/data/types'
import { MUSCLES } from '@/data/types'
import { epley } from '@/lib/utils'

/**
 * IRONLOG-Ränge: Jede Muskelgruppe bekommt einen Rang – je nachdem, wie stark du
 * im Verhältnis zu deinem Körpergewicht bist (bester geschätzter 1RM der Gruppe).
 */

export interface Tier {
  key: string
  name: string
  min: number // Mindest-Score 0…1
  color: string
  glow: string
}

export const TIERS: Tier[] = [
  { key: 'rost', name: 'Rost', min: 0, color: '#8B5A3C', glow: '#B8734A' },
  { key: 'eisen', name: 'Eisen', min: 0.15, color: '#7D8590', glow: '#A8B0BA' },
  { key: 'bronze', name: 'Bronze', min: 0.28, color: '#CD7F45', glow: '#E89A5E' },
  { key: 'silber', name: 'Silber', min: 0.4, color: '#C9D1DA', glow: '#EEF3F8' },
  { key: 'gold', name: 'Gold', min: 0.52, color: '#F2C230', glow: '#FFDD66' },
  { key: 'platin', name: 'Platin', min: 0.63, color: '#3FD6C6', glow: '#7BF2E5' },
  { key: 'diamant', name: 'Diamant', min: 0.74, color: '#6C8CFF', glow: '#A3B6FF' },
  { key: 'elite', name: 'Elite', min: 0.85, color: '#C6FF00', glow: '#E2FF80' },
  { key: 'legende', name: 'Legende', min: 0.95, color: '#FF5F1F', glow: '#FF9A6B' },
]

export const UNRANKED: Tier = { key: 'none', name: 'Ohne Rang', min: -1, color: '#2A2D33', glow: '#3A3D44' }

export const tierFor = (score: number | null) => {
  if (score == null) return UNRANKED
  let t = TIERS[0]
  for (const x of TIERS) if (score >= x.min) t = x
  return t
}
export const tierIndex = (t: Tier) => TIERS.findIndex((x) => x.key === t.key)

/**
 * Elite-Standards: e1RM ÷ Körpergewicht (Männer), bei Körpergewicht-Übungen Wiederholungen.
 * Kurzhantel-Werte gelten pro Hantel.
 */
const STD: Record<string, { ratio?: number; reps?: number; lower?: boolean }> = {
  bankdruecken: { ratio: 1.75 },
  schraegbankdruecken: { ratio: 1.5 },
  'kh-bankdruecken': { ratio: 0.65 },
  'kh-schraegbankdruecken': { ratio: 0.58 },
  brustpresse: { ratio: 1.6 },
  bankdrueckmaschine: { ratio: 1.6 },
  'schraegbank-gefuehrt': { ratio: 1.45 },
  'kabel-flys': { ratio: 0.5 },
  butterfly: { ratio: 1.1 },
  liegestuetze: { reps: 70 },
  dips: { reps: 40 },

  kreuzheben: { ratio: 2.75, lower: true },
  langhantelrudern: { ratio: 1.5 },
  't-bar-rudern': { ratio: 1.6 },
  latziehen: { ratio: 1.3 },
  'latziehen-eng': { ratio: 1.3 },
  kabelrudern: { ratio: 1.4 },
  'rudern-kabelturm': { ratio: 1.3 },
  'rudermaschine-breit': { ratio: 1.4 },
  'kh-rudern': { ratio: 0.75 },
  klimmzuege: { reps: 25 },

  kniebeugen: { ratio: 2.4, lower: true },
  beinpresse: { ratio: 4.5, lower: true },
  'rum-kreuzheben': { ratio: 2.2, lower: true },
  'hip-thrusts': { ratio: 2.8, lower: true },
  beinstrecker: { ratio: 1.4, lower: true },
  beinbeuger: { ratio: 1.1, lower: true },
  wadenheben: { ratio: 2.5, lower: true },
  ausfallschritte: { ratio: 0.6, lower: true },
  'bulgarian-split': { ratio: 0.6, lower: true },

  schulterdruecken: { ratio: 1.1 },
  'kh-schulterdruecken': { ratio: 0.5 },
  'schulterdruecken-maschine': { ratio: 1.1 },
  'arnold-press': { ratio: 0.45 },
  seitheben: { ratio: 0.3 },
  'seitheben-maschine': { ratio: 0.6 },

  bizepscurls: { ratio: 0.85 },
  'sz-curls': { ratio: 0.8 },
  'bizeps-maschine': { ratio: 0.8 },
  hammercurls: { ratio: 0.45 },
  konzentrationscurls: { ratio: 0.35 },
  'curls-einarmig-kabel': { ratio: 0.3 },
  trizepsdruecken: { ratio: 0.9 },
  'french-press': { ratio: 0.75 },

  crunches: { reps: 60 },
  beinheben: { reps: 25 },
  'ab-wheel': { reps: 25 },
  plank: { reps: 180 },
  'russian-twists': { reps: 60 },
}

export interface GroupRank {
  group: MuscleGroup
  score: number | null
  tier: Tier
  next: Tier | null
  /** Fortschritt zum nächsten Rang 0…1 */
  toNext: number
  best: { exerciseId: string; name: string; weight: number; reps: number; e1rm: number } | null
  /** Was du für den nächsten Rang schaffen musst */
  goal: string | null
}

const fmt = (n: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(n)
const round25 = (n: number) => Math.ceil(n / 2.5) * 2.5

export function computeRanks(workouts: Workout[], exercises: Exercise[], bodyweight: number, female: boolean) {
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  // bester Satz je Übung
  const best = new Map<string, { weight: number; reps: number; e1rm: number }>()
  for (const w of workouts) {
    if (!w.ended_at) continue
    for (const we of w.exercises)
      for (const s of we.sets) {
        if (!s.done || s.reps <= 0) continue
        const e1rm = s.weight > 0 ? epley(s.weight, s.reps) : 0
        const cur = best.get(we.exercise_id)
        const val = s.weight > 0 ? e1rm : s.reps
        const curVal = cur ? (cur.weight > 0 ? cur.e1rm : cur.reps) : -1
        if (val > curVal) best.set(we.exercise_id, { weight: s.weight, reps: s.reps, e1rm })
      }
  }

  const scoreOf = (id: string, b: { weight: number; reps: number; e1rm: number }) => {
    const std = STD[id]
    const ex = exMap.get(id)
    const fem = female ? (std?.lower ? 0.75 : 0.6) : 1
    if (std?.reps || (b.weight <= 0 && ex?.bodyweight)) {
      const target = (std?.reps ?? 30) * (female ? 0.7 : 1)
      return { s: Math.min(1.1, b.reps / target), target, kind: 'reps' as const }
    }
    if (b.weight <= 0) return null
    const ratio = (std?.ratio ?? 1) * fem
    return { s: Math.min(1.1, b.e1rm / bodyweight / ratio), target: ratio * bodyweight, kind: 'kg' as const }
  }

  const groups: GroupRank[] = MUSCLES.map((g) => {
    let top: { id: string; s: number; target: number; kind: 'reps' | 'kg' } | null = null
    for (const [id, b] of best) {
      if (exMap.get(id)?.muscle_group !== g) continue
      const r = scoreOf(id, b)
      if (r && (!top || r.s > top.s)) top = { id, ...r }
    }
    if (!top) return { group: g, score: null, tier: UNRANKED, next: TIERS[0], toNext: 0, best: null, goal: null }
    const tier = tierFor(top.s)
    const idx = tierIndex(tier)
    const next = TIERS[idx + 1] ?? null
    const toNext = next ? Math.max(0, Math.min(1, (top.s - tier.min) / (next.min - tier.min))) : 1
    const b = best.get(top.id)!
    const name = exMap.get(top.id)?.name ?? top.id
    let goal: string | null = null
    if (next) {
      const needed = next.min * top.target
      if (top.kind === 'reps') goal = `${name}: ${Math.ceil(needed)} Wiederholungen am Stück`
      else {
        const w5 = round25(needed / (1 + 5 / 30))
        goal = `${name}: ${fmt(w5)} kg × 5`
      }
    }
    return { group: g, score: top.s, tier, next, toNext, best: { exerciseId: top.id, name, ...b }, goal }
  })

  // Gesamtrang: Durchschnitt aller 6 Gruppen – ungewertete zählen als 0 (kein Skip-Leg-Day!)
  const overallScore = groups.reduce((a, g) => a + (g.score ?? 0), 0) / groups.length
  const ranked = groups.filter((g) => g.score != null).length
  const overall = ranked ? tierFor(overallScore) : UNRANKED
  return { groups, overall, overallScore, ranked }
}

export type Ranks = ReturnType<typeof computeRanks>
