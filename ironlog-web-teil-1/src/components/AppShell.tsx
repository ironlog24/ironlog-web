import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, BarChart3, CalendarDays, Dumbbell, Home, LayoutList, LogOut, Play, Settings as SettingsIcon, Users, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useData, useSession } from '@/state/store'
import { api } from '@/data/api'
import { cn, fmtDuration } from '@/lib/utils'
import { Logo } from './bits'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/training', label: 'Training', icon: Zap },
  { to: '/ernaehrung', label: 'Essen', icon: Apple },
  { to: '/verlauf', label: 'Verlauf', icon: CalendarDays },
  { to: '/fortschritt', label: 'Fortschritt', icon: BarChart3 },
  { to: '/uebungen', label: 'Übungen', icon: Dumbbell },
]

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation()
  const { active } = useSession()
  const hideMini = loc.pathname.startsWith('/training') || loc.pathname.startsWith('/recap')
  return (
    <div className="ambient min-h-dvh md:flex">
      <Sidebar />
      <div className="relative min-w-0 flex-1">
        <LoadErrorBanner />
        <PendingSync />
        {children}
        <AnimatePresence>{active && !hideMini && <MiniBar key="mini" />}</AnimatePresence>
      </div>
      {!loc.pathname.startsWith('/recap') && <BottomNav />}
    </div>
  )
}

const isActive = (path: string, to: string) => (to === '/' ? path === '/' : path.startsWith(to))

function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="glass pb-safe fixed inset-x-3 bottom-3 z-40 rounded-[26px] md:hidden">
      <ul className="grid grid-cols-6">
        {NAV.map(({ to, label, icon: Icon }) => {
          const on = isActive(pathname, to)
          return (
            <li key={to}>
              <NavLink to={to} className="relative flex h-16 flex-col items-center justify-center gap-1">
                {on && (
                  <motion.span
                    layoutId="nav-ind"
                    className="absolute inset-1.5 rounded-[20px] bg-lime/10 shadow-[inset_0_0_0_1px_rgba(198,255,0,.25)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={21} strokeWidth={on ? 2.4 : 1.8} className={cn('relative transition', on ? 'text-lime drop-shadow-[0_0_8px_rgba(198,255,0,.7)]' : 'text-white/50')} />
                <span className={cn('relative text-[9.5px] font-semibold tracking-tight', on ? 'text-lime' : 'text-white/45')}>{label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Sidebar() {
  const { pathname } = useLocation()
  const { profile } = useData()
  const items = [...NAV.slice(0, 2), { to: '/plaene', label: 'Pläne', icon: LayoutList }, ...NAV.slice(2).map((n) => (n.to === '/ernaehrung' ? { ...n, label: 'Ernährung' } : n)), { to: '/buddys', label: 'Buddys', icon: Users }]
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-ink/80 px-5 py-7 backdrop-blur-xl md:flex">
      <Logo className="mb-10 px-3 text-4xl" />
      <ul className="space-y-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const on = isActive(pathname, to)
          return (
            <li key={to}>
              <NavLink to={to} className={cn('relative flex h-12 items-center gap-3.5 rounded-2xl px-4 text-sm font-semibold transition', on ? 'text-lime' : 'text-white/55 hover:bg-white/[0.04] hover:text-white')}>
                {on && <motion.span layoutId="side-ind" className="absolute inset-0 rounded-2xl bg-lime/10 shadow-[inset_0_0_0_1px_rgba(198,255,0,.22)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                {on && <motion.span layoutId="side-bar" className="absolute -left-5 top-2 h-8 w-1 rounded-r-full bg-lime shadow-glow-sm" />}
                <Icon size={19} className="relative" strokeWidth={on ? 2.3 : 1.8} />
                <span className="relative">{label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
      <NavLink to="/einstellungen" className={cn('mt-auto mb-3 flex h-12 items-center gap-3.5 rounded-2xl px-4 text-sm font-semibold transition', isActive(pathname, '/einstellungen') ? 'bg-lime/10 text-lime' : 'text-white/55 hover:bg-white/[0.04] hover:text-white')}>
        <SettingsIcon size={19} strokeWidth={1.8} /> Einstellungen
      </NavLink>
      <div className="rounded-2xl border border-white/[0.06] bg-ink-800 p-4">
        <div className="label mb-1">Eingeloggt als</div>
        <div className="truncate font-semibold">{profile?.display_name ?? '…'}</div>
        {api.mode === 'demo' && <div className="mt-1 text-xs text-lime/80">Demo-Modus · lokal gespeichert</div>}
        <button onClick={() => api.signOut()} className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/50 transition hover:text-blaze">
          <LogOut size={14} /> Abmelden
        </button>
      </div>
    </aside>
  )
}

function MiniBar() {
  const { active } = useSession()
  const nav = useNavigate()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!active) return null
  return (
    <motion.button
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      onClick={() => nav('/training')}
      className="glass fixed inset-x-3 bottom-[92px] z-40 flex items-center gap-3 rounded-2xl p-2.5 pr-4 text-left shadow-glow-sm md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink">
        <Play size={18} fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{active.name}</span>
        <span className="label !text-lime/80">Training läuft</span>
      </span>
      <span className="num text-lg text-lime">{fmtDuration(now - +new Date(active.started_at))}</span>
    </motion.button>
  )
}

function LoadErrorBanner() {
  const { loadError, reload, loading } = useData()
  if (!loadError) return null
  if (loadError === 'offline')
    return (
      <div className="pt-safe sticky top-0 z-40 border-b border-white/10 bg-ink/95 px-4 py-2.5 text-xs text-white/70 backdrop-blur">
        <b className="text-lime">Offline</b> · Du siehst deine zuletzt geladenen Daten. Neue Trainings werden gespeichert und hochgeladen, sobald du wieder Netz hast.
        <button onClick={() => reload()} disabled={loading} className="ml-2 font-bold text-white underline-offset-2 hover:underline">{loading ? 'Lädt …' : 'Erneut versuchen'}</button>
      </div>
    )
  const perm = /permission denied|42501/i.test(loadError)
  return (
    <div className="pt-safe sticky top-0 z-40 border-b border-blaze/30 bg-ink/95 px-4 py-3 text-sm backdrop-blur">
      <p className="font-semibold text-blaze">Daten konnten nicht geladen werden</p>
      <p className="mt-0.5 text-white/60">
        {perm ? 'Der Datenbank fehlen Zugriffsrechte. Bitte die Reparatur-SQL in Supabase ausführen.' : loadError}
      </p>
      <button onClick={() => reload()} disabled={loading} className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
        {loading ? 'Lädt …' : 'Erneut laden'}
      </button>
    </div>
  )
}

function PendingSync() {
  const { pendingCount, syncNow } = useData()
  const [busy, setBusy] = useState(false)
  if (!pendingCount) return null
  return (
    <button
      onClick={async () => {
        setBusy(true)
        await syncNow().finally(() => setBusy(false))
      }}
      className="glass fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white/80 shadow-glow-sm"
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-blaze align-middle" />
      {busy ? 'Synchronisiere …' : `${pendingCount} Training${pendingCount > 1 ? 's' : ''} offline gespeichert · Jetzt hochladen`}
    </button>
  )
}
