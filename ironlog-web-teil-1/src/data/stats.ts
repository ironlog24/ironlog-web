import type { Exercise, MuscleGroup, Workout, WorkoutSet } from './types'
import { dayKey, epley, startOfWeek } from '@/lib/utils'

export const doneSets = (w: Workout) => w.exercises.flatMap((e) => e.sets.filter((s) => s.done))
export const workoutVolume = (w: Workout) => doneSets(w).reduce((a, s) => a + s.weight * s.reps, 0)
export const workoutDuration = (w: Workout) =>
  w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0

export const byDate = (a: Workout, b: Workout) => +new Date(a.started_at) - +new Date(b.started_at)

/** Score für PR-Vergleich: e1RM, bei Körpergewicht die Wiederholungen */
export const setScore = (s: Pick<WorkoutSet, 'weight' | 'reps'>) => (s.weight > 0 ? epley(s.weight, s.reps) : s.reps)

export interface PR {
  exercise_id: string
  weight: number
  reps: number
  e1rm: number
  date: string
  workout_id: string
}

/** Alle PR-Ereignisse chronologisch (erste Sitzung einer Übung zählt nicht als PR) */
export function prEvents(workouts: Workout[]) {
  const best = new Map<string, number>()
  const events: (PR & { set_id: string })[] = []
  for (const w of [...workouts].filter((x) => x.ended_at).sort(byDate)) {
    for (const we of w.exercises) {
      const prev = best.get(we.exercise_id)
      let sessionBest = prev ?? 0
      let top: WorkoutSet | null = null
      for (const s of we.sets) {
        if (!s.done) continue
        const sc = setScore(s)
        if (sc > sessionBest) {
          sessionBest = sc
          top = s
        }
      }
      if (top && prev !== undefined && sessionBest > prev) {
        events.push({
          exercise_id: we.exercise_id, weight: top.weight, reps: top.reps, e1rm: setScore(top),
          date: w.started_at, workout_id: w.id, set_id: top.id,
        })
      }
      if (sessionBest > 0) best.set(we.exercise_id, Math.max(prev ?? 0, sessionBest))
    }
  }
  return events
}

/** Bestwerte je Übung (für PR-Wall & Live-Erkennung) */
export function bestByExercise(workouts: Workout[], excludeId?: string) {
  const m = new Map<string, PR>()
  for (const w of workouts) {
    if (w.id === excludeId || !w.ended_at) continue
    for (const we of w.exercises)
      for (const s of we.sets) {
        if (!s.done) continue
        const sc = setScore(s)
        const cur = m.get(we.exercise_id)
        if (!cur || sc > cur.e1rm)
          m.set(we.exercise_id, { exercise_id: we.exercise_id, weight: s.weight, reps: s.reps, e1rm: sc, date: w.started_at, workout_id: w.id })
      }
  }
  return m
}

export function exerciseStats(workouts: Workout[], exId: string) {
  let bestWeight = 0
  let best1rm = 0
  let bestVolume = 0
  let sessions = 0
  const series: { date: string; e1rm: number; weight: number; volume: number }[] = []
  const history: { workout: Workout; sets: WorkoutSet[] }[] = []
  for (const w of [...workouts].filter((x) => x.ended_at).sort(byDate)) {
    const sets = w.exercises.filter((e) => e.exercise_id === exId).flatMap((e) => e.sets.filter((s) => s.done))
    if (!sets.length) continue
    sessions++
    const top = Math.max(...sets.map(setScore))
    const vol = sets.reduce((a, s) => a + s.weight * s.reps, 0)
    bestWeight = Math.max(bestWeight, ...sets.map((s) => s.weight))
    best1rm = Math.max(best1rm, top)
    bestVolume = Math.max(bestVolume, vol)
    series.push({ date: w.started_at, e1rm: Math.round(top * 10) / 10, weight: Math.max(...sets.map((s) => s.weight)), volume: vol })
    history.push({ workout: w, sets })
  }
  return { bestWeight, best1rm, bestVolume, sessions, series, history: history.reverse() }
}

/** Letzte Werte einer Übung (für "Vorher"-Spalte) */
export function previousSets(workouts: Workout[], exId: string, excludeId?: string) {
  const sorted = [...workouts].filter((w) => w.ended_at && w.id !== excludeId).sort(byDate).reverse()
  for (const w of sorted) {
    const we = w.exercises.find((e) => e.exercise_id === exId)
    if (we && we.sets.some((s) => s.done)) return we.sets.filter((s) => s.done)
  }
  return []
}

export interface Suggestion {
  weight: number
  reps: number
  kind: 'up' | 'reps' | 'hold'
  text: string
}

/**
 * Doppelte Progression: Wurden beim letzten Mal in allen Sätzen die Ziel-Wiederholungen geschafft,
 * kommt Gewicht drauf (Wdh. zurück aufs Ziel). Sonst gleiches Gewicht, eine Wiederholung mehr.
 */
export function suggestNext(prev: WorkoutSet[], target: number, opts: { bodyweight?: boolean; equipment?: string; muscle?: string } = {}): Suggestion | null {
  const done = prev.filter((s) => s.done)
  if (!done.length) return null
  const topW = Math.max(...done.map((s) => s.weight))
  const work = done.filter((s) => s.weight === topW)
  const minReps = Math.min(...work.map((s) => s.reps))
  const hit = work.every((s) => s.reps >= target)
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
  if (opts.bodyweight && topW === 0) {
    return { weight: 0, reps: minReps + 1, kind: 'reps', text: `Ziel heute: ${minReps + 1} Wdh. pro Satz` }
  }
  if (hit) {
    const eq = (opts.equipment ?? '').toLowerCase()
    const inc = eq.includes('kurzhantel') ? 2 : opts.muscle === 'beine' && !eq.includes('maschine') ? 5 : 2.5
    const w = topW + inc
    return { weight: w, reps: target, kind: 'up', text: `Letztes Mal alle Wdh. geschafft → ${fmt(w)} kg × ${target}` }
  }
  const r = Math.min(target, minReps + 1)
  return { weight: topW, reps: r, kind: 'reps', text: `Bei ${fmt(topW)} kg bleiben, Ziel ${r} Wdh.` }
}

export function weeklyVolume(workouts: Workout[], weeks = 8) {
  const now = startOfWeek(new Date())
  const out = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(now)
    start.setDate(now.getDate() - (weeks - 1 - i) * 7)
    return { start, label: `KW ${isoWeek(start)}`, volume: 0, count: 0 }
  })
  for (const w of workouts) {
    if (!w.ended_at) continue
    const ws = startOfWeek(new Date(w.started_at)).getTime()
    const b = out.find((x) => x.start.getTime() === ws)
    if (b) {
      b.volume += workoutVolume(w)
      b.count++
    }
  }
  return out
}

export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((+t - +y) / 86400000 + 1) / 7)
}

/** Wochen-Streak: aufeinanderfolgende Wochen mit ≥1 Training (aktuelle Woche zählt, wenn trainiert) */
export function weekStreak(workouts: Workout[]) {
  const weeks = new Set(workouts.filter((w) => w.ended_at).map((w) => startOfWeek(new Date(w.started_at)).getTime()))
  const cur = startOfWeek(new Date())
  let streak = 0
  const d = new Date(cur)
  if (!weeks.has(d.getTime())) d.setDate(d.getDate() - 7) // aktuelle Woche darf noch offen sein
  while (weeks.has(d.getTime())) {
    streak++
    d.setDate(d.getDate() - 7)
  }
  return streak
}

export function muscleDistribution(workouts: Workout[], exercises: Exercise[], sinceDays = 30) {
  const since = Date.now() - sinceDays * 86400000
  const map = new Map(exercises.map((e) => [e.id, e.muscle_group]))
  const res: Record<MuscleGroup, number> = { brust: 0, ruecken: 0, beine: 0, schultern: 0, arme: 0, core: 0 }
  for (const w of workouts) {
    if (!w.ended_at || +new Date(w.started_at) < since) continue
    for (const we of w.exercises) {
      const mg = map.get(we.exercise_id)
      if (!mg) continue
      // Sätze zählen ist fairer als kg (Beinpresse vs. Seitheben)
      res[mg] += we.sets.filter((s) => s.done).length
    }
  }
  return res
}

export function trainingDays(workouts: Workout[]) {
  const m = new Map<string, number>()
  for (const w of workouts) {
    if (!w.ended_at) continue
    const k = dayKey(new Date(w.started_at))
    m.set(k, (m.get(k) ?? 0) + workoutVolume(w))
  }
  return m
}
