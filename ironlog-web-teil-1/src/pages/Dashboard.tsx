import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Area, AreaChart, Tooltip, XAxis } from 'recharts'
import { Apple, ArrowRight, CalendarCheck, ChevronRight, Flame, Play, Quote, Settings as SettingsIcon, Trophy, Users as UsersIcon, Weight } from 'lucide-react'
import { useData, useSession } from '@/state/store'
import { Page, Rise, Stagger } from '@/components/motion'
import { Container, SectionTitle, StatTile } from '@/components/bits'
import { CountUp } from '@/components/CountUp'
import { Img } from '@/components/Img'
import { AutoSize, Safe } from '@/components/Safe'
import { Skeleton } from '@/components/ui/skeleton'
import { HERO, quoteOfDay } from '@/lib/images'
import { fmtDate, fmtVolume, greeting, nf, startOfWeek } from '@/lib/utils'
import { prEvents, weeklyVolume, weekStreak, workoutVolume } from '@/data/stats'
import type { Template } from '@/data/types'
import { BuddyStrip } from '@/components/BuddyStrip'
import { AvatarCard } from '@/components/Avatar'
import { DEFAULT_GOALS, dayString, nutritionStore, sumEntries } from '@/data/nutrition'

export default function Dashboard() {
  const { profile, workouts, templates, exMap, loading } = useData()
  const { active, start } = useSession()
  const nav = useNavigate()

  const stats = useMemo(() => {
    const wk = startOfWeek(new Date()).getTime()
    const thisWeek = workouts.filter((w) => w.ended_at && +new Date(w.started_at) >= wk)
    const prs = prEvents(workouts)
    return {
      count: thisWeek.length,
      volume: thisWeek.reduce((a, w) => a + workoutVolume(w), 0),
      streak: weekStreak(workouts),
      lastPr: prs[prs.length - 1],
      weekly: weeklyVolume(workouts, 8).map((b) => ({ ...b, t: Math.round(b.volume / 100) / 10 })),
    }
  }, [workouts])

  const vol = fmtVolume(stats.volume)
  const first = profile?.display_name?.split(' ')[0] ?? ''

  const go = (tpl?: Template) => {
    if (!active && tpl) start(tpl)
    nav('/training')
  }

  return (
    <Page>
      {/* HERO */}
      <header className="relative h-[380px] overflow-hidden md:h-[420px] md:rounded-b-[40px]">
        <Img src={HERO.dashboard} alt="" priority shade="hero" className="absolute inset-0" imgClassName="animate-kenburns" />
        <div className="pt-safe absolute right-4 top-4 z-10 flex gap-2 md:hidden">
          <Link to="/buddys" aria-label="Buddys" className="glass grid h-11 w-11 place-items-center rounded-2xl text-white/80 transition hover:text-lime">
            <UsersIcon size={19} />
          </Link>
          <Link to="/einstellungen" aria-label="Einstellungen" className="glass grid h-11 w-11 place-items-center rounded-2xl text-white/80 transition hover:text-lime">
            <SettingsIcon size={19} />
          </Link>
        </div>
        <Container className="pt-safe relative flex h-full flex-col justify-end pb-8">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="label mb-2 !text-lime">
            {new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="h-display text-[54px] md:text-[88px]">
            {greeting()},<br />
            <span className="text-lime drop-shadow-[0_0_30px_rgba(198,255,0,.4)]">{first || 'Athlet'}</span>
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6">
            <button
              onClick={() => go()}
              className="group relative flex h-[68px] w-full items-center justify-between overflow-hidden rounded-[24px] bg-lime pl-7 pr-2 text-ink animate-pulseglow transition active:scale-[0.98] md:w-[420px]"
            >
              <span className="whitespace-nowrap font-display text-[30px] tracking-wide">{active ? 'TRAINING FORTSETZEN' : 'TRAINING STARTEN'}</span>
              <span className="grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-ink text-lime transition group-hover:scale-110">
                <Play size={22} fill="currentColor" />
              </span>
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/40 blur-md transition-all duration-700 group-hover:left-[120%]" />
            </button>
          </motion.div>
        </Container>
      </header>

      <Container className="mt-7 space-y-10">
        {/* STATS */}
        {loading && !workouts.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px]" />)}
          </div>
        ) : (
          <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Rise><StatTile icon={CalendarCheck} label="Trainings" sub="diese Woche"><CountUp value={stats.count} /></StatTile></Rise>
            <Rise>
              <StatTile icon={Weight} label="Volumen" sub="diese Woche">
                <CountUp value={vol.unit === 't' ? stats.volume / 1000 : stats.volume} decimals={vol.unit === 't' ? 1 : 0} />
                <span className="ml-1 text-lg text-white/40">{vol.unit}</span>
              </StatTile>
            </Rise>
            <Rise>
              <StatTile icon={Flame} label="Streak" accent="blaze" sub={stats.streak === 1 ? 'Woche am Stück' : 'Wochen am Stück'}>
                <span className="inline-flex items-center gap-2">
                  <CountUp value={stats.streak} />
                  {stats.streak > 0 && <Flame className="animate-flicker text-blaze drop-shadow-[0_0_12px_rgba(255,95,31,.8)]" size={28} fill="currentColor" />}
                </span>
              </StatTile>
            </Rise>
            <Rise>
              <StatTile icon={Trophy} label="Letzter PR" sub={stats.lastPr ? `${exMap.get(stats.lastPr.exercise_id)?.name ?? ''} · ${fmtDate(stats.lastPr.date, { day: '2-digit', month: 'short' })}` : 'Noch keiner – bald!'}>
                {stats.lastPr ? (
                  <>
                    {stats.lastPr.weight > 0 ? nf(stats.lastPr.weight, 1) : stats.lastPr.reps}
                    <span className="ml-1 text-lg text-white/40">{stats.lastPr.weight > 0 ? `kg × ${stats.lastPr.reps}` : 'Wdh.'}</span>
                  </>
                ) : (
                  '–'
                )}
              </StatTile>
            </Rise>
          </Stagger>
        )}

        <NutritionToday />

        <AvatarCard />

        <BuddyStrip />

        {/* CHART + QUOTE */}
        <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card p-5">
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Volumen · 8 Wochen</span>
              <Link to="/fortschritt" className="flex items-center gap-1 text-xs font-semibold text-lime">Mehr <ChevronRight size={14} /></Link>
            </div>
            <div className="num text-3xl">
              {nf(stats.weekly.reduce((a, b) => a + b.t, 0), 1)} <span className="text-base text-white/40">t gesamt</span>
            </div>
            <div className="-mx-2 mt-2 h-[140px]">
              <Safe><AutoSize>{({ width, height }) => (
                <AreaChart width={width} height={height} data={stats.weekly} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C6FF00" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#C6FF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} interval={1} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="t" stroke="#C6FF00" strokeWidth={2.5} fill="url(#dashg)" style={{ filter: 'drop-shadow(0 0 6px rgba(198,255,0,.6))' }} animationDuration={1200} />
                </AreaChart>
              )}</AutoSize></Safe>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-6">
            <Img src={HERO.recap} alt="" shade="full" className="absolute inset-0" />
            <div className="relative flex h-full flex-col justify-end">
              <Quote className="mb-3 text-lime" size={28} />
              <p className="h-display text-[32px] leading-[0.95]">{quoteOfDay()}</p>
              <span className="label mt-3">Spruch des Tages</span>
            </div>
          </motion.div>
        </div>

        {/* TEMPLATES */}
        <section>
          <SectionTitle action={<Link to="/plaene" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-lime">Alle Pläne <ArrowRight size={14} /></Link>}>
            Deine Pläne
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:-mx-0 md:grid md:grid-cols-3 md:px-0">
            {templates.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go(t)}
                className="group relative h-[230px] w-[78%] shrink-0 snap-start overflow-hidden rounded-[24px] border border-white/[0.06] text-left md:w-auto"
              >
                <Img src={t.cover_url} alt={t.name} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="label mb-1">{t.items.length} Übungen · {t.items.reduce((a, b) => a + b.target_sets, 0)} Sätze</div>
                  <h3 className="h-display text-[40px]">{t.name}</h3>
                  <p className="line-clamp-1 text-xs text-white/55">{t.items.map((it) => exMap.get(it.exercise_id)?.name).filter(Boolean).join(' · ')}</p>
                </div>
                <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-lime text-ink opacity-90 shadow-glow-sm transition group-hover:scale-110 group-hover:shadow-glow">
                  <Play size={18} fill="currentColor" />
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      </Container>
    </Page>
  )
}

export function ChartTip({ active, payload, unit = 't' }: { active?: boolean; payload?: { value: number; payload: { label?: string } }[]; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <div className="text-white/50">{payload[0].payload.label}</div>
      <div className="num text-base text-lime">{nf(payload[0].value, 1)} {unit}</div>
    </div>
  )
}

/** Kleine Ernährungs-Kachel: heute gegessen vs. Ziel */
function NutritionToday() {
  const [data, setData] = useState<{ kcal: number; p: number; goalK: number; goalP: number; has: boolean } | null>(null)
  useEffect(() => {
    const d = dayString()
    Promise.all([nutritionStore.getGoals(), nutritionStore.listEntries(d, d)])
      .then(([g, e]) => {
        const s = sumEntries(e)
        const goal = g ?? DEFAULT_GOALS
        setData({ kcal: s.kcal, p: s.p, goalK: goal.kcal, goalP: goal.p, has: e.length > 0 })
      })
      .catch(() => setData(null))
  }, [])
  const pct = data ? Math.min(100, (data.kcal / Math.max(1, data.goalK)) * 100) : 0
  return (
    <Link to="/ernaehrung" className="card group flex items-center gap-4 p-4 transition hover:border-lime/30">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/10 text-lime"><Apple size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="label block">Ernährung heute</span>
        {data?.has ? (
          <>
            <span className="num block text-xl">{nf(data.kcal)} <span className="text-sm text-white/40">/ {nf(data.goalK)} kcal · {nf(data.p)} g Eiweiß</span></span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-lime" style={{ width: `${pct}%` }} /></span>
          </>
        ) : (
          <span className="block text-sm text-white/60">Noch nichts eingetragen – Barcode scannen oder suchen.</span>
        )}
      </span>
      <ChevronRight size={18} className="text-white/40 transition group-hover:text-lime" />
    </Link>
  )
}
