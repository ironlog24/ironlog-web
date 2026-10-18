import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Calculator, ChevronLeft, ChevronRight, Globe, Loader2, Minus, Pencil, Plus, ScanBarcode, Search, Star, Target, Trash2, X,
} from 'lucide-react'
import { Page } from '@/components/motion'
import { Container } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CountUp } from '@/components/CountUp'
import { cn, haptic, nf } from '@/lib/utils'
import {
  ACTIVITY, addDays, calcGoals, dayString, DEFAULT_GOALS, favorites, MEALS, newCustomFood, newEntry, nutritionStore, recents, scale, sumEntries,
  type Food, type FoodEntry, type GoalInput, type Goals, type Meal,
} from '@/data/nutrition'
import { findByCode, foodDbSize, loadFoodDb, lookupBarcodeOnline, searchFoods, searchOnline } from '@/lib/foodDb'
import { cameraAvailable, startScanner, type ScannerHandle } from '@/lib/barcode'

const MACRO = [
  { k: 'p' as const, l: 'Eiweiß', color: '#C6FF00' },
  { k: 'c' as const, l: 'Kohlenhydrate', color: '#7FB2FF' },
  { k: 'f' as const, l: 'Fett', color: '#FF5F1F' },
]

function defaultMeal(): Meal {
  const h = new Date().getHours()
  return h < 11 ? 'fruehstueck' : h < 15 ? 'mittag' : h < 21 ? 'abend' : 'snacks'
}

function dayLabel(day: string) {
  const today = dayString()
  if (day === today) return 'Heute'
  if (day === addDays(today, -1)) return 'Gestern'
  if (day === addDays(today, 1)) return 'Morgen'
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
}

/* ════════════════════ Seite ════════════════════ */

export default function Nutrition() {
  const [day, setDay] = useState(dayString())
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS)
  const [hasGoals, setHasGoals] = useState(true)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [custom, setCustom] = useState<Food[]>([])
  const [dbCount, setDbCount] = useState<number | null>(foodDbSize() || null)
  const [dbError, setDbError] = useState(false)

  const [addFor, setAddFor] = useState<Meal | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [picked, setPicked] = useState<{ food: Food; grams?: number; meal: Meal; entry?: FoodEntry } | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)

  const from = addDays(day, -6)

  const reload = useCallback(async () => {
    const [g, e, c] = await Promise.all([nutritionStore.getGoals(), nutritionStore.listEntries(addDays(day, -6), day), nutritionStore.listCustomFoods()])
    setGoals(g ?? DEFAULT_GOALS)
    setHasGoals(!!g)
    setEntries(e)
    setCustom(c)
  }, [day])

  useEffect(() => {
    reload().catch(console.error)
  }, [reload])

  useEffect(() => {
    loadFoodDb().then(setDbCount).catch(() => setDbError(true))
  }, [])

  const todays = entries.filter((e) => e.day === day)
  const total = sumEntries(todays)
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i)
      return { day: d, kcal: sumEntries(entries.filter((e) => e.day === d)).kcal }
    }),
    [entries, from],
  )

  async function saveEntry(e: FoodEntry) {
    setEntries((all) => [...all.filter((x) => x.id !== e.id), e])
    recents.add(e.food, e.grams)
    haptic([10, 30, 15])
    await nutritionStore.saveEntry(e)
  }
  async function removeEntry(id: string) {
    setEntries((all) => all.filter((x) => x.id !== id))
    await nutritionStore.deleteEntry(id)
  }
  async function saveCustom(f: Food) {
    setCustom((all) => [...all.filter((x) => x.id !== f.id), f])
    await nutritionStore.saveCustomFood(f)
  }

  return (
    <Page>
      <header className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(80%_120%_at_90%_0%,rgba(198,255,0,.13),transparent_60%)] md:rounded-b-[40px]">
        <Container className="pt-safe pb-6 pt-10">
          <div className="label !text-lime">Ernährung</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h1 className="h-display text-[52px] md:text-[76px]">{dayLabel(day)}</h1>
            <div className="flex gap-2">
              <button onClick={() => setDay(addDays(day, -1))} className="glass grid h-11 w-11 place-items-center rounded-2xl" aria-label="Vorheriger Tag"><ChevronLeft size={18} /></button>
              <button onClick={() => setDay(addDays(day, 1))} disabled={day >= dayString()} className="glass grid h-11 w-11 place-items-center rounded-2xl disabled:opacity-30" aria-label="Nächster Tag"><ChevronRight size={18} /></button>
            </div>
          </div>
        </Container>
      </header>

      <Container className="mt-5 space-y-5">
        {!hasGoals && (
          <button onClick={() => setGoalsOpen(true)} className="flex w-full items-center gap-3 rounded-[22px] border border-lime/30 bg-lime/10 p-4 text-left">
            <Target className="shrink-0 text-lime" />
            <span className="flex-1 text-sm"><b className="text-lime">Ziel festlegen:</b> Berechne deinen Kalorien- und Eiweißbedarf in 30 Sekunden.</span>
            <ChevronRight size={18} className="text-lime" />
          </button>
        )}

        {/* Tagesübersicht */}
        <section className="card grid gap-6 p-5 md:grid-cols-[240px_1fr] md:items-center">
          <KcalRing eaten={total.kcal} goal={goals.kcal} />
          <div className="space-y-4">
            {MACRO.map((m) => (
              <MacroBar key={m.k} label={m.l} color={m.color} value={total[m.k]} goal={goals[m.k]} />
            ))}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1" onClick={() => setScanOpen(true)}><ScanBarcode size={16} />Scannen</Button>
              <Button size="sm" variant="soft" className="flex-1" onClick={() => setAddFor(defaultMeal())}><Search size={16} />Suchen</Button>
              <Button size="sm" variant="soft" onClick={() => setGoalsOpen(true)} aria-label="Ziele"><Target size={16} /></Button>
            </div>
          </div>
        </section>

        {/* Mahlzeiten */}
        <div className="grid gap-4 md:grid-cols-2">
          {MEALS.map((m) => {
            const list = todays.filter((e) => e.meal === m.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
            const sum = sumEntries(list)
            return (
              <section key={m.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 pb-2 pt-4">
                  <h2 className="font-display text-[28px] leading-none">{m.label}</h2>
                  <span className="num text-sm text-white/60">{nf(sum.kcal)} kcal</span>
                </div>
                <AnimatePresence initial={false}>
                  {list.map((e) => {
                    const s = scale(e.food, e.grams)
                    return (
                      <motion.button
                        key={e.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => setPicked({ food: e.food, grams: e.grams, meal: e.meal, entry: e })}
                        className="flex w-full items-center gap-3 border-t border-white/[0.05] px-4 py-3 text-left transition hover:bg-white/[0.03]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{e.food.name}</span>
                          <span className="block truncate text-xs text-white/45">{[e.food.brand, `${nf(e.grams)} g`, `${nf(s.p)} g Eiweiß`].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="num text-[15px]">{nf(s.kcal)}</span>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
                <button onClick={() => setAddFor(m.id)} className="flex w-full items-center gap-2 border-t border-white/[0.05] px-4 py-3 text-sm font-semibold text-lime transition hover:bg-lime/[0.06]">
                  <Plus size={16} />Hinzufügen
                </button>
              </section>
            )
          })}
        </div>

        <WeekCard week={week} goal={goals.kcal} today={day} onPick={setDay} />

        <p className="pb-4 text-center text-[11px] text-white/35">
          {dbError ? 'Lebensmittel-Datenbank konnte nicht geladen werden. ' : dbCount ? `${nf(dbCount)} Produkte offline · ` : 'Datenbank wird geladen … · '}
          Produktdaten: Open Food Facts (ODbL) · Grundnahrungsmittel: Durchschnittswerte
        </p>
      </Container>

      <AddFoodDialog
        meal={addFor}
        custom={custom}
        dbReady={!!dbCount}
        onClose={() => setAddFor(null)}
        onScan={() => { setScanOpen(true) }}
        onPick={(food, grams) => setPicked({ food, grams, meal: addFor ?? defaultMeal() })}
        onCreateCustom={saveCustom}
      />

      <ScannerDialog
        open={scanOpen}
        custom={custom}
        onClose={() => setScanOpen(false)}
        onFound={(food) => {
          setScanOpen(false)
          setPicked({ food, meal: addFor ?? defaultMeal() })
        }}
        onCreateCustom={async (f) => {
          await saveCustom(f)
          setScanOpen(false)
          setPicked({ food: f, meal: addFor ?? defaultMeal() })
        }}
      />

      <AmountDialog
        pick={picked}
        onClose={() => setPicked(null)}
        onSave={async (food, grams, meal) => {
          const e = picked?.entry ? { ...picked.entry, grams, meal } : newEntry(day, meal, food, grams)
          setPicked(null)
          setAddFor(null)
          await saveEntry(e)
        }}
        onDelete={picked?.entry ? async () => { const id = picked.entry!.id; setPicked(null); await removeEntry(id) } : undefined}
      />

      <GoalsDialog
        open={goalsOpen}
        goals={goals}
        onClose={() => setGoalsOpen(false)}
        onSave={async (g) => {
          setGoals(g)
          setHasGoals(true)
          setGoalsOpen(false)
          await nutritionStore.saveGoals(g)
        }}
      />
    </Page>
  )
}

/* ════════════════════ Anzeige ════════════════════ */

function KcalRing({ eaten, goal }: { eaten: number; goal: number }) {
  const R = 92
  const C = 2 * Math.PI * R
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0
  const over = eaten > goal
  const left = Math.round(goal - eaten)
  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="16" />
        <motion.circle
          cx="110" cy="110" r={R} fill="none" stroke={over ? '#FF5F1F' : '#C6FF00'} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${over ? 'rgba(255,95,31,.6)' : 'rgba(198,255,0,.55)'})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={cn('num text-[52px] leading-none', over && 'text-blaze')}>
          <CountUp value={Math.abs(left)} />
        </div>
        <div className="label mt-1">{over ? 'kcal zu viel' : 'kcal übrig'}</div>
        <div className="mt-2 text-xs text-white/45">
          <span className="num text-white/80">{nf(eaten)}</span> / {nf(goal)} kcal
        </div>
      </div>
    </div>
  )
}

function MacroBar({ label, color, value, goal }: { label: string; color: string; value: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-white/50"><span className="num text-white">{nf(value)}</span> / {nf(goal)} g</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}88` }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </div>
  )
}

function WeekCard({ week, goal, today, onPick }: { week: { day: string; kcal: number }[]; goal: number; today: string; onPick: (d: string) => void }) {
  const max = Math.max(goal * 1.25, ...week.map((w) => w.kcal), 1)
  const logged = week.filter((w) => w.kcal > 0)
  const avg = logged.length ? logged.reduce((a, b) => a + b.kcal, 0) / logged.length : 0
  const H = 130
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="label">Letzte 7 Tage</div>
          <div className="num mt-1 text-2xl">{nf(avg)} <span className="text-sm text-white/40">kcal Ø ({logged.length} {logged.length === 1 ? 'Tag' : 'Tage'} erfasst)</span></div>
        </div>
      </div>
      <div className="relative" style={{ height: H + 22 }}>
        <div className="absolute inset-x-0 border-t border-dashed border-lime/40" style={{ top: H - (goal / max) * H }}>
          <span className="absolute -top-4 right-0 text-[10px] text-lime/70">Ziel {nf(goal)}</span>
        </div>
        <div className="absolute inset-x-0 top-0 grid grid-cols-7 items-end gap-2" style={{ height: H }}>
          {week.map((w) => {
            const h = (w.kcal / max) * H
            const over = w.kcal > goal
            const [y, m, d] = w.day.split('-').map(Number)
            return (
              <button key={w.day} onClick={() => onPick(w.day)} className="relative flex h-full flex-col justify-end" aria-label={`${w.day}: ${Math.round(w.kcal)} kcal`}>
                <motion.div
                  className={cn('w-full rounded-t-lg rounded-b-sm', w.day === today ? (over ? 'bg-blaze' : 'bg-lime') : over ? 'bg-blaze/40' : 'bg-lime/35')}
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(w.kcal > 0 ? 4 : 0, h) }}
                  transition={{ duration: 0.7 }}
                />
                <span className={cn('absolute -bottom-5 left-0 right-0 text-center text-[10px]', w.day === today ? 'text-lime' : 'text-white/40')}>
                  {new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(y, m - 1, d))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════ Lebensmittel hinzufügen ════════════════════ */

type Tab = 'suche' | 'zuletzt' | 'favoriten' | 'eigene'

function AddFoodDialog({ meal, custom, dbReady, onClose, onScan, onPick, onCreateCustom }: {
  meal: Meal | null
  custom: Food[]
  dbReady: boolean
  onClose: () => void
  onScan: () => void
  onPick: (f: Food, grams?: number) => void
  onCreateCustom: (f: Food) => Promise<void>
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('suche')
  const [online, setOnline] = useState<Food[] | null>(null)
  const [onlineState, setOnlineState] = useState<'idle' | 'busy' | 'error'>('idle')
  const [creating, setCreating] = useState(false)
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 120)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    setOnline(null)
    setOnlineState('idle')
  }, [debounced])
  useEffect(() => {
    if (meal) {
      setQ('')
      setTab('suche')
      setCreating(false)
    }
  }, [meal])

  const results = useMemo(() => (debounced.trim().length >= 2 ? searchFoods(debounced, custom) : []), [debounced, custom, dbReady])

  async function goOnline() {
    setOnlineState('busy')
    try {
      setOnline(await searchOnline(q))
      setOnlineState('idle')
    } catch {
      setOnlineState('error')
    }
  }

  const list: { food: Food; grams?: number }[] =
    tab === 'zuletzt' ? recents.all() : tab === 'favoriten' ? favorites.all().map((food) => ({ food })) : tab === 'eigene' ? custom.map((food) => ({ food })) : []

  return (
    <Dialog open={!!meal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={creating ? 'Eigenes Lebensmittel' : `${MEALS.find((m) => m.id === meal)?.label ?? ''} hinzufügen`}>
        {creating ? (
          <CustomFoodForm
            initialName={q}
            onCancel={() => setCreating(false)}
            onSave={async (f) => {
              await onCreateCustom(f)
              setCreating(false)
              onPick(f)
            }}
          />
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                <Input autoFocus placeholder="Lebensmittel oder Marke …" value={q} onChange={(e) => { setQ(e.target.value); setTab('suche') }} className="pl-11 pr-10" />
                {q && <button onClick={() => setQ('')} aria-label="Suche leeren" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"><X size={16} /></button>}
              </div>
              <Button variant="neon" size="icon" onClick={onScan} aria-label="Barcode scannen"><ScanBarcode size={20} /></Button>
            </div>

            <div className="no-scrollbar -mx-5 my-3 flex gap-1.5 overflow-x-auto px-5">
              {([['suche', 'Suche'], ['zuletzt', 'Zuletzt'], ['favoriten', 'Favoriten'], ['eigene', 'Eigene']] as [Tab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)} className={cn('chip shrink-0 transition', tab === t && '!border-lime !bg-lime !text-ink')}>{l}</button>
              ))}
            </div>

            <div className="max-h-[52dvh] space-y-1 overflow-y-auto">
              {tab === 'suche' && (
                <>
                  {!dbReady && <p className="flex items-center gap-2 py-3 text-sm text-white/50"><Loader2 size={15} className="animate-spin" />Datenbank wird geladen …</p>}
                  {debounced.trim().length < 2 && dbReady && <p className="py-6 text-center text-sm text-white/40">Tippe z. B. „Skyr“, „Haferflocken“ oder eine Marke.</p>}
                  {results.map((f) => <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />)}
                  {online?.map((f) => <FoodRow key={'o' + f.id} food={f} onClick={() => onPick(f)} online />)}
                  {debounced.trim().length >= 2 && (
                    <div className="space-y-2 pt-3">
                      {online === null && (
                        <Button variant="soft" className="w-full" onClick={goOnline} disabled={onlineState === 'busy'}>
                          {onlineState === 'busy' ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                          Online in Open Food Facts suchen
                        </Button>
                      )}
                      {onlineState === 'error' && <p className="text-center text-xs text-blaze">Online-Suche nicht erreichbar. Bist du online?</p>}
                      {online && !online.length && <p className="text-center text-xs text-white/40">Online nichts gefunden.</p>}
                      <Button variant="ghost" className="w-full" onClick={() => setCreating(true)}><Plus size={16} />Eigenes Lebensmittel anlegen</Button>
                    </div>
                  )}
                </>
              )}
              {tab !== 'suche' && list.map(({ food, grams }) => <FoodRow key={food.id} food={food} grams={grams} onClick={() => onPick(food, grams)} />)}
              {tab !== 'suche' && !list.length && (
                <p className="py-8 text-center text-sm text-white/40">
                  {tab === 'zuletzt' ? 'Noch nichts eingetragen.' : tab === 'favoriten' ? 'Markiere Lebensmittel mit dem Stern.' : 'Noch keine eigenen Lebensmittel.'}
                </p>
              )}
              {tab === 'eigene' && <Button variant="ghost" className="w-full" onClick={() => setCreating(true)}><Plus size={16} />Eigenes Lebensmittel anlegen</Button>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FoodRow({ food, grams, online, onClick }: { food: Food; grams?: number; online?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/5">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-black uppercase',
        food.source === 'basis' ? 'bg-lime/15 text-lime' : food.source === 'eigen' ? 'bg-blaze/15 text-blaze' : 'bg-white/[0.06] text-white/60')}>
        {food.source === 'basis' ? 'Ø' : food.source === 'eigen' ? 'Ich' : online ? <Globe size={15} /> : (food.brand || food.name).slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{food.name}</span>
        <span className="block truncate text-xs text-white/45">
          {[food.brand, grams ? `zuletzt ${nf(grams)} g` : null, `E ${nf(food.p, 1)} · K ${nf(food.c, 1)} · F ${nf(food.f, 1)}`].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="text-right">
        <span className="num block text-[15px]">{nf(food.kcal)}</span>
        <span className="block text-[10px] text-white/40">kcal/100 g</span>
      </span>
    </button>
  )
}

/* ════════════════════ Menge wählen ════════════════════ */

function AmountDialog({ pick, onClose, onSave, onDelete }: {
  pick: { food: Food; grams?: number; meal: Meal; entry?: FoodEntry } | null
  onClose: () => void
  onSave: (food: Food, grams: number, meal: Meal) => void
  onDelete?: () => void
}) {
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<Meal>('fruehstueck')
  const [fav, setFav] = useState(false)

  useEffect(() => {
    if (!pick) return
    setGrams(String(pick.grams ?? pick.food.serving ?? 100))
    setMeal(pick.meal)
    setFav(favorites.has(pick.food.id))
  }, [pick])

  if (!pick) return null
  const food = pick.food
  const g = Math.max(0, parseFloat(grams.replace(',', '.')) || 0)
  const s = scale(food, g)
  const chips = [...new Set([food.serving ? Math.round(food.serving) : null, 50, 100, 150, 200, 250].filter((x): x is number => !!x))]
  const bump = (d: number) => setGrams(String(Math.max(0, Math.round((g + d) * 10) / 10)))

  return (
    <Dialog open={!!pick} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={pick.entry ? 'Eintrag bearbeiten' : 'Menge'}>
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold leading-tight">{food.name}</div>
            <div className="text-sm text-white/50">{[food.brand, food.code].filter(Boolean).join(' · ')}</div>
          </div>
          <button
            onClick={() => { favorites.toggle(food); setFav(!fav); haptic(8) }}
            className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition', fav ? 'bg-lime text-ink' : 'bg-white/5 text-white/50')}
            aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
          >
            <Star size={17} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex items-stretch gap-2">
          <button onClick={() => bump(-10)} className="grid w-14 place-items-center rounded-2xl bg-white/[0.06] text-white/70" aria-label="10 g weniger"><Minus size={18} /></button>
          <div className="relative flex-1">
            <Input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d.,]/g, ''))} onFocus={(e) => e.target.select()} className="num h-16 text-center text-3xl" aria-label="Menge in Gramm" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">g</span>
          </div>
          <button onClick={() => bump(10)} className="grid w-14 place-items-center rounded-2xl bg-white/[0.06] text-white/70" aria-label="10 g mehr"><Plus size={18} /></button>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
          {chips.map((c) => (
            <button key={c} onClick={() => setGrams(String(c))} className={cn('chip shrink-0 transition', g === c && '!border-lime !bg-lime !text-ink')}>
              {food.serving && c === Math.round(food.serving) ? `Portion ${c} g` : `${c} g`}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[['kcal', s.kcal, ''], ['Eiweiß', s.p, 'g'], ['Kohlenh.', s.c, 'g'], ['Fett', s.f, 'g']].map(([l, v, u]) => (
            <div key={l as string} className="rounded-2xl bg-white/[0.04] px-1 py-3">
              <div className="num text-xl">{nf(v as number, (v as number) < 10 && l !== 'kcal' ? 1 : 0)}<span className="text-xs text-white/40">{u}</span></div>
              <div className="label !text-[9px]">{l}</div>
            </div>
          ))}
        </div>

        <div className="label mb-2 mt-4">Mahlzeit</div>
        <div className="flex flex-wrap gap-1.5">
          {MEALS.map((m) => (
            <button key={m.id} onClick={() => setMeal(m.id)} className={cn('chip transition', meal === m.id && '!border-lime !bg-lime !text-ink')}>{m.label}</button>
          ))}
        </div>

        <div className="mt-6 grid gap-2">
          <Button size="lg" disabled={g <= 0} onClick={() => onSave(food, g, meal)}>
            {pick.entry ? <Pencil size={16} /> : <Plus size={18} />}{pick.entry ? 'Speichern' : 'Hinzufügen'}
          </Button>
          {onDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={16} />Eintrag löschen</Button>}
        </div>
        <p className="mt-3 text-center text-[11px] text-white/35">
          Je 100 g: {nf(food.kcal)} kcal · E {nf(food.p, 1)} · K {nf(food.c, 1)} · F {nf(food.f, 1)}
          {food.sugar != null && ` · Zucker ${nf(food.sugar, 1)}`}
          {food.fiber != null && ` · Ballaststoffe ${nf(food.fiber, 1)}`}
        </p>
      </DialogContent>
    </Dialog>
  )
}

/* ════════════════════ Eigenes Lebensmittel ════════════════════ */

function CustomFoodForm({ initialName = '', code, onSave, onCancel }: { initialName?: string; code?: string; onSave: (f: Food) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: initialName, brand: '', kcal: '', p: '', c: '', f: '', serving: '' })
  const n = (s: string) => parseFloat(s.replace(',', '.'))
  const valid = v.name.trim() && !isNaN(n(v.kcal))
  const field = (k: keyof typeof v, label: string, unit = '') => (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <div className="relative">
        <Input inputMode={k === 'name' || k === 'brand' ? 'text' : 'decimal'} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={unit ? 'pr-12' : ''} />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40">{unit}</span>}
      </div>
    </label>
  )
  return (
    <div className="space-y-3">
      {code && <p className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/60">Barcode <span className="num text-white">{code}</span> ist noch unbekannt. Trag die Werte von der Verpackung ein (je 100 g).</p>}
      {field('name', 'Name')}
      {field('brand', 'Marke (optional)')}
      <div className="grid grid-cols-2 gap-3">
        {field('kcal', 'Kalorien', 'kcal')}
        {field('p', 'Eiweiß', 'g')}
        {field('c', 'Kohlenhydrate', 'g')}
        {field('f', 'Fett', 'g')}
      </div>
      {field('serving', 'Portion (optional)', 'g')}
      <div className="grid gap-2 pt-2">
        <Button
          size="lg"
          disabled={!valid}
          onClick={() =>
            onSave(newCustomFood({
              code, name: v.name.trim(), brand: v.brand.trim() || undefined,
              kcal: n(v.kcal) || 0, p: n(v.p) || 0, c: n(v.c) || 0, f: n(v.f) || 0, serving: n(v.serving) || null,
            }))
          }
        >
          Speichern
        </Button>
        <Button variant="ghost" onClick={onCancel}><ArrowLeft size={16} />Zurück</Button>
      </div>
    </div>
  )
}

/* ════════════════════ Barcode-Scanner ════════════════════ */

function ScannerDialog({ open, custom, onClose, onFound, onCreateCustom }: {
  open: boolean
  custom: Food[]
  onClose: () => void
  onFound: (f: Food) => void
  onCreateCustom: (f: Food) => Promise<void>
}) {
  const video = useRef<HTMLVideoElement>(null)
  const handle = useRef<ScannerHandle | null>(null)
  const [state, setState] = useState<'start' | 'scan' | 'lookup' | 'unknown' | 'error'>('start')
  const [code, setCode] = useState('')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')

  const stop = () => {
    handle.current?.stop()
    handle.current = null
  }

  const lookup = useCallback(async (c: string) => {
    stop()
    setCode(c)
    haptic([20, 40, 20])
    const local = findByCode(c, custom)
    if (local) return onFound(local)
    setState('lookup')
    try {
      const online = await lookupBarcodeOnline(c)
      if (online) return onFound(online)
      setState('unknown')
    } catch {
      setError('Produkt konnte nicht online abgefragt werden. Bist du online?')
      setState('error')
    }
  }, [custom, onFound])

  useEffect(() => {
    if (!open) {
      stop()
      return
    }
    setState('start')
    setCode('')
    setManual('')
    setError('')
    if (!cameraAvailable()) {
      setError(window.isSecureContext ? 'Dieser Browser erlaubt keinen Kamerazugriff.' : 'Die Kamera funktioniert nur, wenn IRONLOG über https geöffnet wird (z. B. als Online-Version), nicht als lokale Datei.')
      setState('error')
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      if (!video.current || cancelled) return
      try {
        handle.current = await startScanner(video.current, (c) => lookup(c))
        if (cancelled) stop()
        else setState('scan')
      } catch (e) {
        setError((e as Error)?.name === 'NotAllowedError' ? 'Kamerazugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.' : 'Kamera konnte nicht gestartet werden.')
        setState('error')
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { stop(); onClose() } }}>
      <DialogContent title={state === 'unknown' ? 'Unbekanntes Produkt' : 'Barcode scannen'}>
        {state === 'unknown' ? (
          <CustomFoodForm code={code} onCancel={() => { setState('start'); onClose() }} onSave={(f) => onCreateCustom(f)} />
        ) : (
          <>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-black">
              <video ref={video} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
              {state !== 'error' && <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="relative h-[38%] w-[78%] rounded-2xl border-2 border-lime/80 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]">
                  {state === 'scan' && <motion.div className="absolute inset-x-3 h-0.5 bg-lime shadow-glow-sm" animate={{ top: ['10%', '90%', '10%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />}
                </div>
              </div>}
              {(state === 'start' || state === 'lookup') && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-white/80">
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{state === 'lookup' ? `Suche ${code} …` : 'Kamera startet …'}</span>
                </div>
              )}
              {state === 'error' && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80">{error}</div>}
            </div>
            <p className="mt-3 text-center text-xs text-white/45">Barcode in den Rahmen halten – er wird automatisch erkannt.</p>
            <div className="mt-4 flex gap-2">
              <Input inputMode="numeric" placeholder="Barcode eintippen" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} />
              <Button disabled={manual.length < 8} onClick={() => lookup(manual)}>Suchen</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ════════════════════ Ziele ════════════════════ */

function GoalsDialog({ open, goals, onClose, onSave }: { open: boolean; goals: Goals; onClose: () => void; onSave: (g: Goals) => void }) {
  const [mode, setMode] = useState<'rechner' | 'manuell'>('rechner')
  const [inp, setInp] = useState<GoalInput>(goals.calc ?? { sex: 'm', age: 22, height: 180, weight: 80, activity: 1.55, goal: 'aufbau' })
  const [man, setMan] = useState({ kcal: String(goals.kcal), p: String(goals.p), c: String(goals.c), f: String(goals.f) })

  useEffect(() => {
    if (!open) return
    if (goals.calc) setInp(goals.calc)
    setMan({ kcal: String(goals.kcal), p: String(goals.p), c: String(goals.c), f: String(goals.f) })
  }, [open, goals])

  const calc = calcGoals(inp)
  const num = (s: string) => Math.max(0, Math.round(parseFloat(s.replace(',', '.')) || 0))
  const manual: Goals = { kcal: num(man.kcal), p: num(man.p), c: num(man.c), f: num(man.f) }
  const macroKcal = manual.p * 4 + manual.c * 4 + manual.f * 9

  const numField = (label: string, value: number, set: (n: number) => void, unit: string) => (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <div className="relative">
        <Input inputMode="numeric" value={String(value)} onChange={(e) => set(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))} className="pr-12" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40">{unit}</span>
      </div>
    </label>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Dein Ziel">
        <div className="mb-4 inline-flex rounded-2xl border border-white/[0.06] bg-ink-800 p-1">
          {(['rechner', 'manuell'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn('flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition', mode === m ? 'bg-lime text-ink' : 'text-white/55')}>
              {m === 'rechner' ? <Calculator size={14} /> : <Pencil size={14} />}{m === 'rechner' ? 'Rechner' : 'Manuell'}
            </button>
          ))}
        </div>

        {mode === 'rechner' ? (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {(['m', 'w'] as const).map((s) => (
                <button key={s} onClick={() => setInp({ ...inp, sex: s })} className={cn('chip flex-1 justify-center py-2 transition', inp.sex === s && '!border-lime !bg-lime !text-ink')}>{s === 'm' ? 'Männlich' : 'Weiblich'}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {numField('Alter', inp.age, (n) => setInp({ ...inp, age: n }), 'J.')}
              {numField('Größe', inp.height, (n) => setInp({ ...inp, height: n }), 'cm')}
              {numField('Gewicht', inp.weight, (n) => setInp({ ...inp, weight: n }), 'kg')}
            </div>
            <div>
              <div className="label mb-1.5">Aktivität</div>
              <div className="space-y-1.5">
                {ACTIVITY.map((a) => (
                  <button key={a.v} onClick={() => setInp({ ...inp, activity: a.v })} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-sm transition', inp.activity === a.v ? 'border-lime bg-lime/10 text-lime' : 'border-white/[0.06] bg-white/[0.03]')}>
                    {a.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Ziel</div>
              <div className="flex gap-1.5">
                {([['aufbau', 'Aufbauen'], ['halten', 'Halten'], ['definition', 'Definieren']] as const).map(([g, l]) => (
                  <button key={g} onClick={() => setInp({ ...inp, goal: g })} className={cn('chip flex-1 justify-center py-2 transition', inp.goal === g && '!border-lime !bg-lime !text-ink')}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-[20px] border border-lime/25 bg-lime/[0.06] p-3 text-center">
              {[['kcal', calc.kcal], ['Eiweiß', calc.p], ['Kohlenh.', calc.c], ['Fett', calc.f]].map(([l, v]) => (
                <div key={l as string}><div className="num text-xl text-lime">{nf(v as number)}</div><div className="label !text-[9px]">{l}{l === 'kcal' ? '' : ' g'}</div></div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-white/40">Berechnung nach Mifflin-St Jeor mit Aktivitätsfaktor; Aufbau +300 kcal, Definition −400 kcal; Eiweiß 2,0–2,2 g pro kg. Das ist ein Richtwert, kein medizinischer Rat.</p>
            <Button size="lg" className="w-full" onClick={() => onSave(calc)}>Ziel übernehmen</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {([['kcal', 'Kalorien', 'kcal'], ['p', 'Eiweiß', 'g'], ['c', 'Kohlenhydrate', 'g'], ['f', 'Fett', 'g']] as const).map(([k, l, u]) => (
                <label key={k} className="block">
                  <span className="label mb-1 block">{l}</span>
                  <div className="relative">
                    <Input inputMode="numeric" value={man[k]} onChange={(e) => setMan({ ...man, [k]: e.target.value.replace(/[^\d]/g, '') })} className="pr-12" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40">{u}</span>
                  </div>
                </label>
              ))}
            </div>
            <p className={cn('text-xs', Math.abs(macroKcal - manual.kcal) > 150 ? 'text-blaze' : 'text-white/45')}>
              Makros ergeben {nf(macroKcal)} kcal{Math.abs(macroKcal - manual.kcal) > 150 ? ' – weicht deutlich vom Kalorienziel ab.' : '.'}
            </p>
            <Button size="lg" className="w-full" disabled={!manual.kcal} onClick={() => onSave(manual)}>Speichern</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

