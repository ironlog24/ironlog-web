import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, XAxis, YAxis } from 'recharts'
import { Medal, TrendingUp } from 'lucide-react'
import { useData } from '@/state/store'
import { Page } from '@/components/motion'
import { Container, EmptyState, PageHero, Seg, SectionTitle } from '@/components/bits'
import { Img } from '@/components/Img'
import { AutoSize, Safe } from '@/components/Safe'
import { ChartTip } from './Dashboard'
import { BodyWeightCard } from '@/components/BodyWeightCard'
import { HERO } from '@/lib/images'
import { fmtDate, nf } from '@/lib/utils'
import { bestByExercise, muscleDistribution, prEvents, weeklyVolume } from '@/data/stats'
import { MUSCLES, MUSCLE_LABEL } from '@/data/types'

export default function Progress() {
  const { workouts, exercises, exMap } = useData()
  const [span, setSpan] = useState<'30' | '90'>('30')
  const [weeksN, setWeeksN] = useState<'8' | '12' | '26'>('12')

  const weekly = useMemo(() => weeklyVolume(workouts, +weeksN).map((w) => ({ ...w, t: Math.round(w.volume / 100) / 10 })), [workouts, weeksN])
  const radar = useMemo(() => {
    const d = muscleDistribution(workouts, exercises, +span)
    return MUSCLES.map((m) => ({ m: MUSCLE_LABEL[m], v: d[m] }))
  }, [workouts, exercises, span])
  const best = useMemo(() => [...bestByExercise(workouts).values()].sort((a, b) => +new Date(b.date) - +new Date(a.date)), [workouts])
  const prCount = useMemo(() => prEvents(workouts).length, [workouts])
  const avg = weekly.reduce((a, b) => a + b.t, 0) / Math.max(1, weekly.filter((w) => w.t > 0).length)
  const last = weekly[weekly.length - 1]?.t ?? 0
  const prev = weekly[weekly.length - 2]?.t ?? 0
  const delta = prev ? ((last - prev) / prev) * 100 : 0

  if (!workouts.length)
    return (
      <Page>
        <PageHero image={HERO.progress} kicker="Fortschritt" title="Fortschritt" />
        <Container className="mt-6 space-y-6"><EmptyState title="Noch keine Trainingsdaten" text="Fortschritt beginnt mit dem ersten Satz." /><BodyWeightCard /></Container>
      </Page>
    )

  return (
    <Page>
      <PageHero image={HERO.progress} kicker={`${prCount} PRs insgesamt`} title={<>Fort&shy;schritt</>} />
      <Container className="mt-6 space-y-10">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Wochenvolumen */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="label">Wochenvolumen</div>
                <div className="num mt-1 text-3xl">{nf(avg, 1)} <span className="text-base text-white/40">t Ø / Woche</span></div>
                {prev > 0 && (
                  <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${delta >= 0 ? 'text-lime' : 'text-white/45'}`}>
                    <TrendingUp size={13} className={delta < 0 ? 'rotate-180' : ''} />
                    Vorwoche {nf(prev, 1)} t · diese Woche bisher {nf(last, 1)} t
                  </div>
                )}
              </div>
              <Seg value={weeksN} onChange={setWeeksN} options={[{ v: '8', l: '8W' }, { v: '12', l: '12W' }, { v: '26', l: '6M' }]} />
            </div>
            <div className="-mx-2 h-[240px]">
              <Safe><AutoSize>{({ width, height }) => (
                <BarChart width={width} height={height} data={weekly} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C6FF00" />
                      <stop offset="100%" stopColor="#C6FF00" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} interval={weekly.length > 12 ? 3 : 1} />
                  <YAxis axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}t`} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="t" radius={[8, 8, 3, 3]} animationDuration={900}>
                    {weekly.map((_, i) => (
                      <Cell key={i} fill={i === weekly.length - 1 ? '#C6FF00' : 'url(#barg)'} style={i === weekly.length - 1 ? { filter: 'drop-shadow(0 0 8px rgba(198,255,0,.7))' } : undefined} />
                    ))}
                  </Bar>
                </BarChart>
              )}</AutoSize></Safe>
            </div>
          </motion.section>

          {/* Radar */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-5">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <div className="label">Muskelverteilung</div>
                <div className="mt-1 text-xs text-white/40">Sätze pro Muskelgruppe</div>
              </div>
              <Seg value={span} onChange={setSpan} options={[{ v: '30', l: '30T' }, { v: '90', l: '90T' }]} />
            </div>
            <div className="h-[260px]">
              <Safe><AutoSize>{({ width, height }) => (
                <RadarChart width={width} height={height} data={radar} outerRadius="66%" margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="rgba(255,255,255,.1)" />
                  <PolarAngleAxis dataKey="m" tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="glass rounded-xl px-3 py-2 text-xs"><div className="text-white/50">{payload[0].payload.m}</div><div className="num text-base text-lime">{payload[0].value} Sätze</div></div> : null} />
                  <Radar dataKey="v" stroke="#C6FF00" strokeWidth={2.5} fill="#C6FF00" fillOpacity={0.25} style={{ filter: 'drop-shadow(0 0 10px rgba(198,255,0,.5))' }} animationDuration={900} />
                </RadarChart>
              )}</AutoSize></Safe>
            </div>
          </motion.section>
        </div>

        <BodyWeightCard />

        {/* PR WALL */}
        <section>
          <SectionTitle action={<span className="chip"><Medal size={13} className="text-lime" />{best.length}</span>}>PR-Wall</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {best.map((p, i) => {
              const ex = exMap.get(p.exercise_id)
              const gold = i < 3
              return (
                <motion.div
                  key={p.exercise_id}
                  initial={{ opacity: 0, y: 20, rotateY: -20 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 8) * 0.05, type: 'spring', stiffness: 160, damping: 18 }}
                  whileHover={{ y: -6, rotate: -1 }}
                >
                  <Link to={`/uebungen/${p.exercise_id}`} className={`group relative block overflow-hidden rounded-[24px] border p-4 pt-5 ${gold ? 'border-lime/40 shadow-glow-sm' : 'border-white/[0.07]'}`}>
                    <Img src={ex?.image_url} alt="" shade="full" className="absolute inset-0 opacity-50" />
                    <div className="relative flex flex-col items-center text-center">
                      <div className={`relative grid h-[74px] w-[74px] place-items-center rounded-full ${gold ? 'bg-[conic-gradient(from_200deg,#C6FF00,#F4FFB8,#8FBF00,#C6FF00)]' : 'bg-[conic-gradient(from_200deg,#5a5a5a,#d9d9d9,#3a3a3a,#5a5a5a)]'} p-[3px]`}>
                        <div className="grid h-full w-full place-items-center rounded-full bg-ink">
                          <div className="num text-xl leading-none">{p.weight > 0 ? nf(p.weight, 1) : p.reps}</div>
                        </div>
                        <span className={`absolute -bottom-1 rounded-full px-2 text-[9px] font-black uppercase ${gold ? 'bg-lime text-ink' : 'bg-white/80 text-ink'}`}>{p.weight > 0 ? 'kg' : 'Wdh.'}</span>
                      </div>
                      <div className="mt-3 line-clamp-2 min-h-[2.1em] font-display text-[21px] leading-[1]">{ex?.name ?? '—'}</div>
                      <div className="mt-1 text-[11px] text-white/50">{p.weight > 0 ? `× ${p.reps} · 1RM ≈ ${nf(p.e1rm, 1)} kg` : 'Wiederholungen'}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">{fmtDate(p.date)}</div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>
      </Container>
    </Page>
  )
}
