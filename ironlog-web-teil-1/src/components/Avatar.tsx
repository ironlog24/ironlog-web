import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight, Palette, Sparkles } from 'lucide-react'
import { useData } from '@/state/store'
import { muscleDistribution } from '@/data/stats'
import { MUSCLE_LABEL, type Exercise, type MuscleGroup, type Workout } from '@/data/types'
import { SectionTitle, Seg } from '@/components/bits'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/data/api'

/**
 * IRONLOG-Avatar: eine Figur, die aussieht wie du (Typ, Hautton, Haare, Bart)
 * und mit jedem Training muskulöser wird.
 * - Gesamtwachstum: Anzahl abgeschlossener Trainings
 * - Proportionen: welche Muskelgruppen in den letzten 6 Wochen trainiert wurden
 */

const LEVELS = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150, 200, 260, 330, 420, 520]
const TITLES = ['Rookie', 'Anfänger', 'Regelmäßig', 'Eisenfresser', 'Athlet', 'Biest', 'Koloss', 'Titan', 'Legende', 'Halbgott', 'Gott des Eisens', 'Olymp', 'Mythos', 'Unsterblich', 'IRONLOG-Ikone']

export function avatarStats(total: number) {
  let lvl = 0
  while (lvl < LEVELS.length - 1 && total >= LEVELS[lvl + 1]) lvl++
  const cur = LEVELS[lvl]
  const next = LEVELS[lvl + 1] ?? cur
  return {
    level: lvl + 1,
    title: TITLES[Math.min(lvl, TITLES.length - 1)],
    progress: next > cur ? (total - cur) / (next - cur) : 1,
    toNext: Math.max(0, next - total),
    growth: Math.min(1, Math.sqrt(total / 260)),
  }
}

type Sizes = Record<MuscleGroup, number>

export function computeAvatar(workouts: Workout[], exercises: Exercise[]) {
  const total = workouts.filter((w) => w.ended_at).length
  const st = avatarStats(total)
  const dist = muscleDistribution(workouts, exercises, 42)
  const groups = Object.keys(dist) as MuscleGroup[]
  const sum = groups.reduce((a, g) => a + dist[g], 0)
  const avg = sum / groups.length
  const share = Object.fromEntries(groups.map((g) => [g, sum ? Math.min(1.5, Math.max(0.3, dist[g] / Math.max(1, avg))) : 1])) as Sizes
  const sizes = Object.fromEntries(groups.map((g) => [g, st.growth * share[g]])) as Sizes
  const weakest = sum >= 12 ? groups.reduce((a, g) => (dist[g] < dist[a] ? g : a), groups[0]) : null
  const weak = weakest && dist[weakest] < avg * 0.45 ? weakest : null
  return { ...st, total, sizes, weak }
}

export function useAvatar() {
  const { workouts, exercises } = useData()
  return useMemo(() => computeAvatar(workouts, exercises), [workouts, exercises])
}

/* ── Aussehen (pro Nutzer auf diesem Gerät gespeichert) ── */

export interface Look {
  body: 'm' | 'w'
  skin: number
  hair: 'kurz' | 'buzz' | 'lang' | 'glatze' | 'locken'
  hairColor: number
  beard: boolean
  /** Körperbau beim Start – jeder fängt anders an */
  build: 'schlank' | 'normal' | 'sportlich' | 'kraeftig'
}
export const SKINS = ['#F6D7C3', '#E8B894', '#C98E66', '#9A6342', '#6B4128', '#47291A']
export const HAIRS = ['#1A1410', '#4A2E1C', '#8A5A2B', '#D8B26E', '#B8B8B8', '#C6FF00']
export const DEFAULT_LOOK: Look = { body: 'm', skin: 2, hair: 'kurz', hairColor: 0, beard: false, build: 'normal' }

/** Aussehen laden/speichern: lokal + (falls eingerichtet) im Supabase-Profil, damit es auf allen Geräten gleich ist */
export function useLook() {
  const { user } = useData()
  const key = `ironlog.avatar.${user?.id ?? 'anon'}`
  const [look, setLook] = useState<Look>(DEFAULT_LOOK)
  const [state, setState] = useState<'loading' | 'set' | 'missing'>('loading')
  useEffect(() => {
    let alive = true
    let local: Look | null = null
    try {
      local = JSON.parse(localStorage.getItem(key) || 'null')
    } catch {
      local = null
    }
    if (local) {
      setLook({ ...DEFAULT_LOOK, ...local })
      setState('set')
    }
    if (supabase && user) {
      supabase
        .from('profiles')
        .select('avatar')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!alive) return
          const remote = !error && data?.avatar ? (data.avatar as Look) : null
          if (remote) {
            setLook({ ...DEFAULT_LOOK, ...remote })
            setState('set')
            try {
              localStorage.setItem(key, JSON.stringify(remote))
            } catch {
              /* noop */
            }
          } else if (!local) setState('missing')
        })
    } else if (!local) setState('missing')
    return () => {
      alive = false
    }
  }, [key, user])
  const save = (l: Look) => {
    setLook(l)
    setState('set')
    try {
      localStorage.setItem(key, JSON.stringify(l))
    } catch {
      /* noop */
    }
    if (supabase && user) supabase.from('profiles').update({ avatar: l }).eq('id', user.id).then(() => undefined)
  }
  return { look, save, state }
}

/* ── Zeichnung ── */

type P = [number, number]
/** Geschlossener, weicher Pfad durch Punkte (Catmull-Rom → Bézier) – gleiche Punktzahl = animierbar */
function smooth(pts: P[], closed = true, t = 0.5) {
  const n = pts.length
  const at = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3]
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return closed ? d + ' Z' : d
}
const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [200 - x, y])
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)))
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

const spring = { type: 'spring', stiffness: 70, damping: 16 } as const

const BUILD = {
  schlank: { m: -0.12, fat: -1 },
  normal: { m: 0, fat: 0 },
  sportlich: { m: 0.3, fat: 0 },
  kraeftig: { m: 0.12, fat: 1 },
} as const

export function AvatarFigure({ sizes, look = DEFAULT_LOOK, className }: { sizes: Sizes; look?: Look; className?: string }) {
  const b = BUILD[look.build ?? 'normal']
  const fat = b.fat // -1 schlank … +1 kräftig (Körperfett)
  const s = Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, Math.max(0, Math.min(1.5, v + b.m))])) as Sizes
  const g = Math.max(0, Math.max(s.brust, s.ruecken, s.schultern, s.arme, s.beine, s.core) - Math.max(0, fat) * 0.35) // Definition (Körperfett verdeckt Muskeln)
  const w = look.body === 'w'
  const skin = SKINS[look.skin] ?? SKINS[2]
  const skinDark = shade(skin, 0.78)
  const skinLight = shade(skin, 1.08)
  const hairC = HAIRS[look.hairColor] ?? HAIRS[0]

  // Maße (halbe Breiten ab Mitte x=100)
  const neck = (w ? 6 : 7.5) + s.schultern * 2.5
  const shoulder = (w ? 28 : 31) + s.schultern * 9 + s.ruecken * 5
  const armpit = (w ? 21 : 23) + s.ruecken * 7 + s.brust * 2
  const chest = (w ? 21 : 22.5) + s.brust * 4 + s.ruecken * 3 + fat * 2
  const waist = (w ? 15 : 18) + s.core * 2 + fat * (fat > 0 ? 8 : 1.5)
  const hip = (w ? 24 : 21) + s.beine * 2 + fat * (fat > 0 ? 4 : 1)
  const thigh = (w ? 14 : 13) + s.beine * 6 + fat * 1.5
  const calf = 7.5 + s.beine * 4
  const bi = 6 + s.arme * 5.5 + fat * 1.5
  const fore = 5 + s.arme * 3.5 + fat * 0.8
  const armX = shoulder + 1 + s.arme * 2

  const R = (pts: P[]) => [...pts, ...mirror(pts).reverse()]

  // Rumpf (rechte Hälfte von oben nach unten, dann gespiegelt zurück)
  const torso = smooth(
    R([
      [100, 57],
      [100 + neck, 57],
      [100 + shoulder - 9, 63 - s.schultern * 2],
      [100 + shoulder - 2, 70],
      [100 + armpit, 86],
      [100 + chest, 102],
      [100 + waist + 2, 126],
      [100 + waist, 142],
      [100 + hip, 162],
      [100 + 4, 174],
    ]).filter((_, i, a) => !(i === a.length - 1)),
  )
  const leg = (sgn: 1 | -1) =>
    smooth(
      (
        [
          [100 + sgn * 2, 170],
          [100 + sgn * (hip + 1), 164],
          [100 + sgn * (thigh * 2 - 2), 196],
          [100 + sgn * (thigh + 12), 226],
          [100 + sgn * (calf + 15), 250],
          [100 + sgn * 16, 284],
          [100 + sgn * 7, 286],
          [100 + sgn * (6 - calf * 0.2), 256],
          [100 + sgn * 4.5, 230],
          [100 + sgn * 2.5, 200],
        ] as P[]
      ),
    )
  const arm = (sgn: 1 | -1) =>
    smooth(
      (
        [
          [100 + sgn * (shoulder - 6), 66],
          [100 + sgn * (armX + bi * 0.55), 84],
          [100 + sgn * (armX + bi * 0.7), 104],
          [100 + sgn * (armX + 4), 124],
          [100 + sgn * (armX + 3 + fore * 0.8), 140],
          [100 + sgn * (armX + 4), 160],
          [100 + sgn * (armX - 3), 160],
          [100 + sgn * (armX - fore * 0.9 - 1), 140],
          [100 + sgn * (armX - 5), 124],
          [100 + sgn * (armX - bi * 0.75), 102],
          [100 + sgn * (armpit + 1), 88],
        ] as P[]
      ),
    )

  const def = 0.18 + g * 0.55 // Sichtbarkeit der Muskel-Linien
  const line = { stroke: skinDark, strokeWidth: 1.3, fill: 'none', strokeLinecap: 'round' as const }
  const A = (d: string, extra: Record<string, unknown> = {}) => <motion.path animate={{ d }} initial={false} transition={spring} {...extra} />

  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label="Dein Avatar">
      <defs>
        <radialGradient id="av-skin" cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor={skinLight} />
          <stop offset="100%" stopColor={skin} />
        </radialGradient>
        <linearGradient id="av-shorts" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
        <filter id="av-glow" x="-40%" y="-20%" width="180%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#C6FF00" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#av-glow)" stroke={skinDark} strokeWidth="0.8">
        {/* Arme hinten */}
        {A(arm(1), { fill: 'url(#av-skin)' })}
        {A(arm(-1), { fill: 'url(#av-skin)' })}
        {/* Hände */}
        <motion.circle animate={{ cx: 100 + armX + 0.5, cy: 165 }} initial={false} transition={spring} r={5.5} fill="url(#av-skin)" />
        <motion.circle animate={{ cx: 100 - armX - 0.5, cy: 165 }} initial={false} transition={spring} r={5.5} fill="url(#av-skin)" />
        {/* Beine */}
        {A(leg(1), { fill: 'url(#av-skin)' })}
        {A(leg(-1), { fill: 'url(#av-skin)' })}
        {/* Schuhe */}
        {[1, -1].map((d) => (
          <path key={d} d={`M ${100 + d * 7} 283 Q ${100 + d * 12} 279 ${100 + d * 17} 283 L ${100 + d * 19} 292 Q ${100 + d * 12} 295 ${100 + d * 6} 292 Z`} fill="#111" stroke="#C6FF00" strokeWidth="0.9" />
        ))}
        {/* Rumpf + Hals */}
        <rect x={100 - neck + 1} y={44} width={(neck - 1) * 2} height={16} rx={4} fill="url(#av-skin)" />
        {A(torso, { fill: 'url(#av-skin)' })}
      </g>

      {/* Muskel-Definition */}
      <g opacity={def}>
        {/* Brust */}
        {A(`M ${100 - chest + 4} 100 Q ${100 - chest / 2} ${106 + s.brust * 3} 100 101 Q ${100 + chest / 2} ${106 + s.brust * 3} ${100 + chest - 4} 100`, line)}
        {A(`M 100 74 L 100 101`, { ...line, strokeWidth: 1 })}
        {/* Schultern */}
        {A(`M ${100 - shoulder + 3} 72 Q ${100 - shoulder + 10} ${86 + s.schultern * 2} ${100 - armpit + 3} 90`, line)}
        {A(`M ${100 + shoulder - 3} 72 Q ${100 + shoulder - 10} ${86 + s.schultern * 2} ${100 + armpit - 3} 90`, line)}
        {/* Bauch */}
        {!w || g > 0.4 ? (
          <>
            {A(`M 100 110 L 100 ${150}`, line)}
            {[118, 129, 140].map((y) => A(`M ${100 - waist + 5} ${y} Q 100 ${y + 2} ${100 + waist - 5} ${y}`, { ...line, key: y, strokeWidth: 1 }))}
          </>
        ) : null}
        {/* Bizeps / Quads */}
        {A(`M ${100 + armX - 2} 92 Q ${100 + armX + bi * 0.4} 106 ${100 + armX} 120`, line)}
        {A(`M ${100 - armX + 2} 92 Q ${100 - armX - bi * 0.4} 106 ${100 - armX} 120`, line)}
        {A(`M ${100 + thigh + 4} 184 Q ${100 + thigh + 1} 206 ${100 + 11} 226`, line)}
        {A(`M ${100 - thigh - 4} 184 Q ${100 - thigh - 1} 206 ${100 - 11} 226`, line)}
      </g>

      {/* Kleidung */}
      {A(
        smooth([
          [100 - hip - 1, 154], [100, 157], [100 + hip + 1, 154],
          [100 + hip + 3, 172], [100 + thigh * 2 - 1, 198], [100 + 4, 200], [100, 186],
          [100 - 4, 200], [100 - thigh * 2 + 1, 198], [100 - hip - 3, 172],
        ]),
        { fill: 'url(#av-shorts)', stroke: '#C6FF00', strokeWidth: 1.1 },
      )}
      {w &&
        A(
          `M ${100 - chest + 3} 84 Q 100 ${92} ${100 + chest - 3} 84 Q ${100 + chest + 1} 96 ${100 + chest - 1} 108 Q 100 ${112 + s.brust * 2} ${100 - chest + 1} 108 Q ${100 - chest - 1} 96 ${100 - chest + 3} 84 Z`,
          { fill: '#141414', stroke: '#C6FF00', strokeWidth: 1.1 },
        )}

      {/* Kopf */}
      <g>
        <ellipse cx="100" cy="30" rx="13" ry="16" fill="url(#av-skin)" stroke={skinDark} strokeWidth="0.8" />
        <ellipse cx="87.5" cy="31" rx="2.2" ry="3.5" fill={skin} stroke={skinDark} strokeWidth="0.6" />
        <ellipse cx="112.5" cy="31" rx="2.2" ry="3.5" fill={skin} stroke={skinDark} strokeWidth="0.6" />
        {/* Gesicht */}
        <ellipse cx="95" cy="30" rx="1.5" ry="1.7" fill="#161616" />
        <ellipse cx="105" cy="30" rx="1.5" ry="1.7" fill="#161616" />
        <path d="M 92 26 Q 95 24.5 97.5 25.6 M 102.5 25.6 Q 105 24.5 108 26" stroke={look.hair === 'glatze' ? skinDark : hairC} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M 100 31 Q 101.5 35 99.5 35.5" stroke={skinDark} strokeWidth="0.9" fill="none" strokeLinecap="round" />
        <path d="M 96 39 Q 100 41.5 104 39" stroke={shade(skin, 0.6)} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {look.beard && <path d="M 87.5 32 Q 88 46 100 47.5 Q 112 46 112.5 32 Q 110 41 104 40.5 Q 100 43 96 40.5 Q 90 41 87.5 32 Z" fill={hairC} opacity="0.92" />}
        {/* Haare */}
        {look.hair === 'kurz' && <path d="M 86.5 28 Q 85 13 100 12 Q 115 13 113.5 28 Q 111 19 104 19.5 Q 96 17 91 21 Q 88 23 86.5 28 Z" fill={hairC} />}
        {look.hair === 'buzz' && <path d="M 87 25 Q 87 13.5 100 13 Q 113 13.5 113 25 Q 108 18.5 100 18.5 Q 92 18.5 87 25 Z" fill={hairC} opacity="0.85" />}
        {look.hair === 'locken' && (
          <g fill={hairC}>
            {[[89, 20], [95, 15], [101, 14], [107, 16], [111, 21], [86.5, 26], [113.5, 26], [92, 18], [104, 13.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.2} />)}
          </g>
        )}
        {look.hair === 'lang' && (
          <path d="M 86 30 Q 84 12 100 11.5 Q 116 12 114 30 L 116 52 Q 113 56 110 50 L 111 27 Q 108 18 100 18 Q 92 18 89 27 L 90 50 Q 87 56 84 52 Z" fill={hairC} />
        )}
      </g>
    </svg>
  )
}

/* ── Anpassen-Dialog ── */

export function LookEditor({ look, onChange }: { look: Look; onChange: (l: Look) => void }) {
  const Sw = ({ colors, value, onPick, label }: { colors: string[]; value: number; onPick: (i: number) => void; label: string }) => (
    <div>
      <div className="label mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button key={c} onClick={() => onPick(i)} aria-label={`${label} ${i + 1}`} className={cn('h-9 w-9 rounded-full border-2 transition', value === i ? 'scale-110 border-lime shadow-glow-sm' : 'border-white/10')} style={{ background: c }} />
        ))}
      </div>
    </div>
  )
  return (
    <div className="space-y-5">
      <div>
        <div className="label mb-2">Typ</div>
        <Seg value={look.body} onChange={(v) => onChange({ ...look, body: v })} options={[{ v: 'm', l: 'Mann' }, { v: 'w', l: 'Frau' }]} />
      </div>
      <div>
        <div className="label mb-2">Körperbau beim Start</div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['schlank', 'Schlank', 'wenig Muskeln, wenig Fett'],
              ['normal', 'Normal', 'Durchschnitt'],
              ['sportlich', 'Sportlich', 'schon etwas trainiert'],
              ['kraeftig', 'Kräftig', 'breiter, mehr Körperfett'],
            ] as const
          ).map(([v, l, d]) => (
            <button key={v} onClick={() => onChange({ ...look, build: v })} className={cn('rounded-2xl border p-3 text-left transition', look.build === v ? 'border-lime bg-lime/10' : 'border-white/10 bg-white/[0.03]')}>
              <div className={cn('text-sm font-bold', look.build === v && 'text-lime')}>{l}</div>
              <div className="text-[11px] text-white/45">{d}</div>
            </button>
          ))}
        </div>
      </div>
      <Sw label="Hautton" colors={SKINS} value={look.skin} onPick={(i) => onChange({ ...look, skin: i })} />
      <div>
        <div className="label mb-2">Frisur</div>
        <div className="flex flex-wrap gap-2">
          {(['kurz', 'buzz', 'locken', 'lang', 'glatze'] as const).map((h) => (
            <button key={h} onClick={() => onChange({ ...look, hair: h })} className={cn('chip capitalize', look.hair === h && '!border-lime !bg-lime !text-ink')}>
              {h === 'buzz' ? 'Kurz rasiert' : h === 'glatze' ? 'Glatze' : h === 'locken' ? 'Locken' : h === 'lang' ? 'Lang' : 'Kurz'}
            </button>
          ))}
        </div>
      </div>
      {look.hair !== 'glatze' || look.beard ? <Sw label="Haarfarbe" colors={HAIRS} value={look.hairColor} onPick={(i) => onChange({ ...look, hairColor: i })} /> : null}
      <div>
        <div className="label mb-2">Bart</div>
        <Seg value={look.beard ? 'ja' : 'nein'} onChange={(v) => onChange({ ...look, beard: v === 'ja' })} options={[{ v: 'nein', l: 'Ohne' }, { v: 'ja', l: 'Mit Bart' }]} />
      </div>
    </div>
  )
}

/* ── Dashboard-Karte ── */

export function AvatarCard() {
  const a = useAvatar()
  const { look, save: setLook } = useLook()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(look)
  useEffect(() => setDraft(look), [look])

  return (
    <section>
      <SectionTitle
        action={
          <button onClick={() => setEdit(true)} className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-lime" aria-label="Avatar anpassen">
            <Palette size={14} /> Anpassen
          </button>
        }
      >
        Dein Avatar
      </SectionTitle>
      <div className="card relative grid grid-cols-[130px_1fr] items-center gap-4 overflow-hidden p-4 md:grid-cols-[170px_1fr]" data-testid="avatar-card">
        <div className="absolute -left-10 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-lime/10 blur-3xl" />
        <AvatarFigure sizes={a.sizes} look={look} className="relative h-52 w-full md:h-64" />
        <div className="relative min-w-0">
          <div className="label !text-lime/90 flex items-center gap-1.5"><Sparkles size={12} /> Level {a.level}</div>
          <div className="h-display mt-1 text-4xl leading-none">{a.title}</div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(a.progress * 100)}%` }} transition={{ duration: 0.9 }} className="h-full rounded-full bg-lime shadow-glow-sm" />
          </div>
          <p className="mt-2 text-xs text-white/55">
            {a.total === 0
              ? 'Dein Avatar wird mit jedem Training muskulöser. Leg los!'
              : a.toNext > 0
                ? `${a.total} Trainings · noch ${a.toNext} bis Level ${a.level + 1}`
                : `${a.total} Trainings · Max-Level erreicht 👑`}
          </p>
          {a.weak && (
            <p className="mt-2 rounded-xl bg-blaze/10 px-3 py-2 text-xs font-semibold text-blaze">
              {a.weak === 'beine' ? 'Skip Leg Day? 🍗 Deine Beine schrumpfen.' : `${MUSCLE_LABEL[a.weak]} kommt zu kurz – dein Avatar sieht's.`}
            </p>
          )}
          <Link to="/training" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-lime">
            Training starten <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title="Avatar anpassen">
          <div className="grid gap-5 md:grid-cols-[160px_1fr]">
            <div className="mx-auto h-56 w-40 rounded-2xl bg-white/[0.03]">
              <AvatarFigure sizes={a.sizes} look={draft} className="h-full w-full" />
            </div>
            <LookEditor look={draft} onChange={setDraft} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="soft" onClick={() => setEdit(false)}>Abbrechen</Button>
            <Button onClick={() => { setLook(draft); setEdit(false) }}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/* ── Avatar erstellen nach dem ersten Login ── */

export function AvatarOnboarding() {
  const a = useAvatar()
  const { save, state } = useLook()
  const { user } = useData()
  const skipKey = `ironlog.avatar.skip.${user?.id ?? 'anon'}`
  const [draft, setDraft] = useState<Look>(DEFAULT_LOOK)
  const [skipped, setSkipped] = useState(() => {
    try {
      return localStorage.getItem(skipKey) === '1'
    } catch {
      return false
    }
  })
  const open = state === 'missing' && !skipped
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSkipped(true)
          try {
            localStorage.setItem(skipKey, '1')
          } catch {
            /* noop */
          }
        }
      }}
    >
      <DialogContent title="Erstelle deinen Avatar">
        <p className="-mt-2 mb-4 text-sm text-white/55">Jeder startet anders. Dein Avatar zeigt, wo du anfängst – und wird mit jedem Training stärker.</p>
        <div className="grid gap-5 md:grid-cols-[170px_1fr]">
          <div className="mx-auto h-60 w-40 rounded-2xl bg-white/[0.03] md:sticky md:top-0">
            <AvatarFigure sizes={a.sizes} look={draft} className="h-full w-full" />
          </div>
          <LookEditor look={draft} onChange={setDraft} />
        </div>
        <Button className="mt-5 w-full" onClick={() => save(draft)}>
          <Sparkles size={16} /> Los geht's
        </Button>
        <p className="mt-2 text-center text-xs text-white/40">Ändern kannst du alles später auf dem Dashboard unter „Anpassen“.</p>
      </DialogContent>
    </Dialog>
  )
}

/* ── Fortschritt nach einem Training (Recap) ── */

export function AvatarProgress({ workoutId }: { workoutId: string }) {
  const { workouts, exercises } = useData()
  const { look } = useLook()
  const d = useMemo(() => {
    const before = computeAvatar(workouts.filter((w) => w.id !== workoutId), exercises)
    const after = computeAvatar(workouts, exercises)
    // nur Muskelgruppen, die in diesem Training wirklich dran waren
    const w = workouts.find((x) => x.id === workoutId)
    const trained = new Set(w?.exercises.filter((e) => e.sets.some((st) => st.done)).map((e) => exercises.find((x) => x.id === e.exercise_id)?.muscle_group))
    const gains = (Object.keys(after.sizes) as MuscleGroup[])
      .filter((g) => trained.has(g))
      .map((g) => ({ g, v: Math.round((after.sizes[g] - before.sizes[g]) * 1000) / 10 }))
      .filter((x) => x.v > 0.05)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
    return { before, after, gains, levelUp: after.level > before.level }
  }, [workouts, exercises, workoutId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className={cn('card mt-4 overflow-hidden p-4', d.levelUp && 'border-lime/50 shadow-glow-sm')}
      data-testid="avatar-progress"
    >
      <div className="label !text-lime/90 mb-2 flex items-center gap-1.5">
        <Sparkles size={12} /> {d.levelUp ? `Level-Up! Jetzt Level ${d.after.level}` : 'Dein Avatar ist gewachsen'}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-center">
          <AvatarFigure sizes={d.before.sizes} look={look} className="mx-auto h-36 w-full opacity-60" />
          <div className="text-[10px] uppercase tracking-wider text-white/40">vorher</div>
        </div>
        <ChevronRight className="text-lime" />
        <div className="text-center">
          <AvatarFigure sizes={d.after.sizes} look={look} className="mx-auto h-36 w-full" />
          <div className="text-[10px] uppercase tracking-wider text-lime">jetzt</div>
        </div>
      </div>
      {d.levelUp && <div className="h-display mt-2 text-center text-3xl text-lime">{d.after.title}</div>}
      {d.gains.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {d.gains.map((x) => (
            <span key={x.g} className="rounded-full bg-lime/10 px-3 py-1 text-xs font-bold text-lime">
              {MUSCLE_LABEL[x.g]} +{x.v.toLocaleString('de-DE')} %
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-white/50">Jedes Training zählt – weiter so!</p>
      )}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          initial={{ width: `${Math.round((d.levelUp ? 0 : d.before.progress) * 100)}%` }}
          animate={{ width: `${Math.round(d.after.progress * 100)}%` }}
          transition={{ delay: 1.3, duration: 1 }}
          className="h-full rounded-full bg-lime"
        />
      </div>
      <p className="mt-1.5 text-center text-[11px] text-white/45">
        {d.after.toNext > 0 ? `Noch ${d.after.toNext} ${d.after.toNext === 1 ? 'Training' : 'Trainings'} bis Level ${d.after.level + 1}` : 'Max-Level erreicht 👑'}
      </p>
    </motion.div>
  )
}
