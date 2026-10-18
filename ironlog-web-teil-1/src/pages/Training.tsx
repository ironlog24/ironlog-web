import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, Clock, Dumbbell, Flag, Minus, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, TrendingUp, Trophy, X, Zap } from 'lucide-react'
import { useData, useSession } from '@/state/store'
import { Page } from '@/components/motion'
import { Container, PageHero } from '@/components/bits'
import { Img } from '@/components/Img'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { HERO } from '@/lib/images'
import { cn, fmtDuration, haptic, nf } from '@/lib/utils'
import { prConfetti } from '@/lib/confetti'
import { previousSets, suggestNext } from '@/data/stats'
import { MUSCLES, MUSCLE_LABEL, type MuscleGroup, type Workout, type WorkoutExercise, type WorkoutSet } from '@/data/types'

export default function Training() {
  const { active } = useSession()
  return active ? <Live workout={active} /> : <StartScreen />
}

/* ───────────────────────── Start ───────────────────────── */

function StartScreen() {
  const { templates, exMap } = useData()
  const { start } = useSession()
  return (
    <Page>
      <PageHero image={HERO.templates} kicker="Training" title={<>Bereit für<br /><span className="text-lime">Eisen?</span></>} />
      <Container className="mt-6 space-y-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => start(null)}
          className="flex w-full items-center gap-4 rounded-[24px] bg-lime p-5 text-left text-ink shadow-glow animate-pulseglow"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-lime"><Zap size={26} fill="currentColor" /></span>
          <span className="flex-1">
            <span className="block font-display text-3xl leading-none">FREIES TRAINING</span>
            <span className="text-sm font-medium text-ink/70">Leer starten, Übungen spontan hinzufügen</span>
          </span>
          <ChevronRight />
        </motion.button>
        <div className="label pt-4">Aus Vorlage starten</div>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => start(t)}
              className="card group flex items-center gap-4 overflow-hidden p-3 text-left transition hover:border-lime/30"
            >
              <Img src={t.cover_url} alt="" shade="none" className="h-20 w-20 shrink-0 rounded-2xl" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-3xl leading-none">{t.name}</span>
                <span className="line-clamp-1 text-xs text-white/50">{t.items.map((x) => exMap.get(x.exercise_id)?.name).join(' · ')}</span>
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-lime transition group-hover:bg-lime group-hover:text-ink"><Play size={18} fill="currentColor" /></span>
            </motion.button>
          ))}
        </div>
      </Container>
    </Page>
  )
}

/* ───────────────────────── Live ───────────────────────── */

function Live({ workout }: { workout: Workout }) {
  const { finish, discard, rename } = useSession()
  const nav = useNavigate()
  const [now, setNow] = useState(Date.now())
  const [addOpen, setAddOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [prToast, setPrToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const done = workout.exercises.flatMap((e) => e.sets.filter((s) => s.done))
  const volume = done.reduce((a, s) => a + s.weight * s.reps, 0)
  const total = workout.exercises.reduce((a, e) => a + e.sets.length, 0)

  async function onFinish() {
    setBusy(true)
    const w = await finish()
    setBusy(false)
    setEndOpen(false)
    if (w) nav(`/recap/${w.id}`, { replace: true })
  }

  return (
    <Page className="pb-40">
      {/* Sticky Header */}
      <div className="pt-safe glass sticky top-0 z-30 border-x-0 border-t-0">
        <Container className="flex max-w-4xl items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <NameEdit value={workout.name} onChange={rename} />
            <div className="mt-0.5 flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><Clock size={12} className="text-lime" /><span className="num text-[13px] text-white">{fmtDuration(now - +new Date(workout.started_at))}</span></span>
              <span className="flex items-center gap-1"><Dumbbell size={12} className="text-lime" /><span className="num text-[13px] text-white">{nf(volume)}</span> kg</span>
              <span><span className="num text-[13px] text-white">{done.length}</span>/{total} Sätze</span>
            </div>
          </div>
          <Button size="sm" onClick={() => setEndOpen(true)} className="h-10"><Flag size={15} />Beenden</Button>
        </Container>
        <div className="h-[2px] bg-white/5">
          <motion.div className="h-full bg-lime shadow-glow-sm" animate={{ width: `${total ? (done.length / total) * 100 : 0}%` }} />
        </div>
      </div>

      <Container className="mt-5 max-w-4xl space-y-4">
        <AnimatePresence initial={false}>
          {workout.exercises.map((we, i) => (
            <motion.div key={we.id} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} exit={{ opacity: 0, x: -60 }}>
              <ExerciseCard we={we} workoutId={workout.id} onPr={(n) => { setPrToast(n); prConfetti(); setTimeout(() => setPrToast(null), 2800) }} />
            </motion.div>
          ))}
        </AnimatePresence>

        {!workout.exercises.length && (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <Dumbbell size={40} className="mb-3 text-lime" />
            <h3 className="h-display text-3xl">Leeres Training</h3>
            <p className="mt-1 text-sm text-white/50">Füge deine erste Übung hinzu und leg los.</p>
          </div>
        )}

        <Button variant="outline" size="lg" className="w-full border-dashed" onClick={() => setAddOpen(true)}>
          <Plus size={18} />Übung hinzufügen
        </Button>
        <button
          onClick={() => { if (confirmDiscard) { discard(); nav('/') } else { setConfirmDiscard(true); setTimeout(() => setConfirmDiscard(false), 3000) } }}
          className={cn('mx-auto block py-3 text-xs font-semibold uppercase tracking-wider transition', confirmDiscard ? 'text-blaze' : 'text-white/35 hover:text-blaze')}
        >
          {confirmDiscard ? 'Nochmal tippen zum Verwerfen' : 'Training verwerfen'}
        </button>
      </Container>

      <AddExerciseDialog open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent title="Training beenden?">
          <p className="text-white/60">
            {done.length} von {total} Sätzen abgehakt.{done.length < total && ' Nicht abgehakte Sätze werden nicht gespeichert.'}
          </p>
          <div className="mt-6 grid gap-3">
            <Button size="lg" onClick={onFinish} disabled={busy || !done.length}><Trophy size={18} />Speichern & Recap</Button>
            <Button variant="soft" size="lg" onClick={() => setEndOpen(false)}>Weiter trainieren</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PR Toast */}
      <AnimatePresence>
        {prToast && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
          >
            <div className="flex items-center gap-3 rounded-[22px] bg-lime px-5 py-3 text-ink shadow-glow">
              <motion.span animate={{ rotate: [0, -15, 15, -10, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.8 }} className="text-3xl">🏆</motion.span>
              <div>
                <div className="font-display text-3xl leading-none">NEUER PR</div>
                <div className="text-xs font-semibold text-ink/70">{prToast}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}

function NameEdit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [edit, setEdit] = useState(false)
  if (edit)
    return (
      <input
        autoFocus
        defaultValue={value}
        onBlur={(e) => { onChange(e.target.value.trim() || value); setEdit(false) }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full bg-transparent font-display text-2xl uppercase outline-none"
      />
    )
  return (
    <button onClick={() => setEdit(true)} className="group flex max-w-full items-center gap-2">
      <span className="truncate font-display text-2xl uppercase leading-none">{value}</span>
      <Pencil size={13} className="shrink-0 text-white/30 group-hover:text-lime" />
    </button>
  )
}

/* ───────────────────────── Übungskarte ───────────────────────── */

const ExerciseCard = memo(function ExerciseCard({ we, workoutId, onPr }: { we: WorkoutExercise; workoutId: string; onPr: (label: string) => void }) {
  const { exMap, workouts } = useData()
  const { addSet, removeSet, removeExercise } = useSession()
  const ex = exMap.get(we.exercise_id)
  const prev = useMemo(() => previousSets(workouts, we.exercise_id, workoutId), [workouts, we.exercise_id, workoutId])
  const sug = useMemo(
    () => suggestNext(prev, we.target_reps ?? Math.max(...prev.map((s) => s.reps), 8), { bodyweight: ex?.bodyweight, equipment: ex?.equipment, muscle: ex?.muscle_group }),
    [prev, we.target_reps, ex],
  )
  const [menu, setMenu] = useState(false)
  const doneCount = we.sets.filter((s) => s.done).length
  const complete = doneCount === we.sets.length && we.sets.length > 0

  return (
    <div className={cn('card overflow-hidden transition-colors duration-500', complete && 'border-lime/30')}>
      <div className="relative h-[92px]">
        <Img src={ex?.image_url} alt={ex?.name ?? ''} shade="none" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
        <div className="absolute inset-0 flex items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <div className="label !text-lime/90">{ex ? MUSCLE_LABEL[ex.muscle_group] : ''} · {ex?.equipment}</div>
            <h3 className="truncate font-display text-[30px] leading-none">{ex?.name ?? 'Übung'}</h3>
          </div>
          <div className={cn('num rounded-full px-3 py-1 text-xs', complete ? 'bg-lime text-ink' : 'bg-white/10 text-white/70')}>{doneCount}/{we.sets.length}</div>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/70 hover:text-white" aria-label="Optionen"><MoreHorizontal size={18} /></button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="glass absolute right-0 top-11 z-20 w-48 rounded-2xl p-1.5">
                  <button onClick={() => { setMenu(false); removeExercise(we.id) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-blaze hover:bg-blaze/10"><Trash2 size={15} />Übung entfernen</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {sug && doneCount === 0 && (
          <div className={cn('mb-2.5 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold', sug.kind === 'up' ? 'bg-lime/10 text-lime' : 'bg-white/[0.05] text-white/60')}>
            <TrendingUp size={14} className="shrink-0" />
            <span>{sug.text}</span>
          </div>
        )}
        <div className="mb-1.5 grid grid-cols-[38px_1fr_1fr_46px] items-center gap-1.5 px-1 md:grid-cols-[48px_120px_1fr_1fr_52px] md:gap-3">
          <span className="label text-center">Satz</span>
          <span className="label hidden md:block">Vorher</span>
          <span className="label text-center">{ex?.bodyweight ? '+kg' : 'kg'}</span>
          <span className="label text-center">Wdh.</span>
          <span className="label text-center"><Check size={13} className="mx-auto" /></span>
        </div>
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {we.sets.map((s, i) => (
              <SetRow key={s.id} s={s} weId={we.id} prev={prev[i]} exName={ex?.name ?? ''} onPr={onPr} />
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" size="sm" className="flex-1" onClick={() => addSet(we.id)}><Plus size={15} />Satz</Button>
          {we.sets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => removeSet(we.id, we.sets[we.sets.length - 1].id)} aria-label="Letzten Satz entfernen"><Minus size={15} /></Button>
          )}
        </div>
      </div>
    </div>
  )
})

function SetRow({ s, weId, prev, exName, onPr }: { s: WorkoutSet; weId: string; prev?: WorkoutSet; exName: string; onPr: (l: string) => void }) {
  const { updateSet, toggleSet, prSetIds } = useSession()
  const isPr = prSetIds.has(s.id)
  const prevLabel = prev ? `${nf(prev.weight, 1)}×${prev.reps}` : '–'

  function toggle() {
    const r = toggleSet(weId, s.id)
    haptic(r.done ? [10, 30, 18] : 8)
    if (r.pr) onPr(`${exName} · ${s.weight > 0 ? `${nf(s.weight, 1)} kg × ${s.reps}` : `${s.reps} Wdh.`}`)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto', scale: s.done ? [1, 1.025, 1] : 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28 }}
      className={cn(
        'relative grid grid-cols-[38px_1fr_1fr_46px] items-center gap-1.5 rounded-2xl border p-1 transition-colors duration-300 md:grid-cols-[48px_120px_1fr_1fr_52px] md:gap-3',
        s.done ? 'border-lime/40 bg-lime/[0.12] shadow-[inset_0_0_24px_rgba(198,255,0,.08)]' : 'border-transparent bg-white/[0.03]',
      )}
    >
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className={cn('num text-lg', s.done ? 'text-lime' : 'text-white/80')}>{s.set_number}</span>
        <span className="num text-[9px] font-medium text-white/35 md:hidden">{prevLabel}</span>
      </div>
      <span className="num hidden text-sm font-semibold text-white/35 md:block">{prev ? `${nf(prev.weight, 1)} kg × ${prev.reps}` : '–'}</span>
      <Stepper value={s.weight} step={2.5} decimals={1} done={s.done} onChange={(v) => updateSet(weId, s.id, { weight: v })} label="Gewicht" />
      <Stepper value={s.reps} step={1} done={s.done} onChange={(v) => updateSet(weId, s.id, { reps: Math.round(v) })} label="Wiederholungen" />
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={toggle}
        aria-label={s.done ? 'Satz offen' : 'Satz abhaken'}
        className={cn(
          'grid h-11 w-full place-items-center rounded-xl transition-all duration-300',
          s.done ? 'bg-lime text-ink shadow-glow-sm' : 'bg-white/[0.06] text-white/30 hover:bg-white/10',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {s.done ? (
            <motion.span key="y" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <Check size={22} strokeWidth={3.2} />
            </motion.span>
          ) : (
            <motion.span key="n" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={20} /></motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {isPr && (
          <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-2 z-10 rounded-full bg-blaze px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink shadow-glow-orange">
            PR 🏆
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Stepper({ value, step, decimals = 0, done, onChange, label }: { value: number; step: number; decimals?: number; done: boolean; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState<string | null>(null)
  const display = text ?? (decimals ? nf(value, decimals) : String(value))
  const bump = (d: number) => {
    haptic(6)
    onChange(Math.max(0, Math.round((value + d) * 100) / 100))
  }
  return (
    <div className={cn('flex h-11 items-stretch overflow-hidden rounded-xl bg-ink-700', done && 'bg-ink/40')}>
      <button onClick={() => bump(-step)} className="w-8 shrink-0 text-white/50 transition hover:bg-white/5 hover:text-white active:bg-lime/20 md:w-10" aria-label={`${label} verringern`}>
        <Minus size={15} className="mx-auto" />
      </button>
      <input
        inputMode="decimal"
        aria-label={label}
        value={display}
        onFocus={(e) => { setText(display); e.target.select() }}
        onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => {
          const n = parseFloat((text ?? '').replace(',', '.'))
          if (!Number.isNaN(n)) onChange(Math.max(0, Math.round(n * 100) / 100))
          setText(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={cn('num w-full min-w-0 bg-transparent text-center text-[19px] outline-none', done ? 'text-lime' : 'text-white')}
      />
      <button onClick={() => bump(step)} className="w-8 shrink-0 text-white/50 transition hover:bg-white/5 hover:text-white active:bg-lime/20 md:w-10" aria-label={`${label} erhöhen`}>
        <Plus size={15} className="mx-auto" />
      </button>
    </div>
  )
}

/* ───────────────────────── Übung hinzufügen ───────────────────────── */

function AddExerciseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { exercises } = useData()
  const { addExercise } = useSession()
  const [q, setQ] = useState('')
  const [mg, setMg] = useState<MuscleGroup | null>(null)
  const list = exercises.filter((e) => (!mg || e.muscle_group === mg) && e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Übung hinzufügen">
        <div className="relative mb-3">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <Input autoFocus placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} className="pl-11" />
          {q && <button onClick={() => setQ('')} aria-label="Suche leeren" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"><X size={16} /></button>}
        </div>
        <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
          {MUSCLES.map((m) => (
            <button key={m} onClick={() => setMg(mg === m ? null : m)} className={cn('chip shrink-0 transition', mg === m && '!border-lime !bg-lime !text-ink')}>{MUSCLE_LABEL[m]}</button>
          ))}
        </div>
        <div className="max-h-[50dvh] space-y-1.5 overflow-y-auto">
          {list.map((e) => (
            <button key={e.id} onClick={() => { addExercise(e.id); onOpenChange(false); setQ('') }} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/5">
              <Img src={e.image_url} alt="" shade="none" className="h-14 w-14 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.name}</span>
                <span className="text-xs text-white/45">{MUSCLE_LABEL[e.muscle_group]} · {e.equipment}</span>
              </span>
              <Plus size={18} className="text-lime" />
            </button>
          ))}
          {!list.length && <p className="py-8 text-center text-sm text-white/40">Keine Übung gefunden.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
