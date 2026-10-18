import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, type SessionUser } from '@/data/api'
import type { Exercise, Profile, Template, Workout, WorkoutExercise, WorkoutSet } from '@/data/types'
import { bestByExercise, previousSets, setScore, suggestNext } from '@/data/stats'
import { uid } from '@/lib/utils'
import { LEGACY_COVER_MAP, PLAN_COVERS } from '@/lib/images'
import { exerciseImage } from '@/lib/exerciseImages'

/* ════════════════════ Auth + Daten ════════════════════ */

interface DataCtx {
  ready: boolean
  user: SessionUser | null
  profile: Profile | null
  exercises: Exercise[]
  exMap: Map<string, Exercise>
  workouts: Workout[]
  templates: Template[]
  loading: boolean
  loadError: string | null
  /** Trainings, die noch nicht beim Server angekommen sind (offline) */
  pendingCount: number
  syncNow: () => Promise<void>
  reload: () => Promise<void>
  saveWorkout: (w: Workout) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
  saveTemplate: (t: Template) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  createExercise: typeof api.createExercise
  updateProfile: (p: Partial<Profile>) => Promise<void>
}

const Data = createContext<DataCtx | null>(null)

/** Alte Standard-Cover und Standard-Pläne auf die passenden Push/Pull/Leg-Cover umstellen */
function withPlanCover(t: Template): Template {
  if (t.cover_url && LEGACY_COVER_MAP[t.cover_url]) return { ...t, cover_url: LEGACY_COVER_MAP[t.cover_url] }
  // Mitgelieferte Cover haben einen Hash im Dateinamen, der sich pro Version ändert → immer auf die aktuelle Datei zeigen
  const bundled = t.cover_url?.match(/\/assets\/(push|pull|legs)-[\w-]+\.jpg$/)
  if (bundled) return { ...t, cover_url: PLAN_COVERS[bundled[1] as 'push'] }
  const stock = !t.cover_url || t.cover_url.includes('images.unsplash.com')
  const key = ({ 'push day': 'push', 'pull day': 'pull', 'leg day': 'legs' } as const)[t.name.trim().toLowerCase() as 'push day']
  return stock && key ? { ...t, cover_url: PLAN_COVERS[key] } : t
}

/* ── Offline-Warteschlange: Trainings, die ohne Verbindung gespeichert wurden ── */
const isOffline = (e: unknown) => {
  const m = String((e as { message?: string })?.message ?? e)
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || /failed to fetch|networkerror|load failed|network request failed|fetch failed|timeout/i.test(m)
}
const pendingKey = (uid: string) => `ironlog.pending.${uid}.v1`
const readPending = (uid: string): Workout[] => {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(uid)) || '[]')
  } catch {
    return []
  }
}
const writePending = (uid: string, list: Workout[]) => {
  try {
    if (list.length) localStorage.setItem(pendingKey(uid), JSON.stringify(list))
    else localStorage.removeItem(pendingKey(uid))
  } catch {
    /* noop */
  }
}

type Cache = { profile: Profile; exercises: Exercise[]; workouts: Workout[]; templates: Template[] }
const cacheKey = (uid: string) => `ironlog.cache.${uid}.v1`
const readCache = (uid: string): Partial<Cache> | null => {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(uid)) || 'null')
  } catch {
    return null
  }
}
const writeCache = (uid: string, c: Cache) => {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(c))
  } catch {
    /* Speicher voll – Cache ist optional */
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const uidRef = useRef<string | null>(null)
  uidRef.current = user?.id ?? null

  /** Wartende Trainings hochladen; gibt die noch offenen zurück */
  const flush = useCallback(async () => {
    const id = uidRef.current
    if (!id || api.mode !== 'supabase') return
    const list = readPending(id)
    if (!list.length) return setPendingCount(0)
    const left: Workout[] = []
    for (const w of list) {
      try {
        await api.saveWorkout(w)
      } catch (e) {
        left.push(w)
        if (!isOffline(e)) console.error('[IRONLOG] Sync fehlgeschlagen', e)
      }
    }
    writePending(id, left)
    setPendingCount(left.length)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      // einzeln abfangen: ein fehlerhafter Request darf die App nicht leer/schwarz lassen
      const [p, ex, w, t] = await Promise.allSettled([api.getProfile(), api.listExercises(), api.listWorkouts(), api.listTemplates()])
      const failed = [p, ex, w, t].filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      failed.forEach((r) => console.error('[IRONLOG] Laden fehlgeschlagen', r.reason))
      const offline = failed.length > 0 && failed.every((r) => isOffline(r.reason))
      setLoadError(failed.length ? (offline ? 'offline' : String((failed[0].reason as { message?: string })?.message ?? failed[0].reason)) : null)

      // Offline-Cache: letzte erfolgreich geladene Daten (für das Gym ohne Empfang)
      const id = uidRef.current
      const cache = id && api.mode === 'supabase' ? readCache(id) : null
      const pv = p.status === 'fulfilled' ? p.value : cache?.profile
      const exv = ex.status === 'fulfilled' ? ex.value : cache?.exercises?.map((e) => (e.is_custom ? e : { ...e, image_url: exerciseImage(e.id, e.image_url) }))
      const wv = w.status === 'fulfilled' ? w.value : cache?.workouts
      const tv = t.status === 'fulfilled' ? t.value : cache?.templates
      if (id && api.mode === 'supabase' && !failed.length) writeCache(id, { profile: pv!, exercises: exv!, workouts: wv!, templates: tv! })

      if (pv) setProfile(pv)
      if (exv) setExercises([...exv].sort((a, b) => a.name.localeCompare(b.name, 'de')))
      if (wv) {
        const pend = id ? readPending(id) : []
        setWorkouts([...wv.filter((x) => !pend.some((q) => q.id === x.id)), ...pend])
        setPendingCount(pend.length)
      }
      if (tv) setTemplates(tv.map(withPlanCover))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api
      .getUser()
      .then(setUser)
      .catch((e) => console.error('Session konnte nicht geladen werden', e))
      .finally(() => setReady(true))
    // nur bei echtem Nutzerwechsel neu setzen (Token-Refresh liefert neue Objekte mit gleicher ID)
    return api.onAuthChange((u) => setUser((cur) => (cur?.id === u?.id ? cur : u)))
  }, [])

  useEffect(() => {
    if (user) reload().catch((e) => console.error('Daten konnten nicht geladen werden', e))
    else {
      setProfile(null)
      setWorkouts([])
      setTemplates([])
    }
  }, [user, reload])

  useEffect(() => {
    if (!user) return
    flush()
    const on = () => flush().then(() => reload())
    window.addEventListener('online', on)
    const t = setInterval(() => {
      if (uidRef.current && readPending(uidRef.current).length) flush()
    }, 60_000)
    return () => {
      window.removeEventListener('online', on)
      clearInterval(t)
    }
  }, [user, flush, reload])

  const value = useMemo<DataCtx>(
    () => ({
      ready, user, profile, exercises, workouts, templates, loading, loadError, reload,
      exMap: new Map(exercises.map((e) => [e.id, e])),
      pendingCount,
      syncNow: flush,
      async saveWorkout(w) {
        setWorkouts((all) => [...all.filter((x) => x.id !== w.id), w])
        try {
          await api.saveWorkout(w)
        } catch (e) {
          // Ohne Netz: lokal vormerken und später automatisch hochladen
          if (api.mode === 'supabase' && user && isOffline(e)) {
            const list = [...readPending(user.id).filter((x) => x.id !== w.id), w]
            writePending(user.id, list)
            setPendingCount(list.length)
            return
          }
          throw e
        }
      },
      async deleteWorkout(id) {
        setWorkouts((all) => all.filter((x) => x.id !== id))
        if (user) {
          const list = readPending(user.id)
          if (list.some((x) => x.id === id)) {
            writePending(user.id, list.filter((x) => x.id !== id))
            setPendingCount(list.length - 1)
          }
        }
        await api.deleteWorkout(id)
      },
      async saveTemplate(t) {
        setTemplates((all) => (all.some((x) => x.id === t.id) ? all.map((x) => (x.id === t.id ? t : x)) : [...all, t]))
        await api.saveTemplate(t)
      },
      async deleteTemplate(id) {
        setTemplates((all) => all.filter((x) => x.id !== id))
        await api.deleteTemplate(id)
      },
      async createExercise(ex, img) {
        const e = await api.createExercise(ex, img)
        setExercises((all) => [...all, e].sort((a, b) => a.name.localeCompare(b.name, 'de')))
        return e
      },
      async updateProfile(p) {
        setProfile((cur) => (cur ? { ...cur, ...p } : cur))
        await api.updateProfile(p)
      },
    }),
    [ready, user, profile, exercises, workouts, templates, loading, loadError, reload, pendingCount, flush],
  )
  return <Data.Provider value={value}>{children}</Data.Provider>
}

export function useData() {
  const c = useContext(Data)
  if (!c) throw new Error('DataProvider fehlt')
  return c
}

/* ════════════════════ Aktives Training ════════════════════ */

interface Rest {
  endsAt: number
  total: number
}

interface SessionCtx {
  active: Workout | null
  rest: Rest | null
  /** Set-IDs, die im laufenden Training einen PR darstellen */
  prSetIds: Set<string>
  start: (tpl?: Template | null) => Workout
  rename: (name: string) => void
  addExercise: (exerciseId: string) => void
  removeExercise: (weId: string) => void
  addSet: (weId: string) => void
  removeSet: (weId: string, setId: string) => void
  updateSet: (weId: string, setId: string, patch: Partial<WorkoutSet>) => void
  toggleSet: (weId: string, setId: string) => { pr: boolean; done: boolean }
  adjustRest: (deltaSec: number) => void
  skipRest: () => void
  finish: () => Promise<Workout | null>
  discard: () => void
}

const Session = createContext<SessionCtx | null>(null)
const ACTIVE_KEY = 'ironlog.active.v1'

function loadActive(): Workout | null {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null')
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { workouts, exercises, profile, saveWorkout } = useData()
  const [active, setActive] = useState<Workout | null>(loadActive)
  const [rest, setRest] = useState<Rest | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* noop */
    }
  }, [active])

  // Rest-Timer automatisch beenden
  useEffect(() => {
    if (!rest) return
    const t = setTimeout(() => {
      setRest(null)
      try {
        navigator.vibrate?.([120, 80, 120])
      } catch {
        /* noop */
      }
    }, Math.max(0, rest.endsAt - Date.now()))
    return () => clearTimeout(t)
  }, [rest])

  const mutate = useCallback((fn: (w: Workout) => Workout) => setActive((w) => (w ? fn(w) : w)), [])
  const mapWe = (weId: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
    mutate((w) => ({ ...w, exercises: w.exercises.map((we) => (we.id === weId ? fn(we) : we)) }))

  const makeSets = (exId: string, count: number, reps: number): WorkoutSet[] => {
    const prev = previousSets(workouts, exId)
    const ex = exercises.find((e) => e.id === exId)
    const sug = suggestNext(prev, reps, { bodyweight: ex?.bodyweight, equipment: ex?.equipment, muscle: ex?.muscle_group })
    return Array.from({ length: count }, (_, i) => {
      if (sug) return { id: uid(), set_number: i + 1, weight: sug.weight, reps: sug.reps, done: false }
      const p = prev[i] ?? prev[prev.length - 1]
      return { id: uid(), set_number: i + 1, weight: p?.weight ?? 0, reps: p?.reps ?? reps, done: false }
    })
  }

  const best = useMemo(() => bestByExercise(workouts, active?.id), [workouts, active?.id])

  // PRs im laufenden Training: jeder abgehakte Satz, der den bisherigen Bestwert übertrifft
  const prSetIds = useMemo(() => {
    const ids = new Set<string>()
    if (!active) return ids
    for (const we of active.exercises) {
      const prev = best.get(we.exercise_id)
      if (!prev) continue
      let run = prev.e1rm
      for (const s of we.sets) {
        if (!s.done) continue
        const sc = setScore(s)
        if (sc > run + 1e-9) {
          ids.add(s.id)
          run = sc
        }
      }
    }
    return ids
  }, [active, best])

  const value: SessionCtx = {
    active,
    rest,
    prSetIds,
    start(tpl) {
      const w: Workout = {
        id: uid(),
        name: tpl?.name ?? 'Freies Training',
        template_id: tpl?.id ?? null,
        started_at: new Date().toISOString(),
        ended_at: null,
        notes: '',
        exercises: (tpl?.items ?? []).map((it, i) => ({
          id: uid(), exercise_id: it.exercise_id, position: i, target_reps: it.target_reps, sets: makeSets(it.exercise_id, it.target_sets, it.target_reps),
        })),
      }
      setActive(w)
      return w
    },
    rename: (name) => mutate((w) => ({ ...w, name })),
    addExercise: (exId) =>
      mutate((w) => ({
        ...w,
        exercises: [...w.exercises, { id: uid(), exercise_id: exId, position: w.exercises.length, target_reps: 10, sets: makeSets(exId, 3, 10) }],
      })),
    removeExercise: (weId) => mutate((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== weId) })),
    addSet: (weId) =>
      mapWe(weId, (we) => {
        const last = we.sets[we.sets.length - 1]
        return {
          ...we,
          sets: [...we.sets, { id: uid(), set_number: we.sets.length + 1, weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false }],
        }
      }),
    removeSet: (weId, setId) =>
      mapWe(weId, (we) => ({ ...we, sets: we.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, set_number: i + 1 })) })),
    updateSet: (weId, setId, patch) =>
      mapWe(weId, (we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
    toggleSet(weId, setId) {
      const w = activeRef.current
      const we = w?.exercises.find((e) => e.id === weId)
      const s = we?.sets.find((x) => x.id === setId)
      if (!w || !we || !s) return { pr: false, done: false }
      const done = !s.done
      let pr = false
      if (done) {
        const prev = best.get(we.exercise_id)
        const runBest = Math.max(prev?.e1rm ?? 0, ...we.sets.filter((x) => x.done && x.id !== setId).map(setScore))
        pr = !!prev && setScore(s) > runBest
        const total = profile?.default_rest_seconds ?? 90
        setRest({ endsAt: Date.now() + total * 1000, total })
      }
      mapWe(weId, (x) => ({ ...x, sets: x.sets.map((y) => (y.id === setId ? { ...y, done } : y)) }))
      return { pr, done }
    },
    adjustRest: (d) =>
      setRest((r) => {
        if (!r) return r
        const endsAt = Math.max(Date.now() + 1000, r.endsAt + d * 1000)
        return { endsAt, total: Math.max(r.total + d, 1) }
      }),
    skipRest: () => setRest(null),
    async finish() {
      const w = activeRef.current
      if (!w) return null
      const cleaned: Workout = {
        ...w,
        ended_at: new Date().toISOString(),
        exercises: w.exercises
          .map((we, i) => ({ ...we, position: i, sets: we.sets.filter((s) => s.done).map((s, j) => ({ ...s, set_number: j + 1 })) }))
          .filter((we) => we.sets.length),
      }
      await saveWorkout(cleaned)
      setActive(null)
      setRest(null)
      return cleaned
    },
    discard() {
      setActive(null)
      setRest(null)
    },
  }
  return <Session.Provider value={value}>{children}</Session.Provider>
}

export function useSession() {
  const c = useContext(Session)
  if (!c) throw new Error('SessionProvider fehlt')
  return c
}
