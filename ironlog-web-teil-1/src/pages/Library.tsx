import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Loader2, Plus, Search, X } from 'lucide-react'
import { useData } from '@/state/store'
import { Page } from '@/components/motion'
import { Container, PageHero } from '@/components/bits'
import { Img } from '@/components/Img'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { HERO, MUSCLE_COVER } from '@/lib/images'
import { cn } from '@/lib/utils'
import { MUSCLES, MUSCLE_LABEL, type MuscleGroup } from '@/data/types'

export default function Library() {
  const { exercises, workouts, loading } = useData()
  const [q, setQ] = useState('')
  const [mg, setMg] = useState<MuscleGroup | 'alle' | 'eigene'>('alle')
  const [open, setOpen] = useState(false)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of workouts) for (const we of w.exercises) m.set(we.exercise_id, (m.get(we.exercise_id) ?? 0) + 1)
    return m
  }, [workouts])

  const list = exercises.filter(
    (e) =>
      (mg === 'alle' || (mg === 'eigene' ? e.is_custom : e.muscle_group === mg)) &&
      e.name.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <Page>
      <PageHero image={HERO.library} kicker={`${exercises.length} Übungen`} title="Übungen">
        <Button size="sm" className="absolute bottom-8 right-5 md:right-10" onClick={() => setOpen(true)}>
          <Plus size={16} />Eigene
        </Button>
      </PageHero>

      <Container className="mt-5">
        {/* Muskelgruppen-Cover */}
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2.5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
          {MUSCLES.map((m, i) => (
            <motion.button
              key={m}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMg(mg === m ? 'alle' : m)}
              className={cn('group relative h-[104px] w-[132px] shrink-0 overflow-hidden rounded-[20px] border transition md:w-auto', mg === m ? 'border-lime shadow-glow-sm' : 'border-white/[0.06]')}
            >
              <Img src={MUSCLE_COVER[m]} alt={MUSCLE_LABEL[m]} shade="bottom" className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
              <span className={cn('absolute bottom-2.5 left-3 font-display text-2xl', mg === m && 'text-lime')}>{MUSCLE_LABEL[m]}</span>
            </motion.button>
          ))}
        </div>

        {/* Suche + Chips */}
        <div className="glass sticky top-2 z-20 -mx-1 mb-5 rounded-[22px] p-2">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <Input placeholder="Übung suchen …" value={q} onChange={(e) => setQ(e.target.value)} className="border-transparent bg-white/[0.04] pl-11" />
            {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" aria-label="Suche leeren"><X size={16} /></button>}
          </div>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
            {(['alle', ...MUSCLES, 'eigene'] as const).map((m) => (
              <button key={m} onClick={() => setMg(m)} className={cn('chip shrink-0 transition', mg === m && '!border-lime !bg-lime !text-ink')}>
                {m === 'alle' ? 'Alle' : m === 'eigene' ? 'Eigene' : MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {loading && !exercises.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
            <AnimatePresence mode="popLayout">
              {list.map((e, i) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: Math.min(i, 12) * 0.025 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link to={`/uebungen/${e.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[22px] border border-white/[0.06] transition hover:border-lime/40 hover:shadow-glow-sm">
                    <Img src={e.image_url} alt={e.name} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute left-2.5 top-2.5 flex gap-1">
                      <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime backdrop-blur">{MUSCLE_LABEL[e.muscle_group]}</span>
                      {e.is_custom && <span className="rounded-full bg-blaze/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Eigene</span>}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <h3 className="font-display text-[23px] leading-[0.95] md:text-[26px]">{e.name}</h3>
                      <div className="mt-1 text-[11px] text-white/45">{e.equipment}{counts.get(e.id) ? ` · ${counts.get(e.id)}× trainiert` : ''}</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        {!list.length && !loading && <p className="py-16 text-center text-white/40">Nichts gefunden. Leg die Übung doch selbst an!</p>}
      </Container>

      <CreateExerciseDialog open={open} onOpenChange={setOpen} />
    </Page>
  )
}

function CreateExerciseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { createExercise } = useData()
  const [name, setName] = useState('')
  const [mg, setMg] = useState<MuscleGroup>('brust')
  const [equipment, setEquipment] = useState('Kurzhantel')
  const [bodyweight, setBodyweight] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  async function save() {
    if (!name.trim()) return setErr('Bitte gib einen Namen ein.')
    setBusy(true)
    setErr('')
    try {
      await createExercise({ name: name.trim(), muscle_group: mg, equipment, bodyweight }, file)
      onOpenChange(false)
      setName('')
      setFile(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Eigene Übung">
        <label className="group relative mb-4 block h-44 cursor-pointer overflow-hidden rounded-[22px] border border-dashed border-white/15 transition hover:border-lime/50">
          {preview ? (
            <Img src={preview} alt="Vorschau" className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40 group-hover:text-lime">
              <ImagePlus size={30} />
              <span className="text-sm font-semibold">Bild hochladen</span>
            </div>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="space-y-3">
          <Input placeholder="Name, z. B. Cable Crossover" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <div className="label mb-2">Muskelgruppe</div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <button key={m} onClick={() => setMg(m)} className={cn('chip transition', mg === m && '!border-lime !bg-lime !text-ink')}>{MUSCLE_LABEL[m]}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-2">Equipment</div>
            <div className="flex flex-wrap gap-1.5">
              {['Langhantel', 'Kurzhantel', 'Kabelzug', 'Maschine', 'Multipresse', 'SZ-Stange', 'T-Bar', 'Körpergewicht', 'Sonstiges'].map((x) => (
                <button key={x} onClick={() => { setEquipment(x); setBodyweight(x === 'Körpergewicht') }} className={cn('chip transition', equipment === x && '!border-lime !bg-lime !text-ink')}>{x}</button>
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-blaze">{err}</p>}
          <Button size="lg" className="mt-2 w-full" onClick={save} disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />}Übung speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
