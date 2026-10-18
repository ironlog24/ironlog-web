import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from './store'
import {
  clearPendingInvite, pendingInvite, socialSetupMissing, socialStore, summaryKey, toSummaries,
  type Buddy, type Reaction, type ShareLevel, type Summary,
} from '@/data/social'
import { workoutVolume } from '@/data/stats'

interface SocialCtx {
  ready: boolean
  code: string
  shareLevel: ShareLevel
  buddies: Buddy[]
  summaries: Summary[]
  reactions: Reaction[]
  /** eigene Trainings im Format für Challenges */
  mine: { started_at: string; volume: number | null }[]
  setupMissing: boolean
  error: string
  refresh: () => Promise<void>
  accept: (code: string) => Promise<string>
  remove: (id: string) => Promise<void>
  setShareLevel: (l: ShareLevel) => Promise<void>
  react: (workoutId: string, toUser: string, on: boolean) => Promise<void>
  toast: (text: string) => void
}

const Ctx = createContext<SocialCtx | null>(null)
const YEAR_MS = 371 * 86400000
const msg = (e: unknown) => (e as { message?: string })?.message ?? String(e)

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, workouts, exMap } = useData()
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState('')
  const [shareLevel, setLevel] = useState<ShareLevel>('stats')
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [setupMissing, setSetupMissing] = useState(false)
  const [error, setError] = useState('')
  const [toastText, setToastText] = useState('')
  const toastT = useRef<ReturnType<typeof setTimeout>>()

  const toast = useCallback((t: string) => {
    setToastText(t)
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastText(''), 3800)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [me, bs] = await Promise.all([socialStore.me(), socialStore.buddies()])
      setCode(me.code)
      setLevel(me.shareLevel)
      setBuddies(bs)
      const since = new Date(Date.now() - YEAR_MS).toISOString()
      const [sum, rx] = await Promise.all([
        socialStore.summaries(bs.map((b) => b.id), since),
        socialStore.reactions(new Date(Date.now() - 60 * 86400000).toISOString()),
      ])
      setSummaries(sum)
      setReactions(rx)
      setSetupMissing(false)
      setError('')
    } catch (e) {
      if (socialSetupMissing(e)) setSetupMissing(true)
      else setError(msg(e))
      console.warn('[IRONLOG] Buddys laden', e)
    } finally {
      setReady(true)
    }
  }, [])

  const accept = useCallback(
    async (c: string) => {
      const r = await socialStore.acceptInvite(c)
      await refresh()
      toast(`🤝 Du bist jetzt mit ${r.name} verbunden`)
      return r.name
    },
    [refresh, toast],
  )

  // Start: laden + ggf. Einladung aus dem Link annehmen
  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      await refresh()
      const inv = pendingInvite()
      if (inv && alive) {
        clearPendingInvite()
        try {
          await accept(inv)
        } catch (e) {
          toast(msg(e))
        }
      }
    })()
    const t = setInterval(refresh, 120_000)
    const vis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', vis)
    return () => {
      alive = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [user, refresh, accept, toast])

  // Eigene Trainings als Zusammenfassung veröffentlichen (nur Geändertes)
  const pubKey = user ? `ironlog.social.pub.${user.id}.${shareLevel}` : ''
  useEffect(() => {
    if (!user || !ready || setupMissing) return
    const t = setTimeout(async () => {
      try {
        const rows = toSummaries(workouts, (id) => exMap.get(id)?.name ?? 'Übung', shareLevel, Date.now() - YEAR_MS)
        let prev: Record<string, string> = {}
        try {
          prev = JSON.parse(localStorage.getItem(pubKey) || '{}')
        } catch {
          /* noop */
        }
        const changed = rows.filter((r) => prev[r.id] !== summaryKey(r))
        const gone = Object.keys(prev).filter((id) => !rows.some((r) => r.id === id))
        if (!changed.length && !gone.length) return
        await socialStore.publish(changed)
        await socialStore.unpublish(gone)
        localStorage.setItem(pubKey, JSON.stringify(Object.fromEntries(rows.map((r) => [r.id, summaryKey(r)]))))
      } catch (e) {
        console.warn('[IRONLOG] Zusammenfassungen veröffentlichen', e) // offline o. Ä. → nächster Versuch beim nächsten Laden
      }
    }, 800)
    return () => clearTimeout(t)
  }, [user, ready, setupMissing, workouts, exMap, shareLevel, pubKey])

  const mine = useMemo(() => workouts.filter((w) => w.ended_at).map((w) => ({ started_at: w.started_at, volume: workoutVolume(w) })), [workouts])

  const value = useMemo<SocialCtx>(
    () => ({
      ready, code, shareLevel, buddies, summaries, reactions, mine, setupMissing, error, refresh, accept, toast,
      async remove(id) {
        await socialStore.removeBuddy(id)
        setBuddies((b) => b.filter((x) => x.id !== id))
        setSummaries((s) => s.filter((x) => x.user_id !== id))
      },
      async setShareLevel(l) {
        setLevel(l)
        await socialStore.setShareLevel(l)
      },
      async react(workoutId, toUser, on) {
        const me = user?.id ?? ''
        setReactions((r) => (on ? [...r, { workout_id: workoutId, from_user: me, to_user: toUser, created_at: new Date().toISOString() }] : r.filter((x) => !(x.workout_id === workoutId && x.from_user === me))))
        try {
          await socialStore.react(workoutId, toUser, on)
        } catch (e) {
          toast('Respekt konnte nicht gesendet werden')
          console.warn(e)
          refresh()
        }
      },
    }),
    [ready, code, shareLevel, buddies, summaries, reactions, mine, setupMissing, error, refresh, accept, toast, user],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {toastText && (
          <motion.div
            key="toast"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="glass fixed left-1/2 top-4 z-[70] max-w-[92vw] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-glow-sm"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
            role="status"
          >
            {toastText}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

export function useSocial() {
  const c = useContext(Ctx)
  if (!c) throw new Error('SocialProvider fehlt')
  return c
}
