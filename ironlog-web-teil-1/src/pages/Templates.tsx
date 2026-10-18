import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ImagePlus, Minus, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react'
import { useData, useSession } from '@/state/store'
import { api } from '@/data/api'
import { Page } from '@/components/motion'
import { Container, EmptyState, PageHero } from '@/components/bits'
import { Img } from '@/components/Img'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { HERO, TEMPLATE_COVERS } from '@/lib/images'
import { cn, uid } from '@/lib/utils'
import { MUSCLES, MUSCLE_LABEL, type MuscleGroup, type Template } from '@/data/types'

export default function Templates() {
  const { templates, exMap, deleteTemplate } = useData()
  const { active, start } = useSession()
  const nav = useNavigate()
  const [editing, setEditing] = useState<Template | null>(null)

  const newTpl = (): Template => ({ id: uid(), name: '', cover_url: TEMPLATE_COVERS[templates.length % TEMPLATE_COVERS.length], items: [], created_at: new Date().toISOString() })

  return (
    <Page>
      <PageHero image={HERO.templates} kicker={`${templates.length} Vorlagen`} title="Pläne">
        <Button size="sm" className="absolute bottom-8 right-5 md:right-10" onClick={() => setEditing(newTpl())}><Plus size={16} />Neuer Plan</Button>
      </PageHero>
      <Container className="mt-6">
        {!templates.length ? (
          <EmptyState title="Noch kein Plan" text="Wer plant, steigert. Wer steigert, gewinnt." action={<Button onClick={() => setEditing(newTpl())}><Plus size={16} />Plan erstellen</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t, i) => (
              <motion.article key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="group relative h-[300px] overflow-hidden rounded-[28px] border border-white/[0.06]">
                <Img src={t.cover_url} alt={t.name} shade="none" className="absolute inset-0" imgClassName="transition-transform duration-[1.2s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
                <div className="absolute right-4 top-4 flex gap-2">
                  <button onClick={() => setEditing(structuredClone(t))} className="glass grid h-10 w-10 place-items-center rounded-full hover:text-lime" aria-label="Bearbeiten"><Pencil size={15} /></button>
                  <button onClick={() => deleteTemplate(t.id)} className="glass grid h-10 w-10 place-items-center rounded-full hover:text-blaze" aria-label="Löschen"><Trash2 size={15} /></button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="label mb-1">{t.items.length} Übungen · {t.items.reduce((a, b) => a + b.target_sets, 0)} Sätze</div>
                  <h2 className="h-display text-5xl">{t.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.items.slice(0, 5).map((it) => (
                      <span key={it.exercise_id} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75 backdrop-blur">
                        {exMap.get(it.exercise_id)?.name} <span className="text-lime">{it.target_sets}×{it.target_reps}</span>
                      </span>
                    ))}
                  </div>
                  <Button className="mt-4 w-full md:w-auto" disabled={!!active} onClick={() => { start(t); nav('/training') }}>
                    <Play size={16} fill="currentColor" />{active ? 'Training läuft bereits' : 'Training starten'}
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </Container>
      <Editor tpl={editing} onClose={() => setEditing(null)} />
    </Page>
  )
}

function Editor({ tpl, onClose }: { tpl: Template | null; onClose: () => void }) {
  const { exercises, exMap, saveTemplate } = useData()
  const [d, setD] = useState<Template | null>(tpl)
  const [picker, setPicker] = useState(false)
  const [q, setQ] = useState('')
  const [mg, setMg] = useState<MuscleGroup | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setD(tpl)
    setPicker(false)
    setErr('')
  }, [tpl])
  if (!d) return null

  const upd = (i: number, k: 'target_sets' | 'target_reps', delta: number) =>
    setD({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, [k]: Math.max(1, it[k] + delta) } : it)) })

  async function save() {
    if (!d!.name.trim()) return setErr('Gib deinem Plan einen Namen.')
    if (!d!.items.length) return setErr('Füge mindestens eine Übung hinzu.')
    await saveTemplate({ ...d!, name: d!.name.trim() })
    onClose()
  }

  return (
    <Dialog open={!!tpl} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={d.name ? d.name : 'Neuer Plan'}>
        <div className="space-y-5">
          <Input placeholder="Name, z. B. Upper Body" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />

          <div>
            <div className="label mb-2">Cover-Bild</div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              <label className="grid h-20 w-20 shrink-0 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/20 text-white/40 hover:border-lime hover:text-lime">
                <ImagePlus size={20} />
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, cover_url: await api.uploadCover(f) }) }} />
              </label>
              {[...new Set([d.cover_url, ...TEMPLATE_COVERS].filter(Boolean) as string[])].map((c) => (
                <button key={c} onClick={() => setD({ ...d, cover_url: c })} className={cn('relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition', d.cover_url === c ? 'border-lime shadow-glow-sm' : 'border-transparent')}>
                  <Img src={c} alt="" shade="none" className="absolute inset-0" />
                  {d.cover_url === c && <span className="absolute inset-0 grid place-items-center bg-lime/20"><Check className="text-lime" /></span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-2">Übungen</div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {d.items.map((it, i) => {
                  const ex = exMap.get(it.exercise_id)
                  return (
                    <motion.div key={it.exercise_id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2">
                      <Img src={ex?.image_url} alt="" shade="none" className="h-12 w-12 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{ex?.name}</div>
                        <div className="mt-1 flex items-center gap-3">
                          <Mini label="Sätze" v={it.target_sets} onMinus={() => upd(i, 'target_sets', -1)} onPlus={() => upd(i, 'target_sets', 1)} />
                          <Mini label="Wdh." v={it.target_reps} onMinus={() => upd(i, 'target_reps', -1)} onPlus={() => upd(i, 'target_reps', 1)} />
                        </div>
                      </div>
                      <button onClick={() => setD({ ...d, items: d.items.filter((_, j) => j !== i) })} className="grid h-9 w-9 place-items-center rounded-xl text-white/40 hover:bg-blaze/10 hover:text-blaze" aria-label="Entfernen"><X size={16} /></button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {picker ? (
              <div className="mt-3 rounded-2xl border border-white/10 p-2">
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                  <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen …" className="h-11 pl-10" />
                </div>
                <div className="no-scrollbar -mx-2 mb-2 flex gap-1.5 overflow-x-auto px-2">
                  <button onClick={() => setMg(null)} className={cn('chip shrink-0 transition', mg === null && '!border-lime !bg-lime !text-ink')}>Alle</button>
                  {MUSCLES.map((m) => (
                    <button key={m} onClick={() => setMg(mg === m ? null : m)} className={cn('chip shrink-0 transition', mg === m && '!border-lime !bg-lime !text-ink')}>{MUSCLE_LABEL[m]}</button>
                  ))}
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {exercises
                    .filter((e) => !d.items.some((x) => x.exercise_id === e.id) && (!mg || e.muscle_group === mg) && e.name.toLowerCase().includes(q.toLowerCase()))
                    .map((e) => (
                      <button key={e.id} onClick={() => { setD({ ...d, items: [...d.items, { exercise_id: e.id, target_sets: 3, target_reps: 10 }] }); setQ('') }} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-white/5">
                        <Img src={e.image_url} alt="" shade="none" className="h-10 w-10 shrink-0 rounded-lg" />
                        <span className="flex-1 text-sm">{e.name}</span>
                        <span className="text-[11px] text-white/35">{MUSCLE_LABEL[e.muscle_group]}</span>
                        <Plus size={16} className="text-lime" />
                      </button>
                    ))}
                  {!exercises.some((e) => !d.items.some((x) => x.exercise_id === e.id) && (!mg || e.muscle_group === mg) && e.name.toLowerCase().includes(q.toLowerCase())) && (
                    <p className="py-6 text-center text-sm text-white/40">Keine Übung gefunden.</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setPicker(false)}>Fertig</Button>
              </div>
            ) : (
              <Button variant="outline" className="mt-3 w-full border-dashed" onClick={() => setPicker(true)}><Plus size={16} />Übung hinzufügen</Button>
            )}
          </div>

          {err && <p className="text-sm text-blaze">{err}</p>}
          <Button size="lg" className="w-full" onClick={save}>Plan speichern</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Mini({ label, v, onMinus, onPlus }: { label: string; v: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onMinus} className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-white/60 hover:text-white" aria-label={`${label} weniger`}><Minus size={12} /></button>
      <span className="num w-6 text-center text-sm">{v}</span>
      <button onClick={onPlus} className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-white/60 hover:text-white" aria-label={`${label} mehr`}><Plus size={12} /></button>
      <span className="ml-0.5 text-[10px] uppercase tracking-wider text-white/35">{label}</span>
    </div>
  )
}
