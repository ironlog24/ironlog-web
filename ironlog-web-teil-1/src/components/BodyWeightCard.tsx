import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts'
import { Loader2, Plus, Scale, Trash2 } from 'lucide-react'
import { bodyStore, type BodyWeight } from '@/data/account'
import { dayString } from '@/data/nutrition'
import { AutoSize, Safe } from '@/components/Safe'
import { Seg } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { nf } from '@/lib/utils'

const fmtDay = (d: string) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(new Date(d + 'T12:00:00'))

export function BodyWeightCard() {
  const [rows, setRows] = useState<BodyWeight[] | null>(null)
  const [err, setErr] = useState('')
  const [kg, setKg] = useState('')
  const [day, setDay] = useState(dayString())
  const [busy, setBusy] = useState(false)
  const [span, setSpan] = useState<'30' | '90' | '365'>('90')
  const ref = useRef<HTMLElement>(null)
  const loc = useLocation()

  const load = () =>
    bodyStore
      .list()
      .then((r) => {
        setRows(r)
        setErr('')
      })
      .catch((e) => {
        setRows([])
        setErr(/body_weights|schema cache|does not exist/i.test(String(e?.message)) ? 'In Supabase fehlt noch die Tabelle für das Körpergewicht. Bitte „ironlog-update.sql“ ausführen.' : String(e?.message ?? e))
      })

  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    if (loc.hash === '#koerpergewicht') setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }, [loc.hash])

  const data = useMemo(() => {
    if (!rows) return []
    const from = new Date(Date.now() - +span * 864e5).toISOString().slice(0, 10)
    return rows.filter((r) => r.day >= from).map((r) => ({ ...r, label: fmtDay(r.day) }))
  }, [rows, span])

  const latest = rows?.[rows.length - 1]
  const first = data[0]
  const diff = latest && first && data.length > 1 ? latest.kg - first.kg : null

  async function add(e: FormEvent) {
    e.preventDefault()
    const v = Number(kg.replace(',', '.'))
    if (!(v >= 20 && v <= 400)) return setErr('Bitte ein Gewicht zwischen 20 und 400 kg eingeben.')
    setBusy(true)
    setErr('')
    try {
      await bodyStore.save({ day, kg: Math.round(v * 10) / 10 })
      setKg('')
      await load()
    } catch (x) {
      setErr(String((x as Error)?.message ?? x))
    } finally {
      setBusy(false)
    }
  }

  async function remove(d: string) {
    setRows((r) => r?.filter((x) => x.day !== d) ?? r)
    await bodyStore.remove(d).catch(() => load())
  }

  const min = data.length ? Math.floor(Math.min(...data.map((d) => d.kg)) - 1) : 0
  const max = data.length ? Math.ceil(Math.max(...data.map((d) => d.kg)) + 1) : 1

  return (
    <section id="koerpergewicht" ref={ref} className="card scroll-mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label flex items-center gap-1.5">
            <Scale size={12} /> Körpergewicht
          </div>
          <div className="num mt-1 text-3xl">
            {latest ? nf(latest.kg, 1) : '–'} <span className="text-base text-white/40">kg</span>
          </div>
          {diff != null && (
            <div className={`mt-1 text-xs font-semibold ${diff <= 0 ? 'text-lime' : 'text-blaze'}`}>
              {diff > 0 ? '+' : ''}
              {nf(diff, 1)} kg im Zeitraum
            </div>
          )}
        </div>
        <Seg value={span} onChange={setSpan} options={[{ v: '30', l: '1M' }, { v: '90', l: '3M' }, { v: '365', l: '1J' }]} />
      </div>

      {rows === null ? (
        <div className="grid h-[180px] place-items-center text-white/40"><Loader2 className="animate-spin" /></div>
      ) : data.length > 1 ? (
        <div className="-mx-2 h-[200px]">
          <Safe><AutoSize>{({ width, height }) => (
            <AreaChart width={width} height={height} data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bwg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6FF00" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C6FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis axisLine={false} tickLine={false} width={40} domain={[min, max]} tickFormatter={(v) => `${v}`} />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="glass rounded-xl px-3 py-2 text-xs"><div className="text-white/50">{payload[0].payload.label}</div><div className="num text-base text-lime">{nf(Number(payload[0].value), 1)} kg</div></div> : null} />
              <Area type="monotone" dataKey="kg" stroke="#C6FF00" strokeWidth={2.5} fill="url(#bwg)" dot={{ r: 3, fill: '#C6FF00', strokeWidth: 0 }} animationDuration={900} />
            </AreaChart>
          )}</AutoSize></Safe>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-white/45">Trag dein Gewicht regelmäßig ein (z. B. morgens nüchtern), dann erscheint hier dein Verlauf.</p>
      )}

      <form onSubmit={add} className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
        <Input type="date" value={day} max={dayString()} onChange={(e) => setDay(e.target.value)} aria-label="Datum" />
        <Input inputMode="decimal" placeholder="kg, z. B. 82,5" value={kg} onChange={(e) => setKg(e.target.value)} aria-label="Gewicht in kg" />
        <Button type="submit" size="icon" disabled={busy} aria-label="Gewicht speichern">
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
        </Button>
      </form>
      {err && <p className="mt-3 rounded-2xl bg-blaze/10 px-4 py-3 text-sm text-blaze">{err}</p>}

      {!!rows?.length && (
        <ul className="mt-4 max-h-44 divide-y divide-white/[0.05] overflow-y-auto text-sm">
          {[...rows].reverse().slice(0, 30).map((r) => (
            <li key={r.day} className="flex items-center justify-between py-2">
              <span className="text-white/55">{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(r.day + 'T12:00:00'))}</span>
              <span className="flex items-center gap-3">
                <span className="num font-semibold">{nf(r.kg, 1)} kg</span>
                <button onClick={() => remove(r.day)} className="text-white/30 hover:text-blaze" aria-label="Eintrag löschen">
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
