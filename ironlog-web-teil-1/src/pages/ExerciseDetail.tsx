import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Award, BarChart2, Gauge, Plus, Repeat } from 'lucide-react'
import { useData, useSession } from '@/state/store'
import { Page, Rise, Stagger } from '@/components/motion'
import { Container, Seg, SectionTitle, StatTile } from '@/components/bits'
import { CountUp } from '@/components/CountUp'
import { Img } from '@/components/Img'
import { AutoSize, Safe } from '@/components/Safe'
import { Button } from '@/components/ui/button'
import { exerciseStats } from '@/data/stats'
import { MUSCLE_LABEL } from '@/data/types'
import { fmtDate, nf } from '@/lib/utils'

type Range = '1M' | '3M' | '6M' | '1J' | 'ALL'
const DAYS: Record<Range, number> = { '1M': 30, '3M': 91, '6M': 182, '1J': 365, ALL: 1e5 }

export default function ExerciseDetail() {
  const { id } = useParams()
  const loc = useLocation()
  const { exMap, workouts } = useData()
  const { active, addExercise, start } = useSession()
  const nav = useNavigate()
  const ex = exMap.get(id!)
  const [range, setRange] = useState<Range>('3M')
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 400], [0, 140])
  const scale = useTransform(scrollY, [0, 400], [1, 1.15])
  const titleY = useTransform(scrollY, [0, 300], [0, -40])
  const opacity = useTransform(scrollY, [0, 260], [1, 0.2])

  const st = useMemo(() => exerciseStats(workouts, id!), [workouts, id])
  const series = useMemo(() => {
    const since = Date.now() - DAYS[range] * 86400000
    return st.series.filter((p) => +new Date(p.date) >= since).map((p) => ({ ...p, label: fmtDate(p.date, { day: '2-digit', month: '2-digit' }) }))
  }, [st, range])

  if (!ex) return <Page><Container className="py-20 text-center text-white/50">Übung nicht gefunden.</Container></Page>
  const bw = !!ex.bodyweight && st.bestWeight === 0
  const unit = bw ? 'Wdh.' : 'kg'

  function addToWorkout() {
    if (!active) start(null)
    addExercise(ex!.id)
    nav('/training')
  }

  return (
    <Page>
      <header className="relative h-[52vh] min-h-[360px] overflow-hidden md:h-[440px] md:rounded-b-[40px]">
        <motion.div style={{ y, scale }} className="absolute inset-0">
          <Img src={ex.image_url} alt={ex.name} priority shade="none" className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0A0A0A_0%,rgba(10,10,10,.6)_40%,transparent_75%,rgba(10,10,10,.5)_100%)]" />
        <Link to="/uebungen" onClick={(e) => { if (loc.key !== 'default') { e.preventDefault(); nav(-1) } }} className="glass pt-safe absolute left-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-2xl" aria-label="Zurück">
          <ArrowLeft size={18} />
        </Link>
        <motion.div style={{ y: titleY, opacity }} className="absolute inset-x-0 bottom-0">
          <Container className="pb-7">
            <div className="mb-2 flex gap-2">
              <span className="chip !border-lime/30 !bg-lime/10 !text-lime">{MUSCLE_LABEL[ex.muscle_group]}</span>
              <span className="chip">{ex.equipment}</span>
            </div>
            <h1 className="h-display text-[56px] md:text-[88px]">{ex.name}</h1>
          </Container>
        </motion.div>
      </header>

      <Container className="mt-6 space-y-8">
        <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Rise><StatTile icon={Award} label={bw ? 'Beste Wdh.' : 'Bestes Gewicht'}>{bw ? <CountUp value={st.best1rm} /> : <CountUp value={st.bestWeight} decimals={1} />}<span className="ml-1 text-lg text-white/40">{unit}</span></StatTile></Rise>
          <Rise><StatTile icon={Gauge} label="Geschätztes 1RM" sub="Epley-Formel">{bw ? '–' : <><CountUp value={st.best1rm} decimals={1} /><span className="ml-1 text-lg text-white/40">kg</span></>}</StatTile></Rise>
          <Rise><StatTile icon={BarChart2} label="Bestes Volumen" sub="pro Training"><CountUp value={st.bestVolume} /><span className="ml-1 text-lg text-white/40">kg</span></StatTile></Rise>
          <Rise><StatTile icon={Repeat} label="Trainings"><CountUp value={st.sessions} /></StatTile></Rise>
        </Stagger>

        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label">{bw ? 'Wiederholungen' : 'Geschätztes 1RM'} · Verlauf</div>
              {series.length > 1 && (
                <div className="num mt-1 text-2xl">
                  {series[series.length - 1].e1rm - series[0].e1rm >= 0 ? '+' : ''}
                  {nf(series[series.length - 1].e1rm - series[0].e1rm, 1)} <span className="text-sm text-white/40">{unit} im Zeitraum</span>
                </div>
              )}
            </div>
            <Seg value={range} onChange={setRange} options={[{ v: '1M', l: '1M' }, { v: '3M', l: '3M' }, { v: '6M', l: '6M' }, { v: '1J', l: '1J' }, { v: 'ALL', l: 'Alles' }]} />
          </div>
          <div className="-mx-2 h-[240px]">
            {series.length ? (
              <Safe><AutoSize>{({ width, height }) => (
                <AreaChart width={width} height={height} data={series} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="e1g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C6FF00" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#C6FF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} width={44} tickFormatter={(v) => nf(v)} />
                  <Tooltip content={({ active: a, payload }) => a && payload?.length ? (
                    <div className="glass rounded-xl px-3 py-2 text-xs">
                      <div className="text-white/50">{fmtDate(payload[0].payload.date)}</div>
                      <div className="num text-base text-lime">{nf(payload[0].value as number, 1)} {unit}</div>
                      {!bw && <div className="text-white/50">Top-Gewicht {nf(payload[0].payload.weight, 1)} kg</div>}
                    </div>
                  ) : null} />
                  <Area type="monotone" dataKey="e1rm" stroke="#C6FF00" strokeWidth={3} fill="url(#e1g)" dot={{ r: 3, fill: '#0A0A0A', stroke: '#C6FF00', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#C6FF00', stroke: '#0A0A0A' }} style={{ filter: 'drop-shadow(0 0 8px rgba(198,255,0,.55))' }} animationDuration={1100} />
                </AreaChart>
              )}</AutoSize></Safe>
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/40">Noch keine Daten in diesem Zeitraum.</div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle action={<Button size="sm" onClick={addToWorkout}><Plus size={15} />Ins Training</Button>}>Verlauf</SectionTitle>
          {st.history.length ? (
            <div className="space-y-3">
              {st.history.slice(0, 30).map(({ workout, sets }, i) => (
                <motion.div key={workout.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.04 }} className="card p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="font-semibold">{fmtDate(workout.started_at, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="text-xs text-white/40">{workout.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sets.map((s, j) => (
                      <span key={s.id} className="num rounded-xl bg-white/[0.05] px-2.5 py-1.5 text-sm">
                        <span className="mr-1.5 text-white/35">{j + 1}</span>{s.weight > 0 ? `${nf(s.weight, 1)} × ${s.reps}` : `${s.reps} Wdh.`}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-white/45">Diese Übung hast du noch nie trainiert. Zeit, das zu ändern.</div>
          )}
        </section>
      </Container>
    </Page>
  )
}
