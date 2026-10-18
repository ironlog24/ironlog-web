import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Dumbbell, Layers, Pencil, Trash2, X } from 'lucide-react'
import { useData } from '@/state/store'
import { Page } from '@/components/motion'
import { Container, EmptyState, PageHero, SectionTitle } from '@/components/bits'
import { Img } from '@/components/Img'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { HERO, MUSCLE_COVER } from '@/lib/images'
import { cn, dayKey, fmtDate, fmtMinutes, nf, startOfWeek } from '@/lib/utils'
import { byDate, doneSets, trainingDays, workoutDuration, workoutVolume } from '@/data/stats'
import type { Workout } from '@/data/types'

export default function History() {
  const { workouts, templates, exMap } = useData()
  const [edit, setEdit] = useState<Workout | null>(null)
  const list = useMemo(() => workouts.filter((w) => w.ended_at).sort(byDate).reverse(), [workouts])

  const coverFor = (w: Workout) => {
    const t = templates.find((x) => x.id === w.template_id)
    if (t?.cover_url) return t.cover_url
    const mg = exMap.get(w.exercises[0]?.exercise_id)?.muscle_group
    return mg ? MUSCLE_COVER[mg] : HERO.history
  }

  // nach Monat gruppieren
  const groups = useMemo(() => {
    const g = new Map<string, Workout[]>()
    for (const w of list) {
      const k = fmtDate(w.started_at, { month: 'long', year: 'numeric' })
      g.set(k, [...(g.get(k) ?? []), w])
    }
    return [...g.entries()]
  }, [list])

  return (
    <Page>
      <PageHero image={HERO.history} kicker={`${list.length} Trainings`} title="Verlauf" />
      <Container className="mt-6 space-y-10">
        <Heatmap />
        {!list.length ? (
          <EmptyState title="Noch kein Training" text="Der beste Zeitpunkt anzufangen war gestern. Der zweitbeste ist jetzt." action={<Button asChild><Link to="/training">Erstes Training starten</Link></Button>} />
        ) : (
          groups.map(([month, ws]) => (
            <section key={month}>
              <SectionTitle>{month}</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {ws.map((w, i) => (
                  <motion.article
                    key={w.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ delay: (i % 4) * 0.05 }}
                    className="card group relative overflow-hidden"
                  >
                    <div className="relative h-28">
                      <Img src={coverFor(w)} alt="" shade="none" className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-800/60 to-transparent" />
                      <div className="absolute bottom-2 left-4 right-14">
                        <div className="label !text-lime/90">{fmtDate(w.started_at, { weekday: 'long', day: '2-digit', month: 'short' })}</div>
                        <h3 className="truncate font-display text-3xl leading-none">{w.name}</h3>
                      </div>
                      <button onClick={() => setEdit(w)} className="glass absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full opacity-90 transition hover:text-lime" aria-label="Bearbeiten"><Pencil size={15} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 px-4 pb-3 pt-1">
                      <Mini icon={Clock} v={fmtMinutes(workoutDuration(w))} />
                      <Mini icon={Layers} v={`${doneSets(w).length} Sätze`} />
                      <Mini icon={Dumbbell} v={`${nf(workoutVolume(w))} kg`} />
                    </div>
                    <div className="border-t border-white/[0.05] px-4 py-3 text-xs text-white/50">
                      {w.exercises.map((we) => `${we.sets.length}× ${exMap.get(we.exercise_id)?.name ?? '?'}`).join(' · ')}
                    </div>
                    <Link to={`/recap/${w.id}`} className="absolute inset-0 z-0" aria-label="Recap ansehen" />
                  </motion.article>
                ))}
              </div>
            </section>
          ))
        )}
      </Container>
      <EditDialog workout={edit} onClose={() => setEdit(null)} />
    </Page>
  )
}

function Mini({ icon: Icon, v }: { icon: typeof Clock; v: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon size={14} className="shrink-0 text-lime" />
      <span className="num truncate !font-semibold">{v}</span>
    </div>
  )
}

/* ───────────────────────── Heatmap ───────────────────────── */

function Heatmap() {
  const { workouts } = useData()
  const scroller = useRef<HTMLDivElement>(null)
  const weeks = 26
  const { cols, max, total } = useMemo(() => {
    const days = trainingDays(workouts)
    const start = startOfWeek(new Date())
    start.setDate(start.getDate() - (weeks - 1) * 7)
    const cols: { date: Date; v: number }[][] = []
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        col.push({ date, v: days.get(dayKey(date)) ?? 0 })
      }
      cols.push(col)
    }
    const vals = [...days.values()]
    return { cols, max: Math.max(1, ...vals), total: cols.flat().filter((c) => c.v > 0).length }
  }, [workouts])

  useEffect(() => {
    scroller.current?.scrollTo({ left: 9999 })
  }, [])

  const today = Date.now()
  const level = (v: number) => (v <= 0 ? 0 : v < max * 0.35 ? 1 : v < max * 0.65 ? 2 : v < max * 0.9 ? 3 : 4)
  const cls = ['bg-white/[0.05]', 'bg-lime/25', 'bg-lime/50', 'bg-lime/75', 'bg-lime shadow-[0_0_10px_rgba(198,255,0,.7)]']
  const months = cols.map((c, i) => (i === 0 || c[0].date.getMonth() !== cols[i - 1][0].date.getMonth() ? fmtDate(c[0].date.toISOString(), { month: 'short' }) : ''))

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="label">Trainingstage · 6 Monate</div>
          <div className="num mt-1 text-3xl">{total} <span className="text-base text-white/40">Tage</span></div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          weniger {cls.map((c, i) => <span key={i} className={cn('h-3 w-3 rounded-[4px]', c)} />)} mehr
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar overflow-x-auto">
        <div className="inline-flex gap-[5px]">
          <div className="mr-1 grid grid-rows-[14px_repeat(7,1fr)] gap-[5px] text-[9px] text-white/30">
            <span />
            {['Mo', '', 'Mi', '', 'Fr', '', 'So'].map((d, i) => <span key={i} className="flex h-[15px] items-center">{d}</span>)}
          </div>
          {cols.map((col, i) => (
            <div key={i} className="grid grid-rows-[14px_repeat(7,1fr)] gap-[5px]">
              <span className="whitespace-nowrap text-[9px] text-white/35">{months[i]}</span>
              {col.map((c) => (
                <motion.span
                  key={c.date.toISOString()}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.012 }}
                  title={`${fmtDate(c.date.toISOString())}${c.v ? ` · ${nf(c.v)} kg` : ''}`}
                  className={cn('h-[15px] w-[15px] rounded-[4px] md:h-[17px] md:w-[17px]', +c.date > today ? 'bg-transparent' : cls[level(c.v)])}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Bearbeiten ───────────────────────── */

function EditDialog({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const { saveWorkout, deleteWorkout, exMap } = useData()
  const [draft, setDraft] = useState<Workout | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  useEffect(() => {
    setDraft(workout ? structuredClone(workout) : null)
    setConfirmDel(false)
  }, [workout])
  if (!draft) return null

  const patchSet = (wi: number, si: number, k: 'weight' | 'reps', v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    setDraft((d) => {
      if (!d) return d
      const x = structuredClone(d)
      x.exercises[wi].sets[si][k] = Number.isNaN(n) ? 0 : n
      return x
    })
  }
  const removeSet = (wi: number, si: number) =>
    setDraft((d) => {
      if (!d) return d
      const x = structuredClone(d)
      x.exercises[wi].sets.splice(si, 1)
      x.exercises[wi].sets.forEach((s, i) => (s.set_number = i + 1))
      x.exercises = x.exercises.filter((e) => e.sets.length)
      return x
    })

  return (
    <Dialog open={!!workout} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Training bearbeiten">
        <div className="space-y-4">
          <div>
            <div className="label mb-1.5">Name</div>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          {draft.exercises.map((we, wi) => (
            <div key={we.id} className="rounded-2xl bg-white/[0.03] p-3">
              <div className="mb-2 font-display text-2xl">{exMap.get(we.exercise_id)?.name}</div>
              <div className="space-y-1.5">
                {we.sets.map((s, si) => (
                  <div key={s.id} className="grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2">
                    <span className="num text-center text-white/40">{si + 1}</span>
                    <div className="relative"><Input inputMode="decimal" defaultValue={String(s.weight).replace('.', ',')} onChange={(e) => patchSet(wi, si, 'weight', e.target.value)} className="h-10 pr-9 text-center num" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/35">kg</span></div>
                    <div className="relative"><Input inputMode="numeric" defaultValue={s.reps} onChange={(e) => patchSet(wi, si, 'reps', e.target.value)} className="h-10 pr-11 text-center num" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/35">Wdh.</span></div>
                    <button onClick={() => removeSet(wi, si)} className="grid h-9 w-9 place-items-center rounded-xl text-white/35 hover:bg-blaze/10 hover:text-blaze" aria-label="Satz löschen"><X size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-3 pt-2">
            <Button size="lg" onClick={async () => { await saveWorkout(draft); onClose() }}>Änderungen speichern</Button>
            <Button variant="danger" size="lg" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await deleteWorkout(draft.id); onClose() }}>
              <Trash2 size={16} />{confirmDel ? 'Wirklich löschen?' : 'Training löschen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
