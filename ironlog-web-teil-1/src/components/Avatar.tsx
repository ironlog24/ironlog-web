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

/* ── Zeichnung: 3D-Spielfigur (Chibi-Stil) ── */

type P = [number, number]
/** Weicher, geschlossener Pfad durch Punkte (Catmull-Rom → Bézier) – gleiche Punktzahl = animierbar */
function smooth(pts: P[], t = 0.5) {
  const n = pts.length
  const at = (i: number) => pts[(i + n) % n]
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3]
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + ' Z'
}
const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [200 - x, y])
const sym = (pts: P[]) => [...pts, ...mirror(pts).reverse()]
const f1 = (n: number) => n.toFixed(1)
/** Kapsel zwischen zwei Punkten mit zwei Radien (Arm/Bein-Segment) */
function limb(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
  const dx = x2 - x1, dy = y2 - y1
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, k = 1.33
  const a1: P = [x1 + nx * r1, y1 + ny * r1], b1: P = [x1 - nx * r1, y1 - ny * r1]
  const a2: P = [x2 + nx * r2, y2 + ny * r2], b2: P = [x2 - nx * r2, y2 - ny * r2]
  return `M ${f1(a1[0])} ${f1(a1[1])} L ${f1(a2[0])} ${f1(a2[1])} C ${f1(a2[0] + ux * k * r2)} ${f1(a2[1] + uy * k * r2)} ${f1(b2[0] + ux * k * r2)} ${f1(b2[1] + uy * k * r2)} ${f1(b2[0])} ${f1(b2[1])} L ${f1(b1[0])} ${f1(b1[1])} C ${f1(b1[0] - ux * k * r1)} ${f1(b1[1] - uy * k * r1)} ${f1(a1[0] - ux * k * r1)} ${f1(a1[1] - uy * k * r1)} ${f1(a1[0])} ${f1(a1[1])} Z`
}
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (s: number) => {
    const v = (n >> s) & 255
    return Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)))
  }
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

const spring = { type: 'spring', stiffness: 70, damping: 16 } as const

const BUILD = {
  schlank: { m: -0.12, fat: -1 },
  normal: { m: 0, fat: 0 },
  sportlich: { m: 0.3, fat: 0 },
  kraeftig: { m: 0.12, fat: 1 },
} as const

let figCount = 0

export function AvatarFigure({ sizes, look = DEFAULT_LOOK, className }: { sizes: Sizes; look?: Look; className?: string }) {
  const [uid] = useState(() => `av${++figCount}`)
  const id = (n: string) => `${uid}-${n}`
  const u = (n: string) => `url(#${id(n)})`
  const b = BUILD[look.build ?? 'normal']
  const fat = b.fat
  const s = Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, Math.max(0, Math.min(1.5, v + b.m))])) as Sizes
  const g = Math.max(0, Math.max(s.brust, s.ruecken, s.schultern, s.arme, s.beine, s.core) - Math.max(0, fat) * 0.35)
  const w = look.body === 'w'
  const skin = SKINS[look.skin] ?? SKINS[2]
  const skinDark = shade(skin, 0.7)
  const skinLine = shade(skin, 0.58)
  const hairC = HAIRS[look.hairColor] ?? HAIRS[0]
  const browC = look.hairColor === 5 ? '#2a2a2a' : look.hair === 'glatze' ? shade(hairC === '#B8B8B8' ? '#555555' : hairC, 1) : hairC

  // ── Maße (halbe Breiten ab Mitte x = 100)
  const sh = (w ? 26 : 33) + s.schultern * 9 + s.ruecken * 4
  const dr = (w ? 8 : 11) + s.schultern * 5.5
  const lat = (w ? 21 : 26) + s.ruecken * 9 + s.brust * 2 + fat * 2
  const waist = (w ? 15.5 : 21) + s.core * 1.5 + fat * (fat > 0 ? 9 : 1.5)
  const hip = (w ? 29 : 24) + fat * 3 + s.beine * 2
  const th = (w ? 16.5 : 14) + s.beine * 6 + fat * 2
  const calf = (w ? 8 : 8.5) + s.beine * 3.5
  const ua = (w ? 8 : 10) + s.arme * 4 + fat * 1.2
  const fa = (w ? 7 : 8) + s.arme * 2.5 + fat * 0.6
  const neckW = (w ? 9 : 11) + s.schultern * 3

  const J = (d: 1 | -1): P => [100 + d * (sh - 2), 124]
  const E = (d: 1 | -1): P => [100 + d * (sh + 11 + s.arme * 4 + fat * 2), 160]
  const F = (d: 1 | -1): P => [100 + d * (waist + 17 + s.arme * 2), 194]
  const K = (d: 1 | -1): P => [100 + d * (hip + 3), 250]
  const A = (d: 1 | -1): P => [100 + d * (hip + 7), 280]

  const torso = smooth(sym([[100, 106], [100 + neckW, 106], [100 + sh - 10, 112 - s.schultern * 2], [100 + sh - 3, 120], [100 + lat, 138], [100 + lat - 1, 154], [100 + waist + 1, 178], [100 + hip, 196]]).slice(0, -1))
  const topEnd = w ? 162 : 196
  const tank = smooth(
    sym([
      [100, 128 - (w ? 4 : 0)],
      [100 + 9, 112],
      [100 + 17, 110],
      [100 + lat - 6, 134],
      [100 + lat - 1, 148],
      [100 + (w ? lat - 4 : waist + 1.5), w ? 160 : 178],
      [100 + (w ? lat - 8 : hip + 1), topEnd],
      [100, topEnd + 2],
    ]).slice(0, -1),
  )
  const pants = smooth(
    sym([
      [100, 186],
      [100 + hip + 1, 184],
      [100 + hip + 5, 202],
      [100 + hip + 3 + th * 0.4, 230],
      [100 + hip + 3 + th * 0.55, 256],
      [100 + hip - 3, 262],
      [100 + 9, 232],
      [100 + 3, 212],
    ]).slice(0, -1),
  )
  const head = smooth(
    w
      ? [[100, 25], [123, 31], [133, 54], [131, 75], [119, 92], [100, 99], [81, 92], [69, 75], [67, 54], [77, 31]]
      : [[100, 24], [124, 31], [134, 55], [131, 77], [120, 93], [100, 100], [80, 93], [69, 77], [66, 55], [76, 31]],
  )

  const def = Math.min(1, 0.1 + g * 0.6)
  const line = { stroke: skinLine, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' as const }
  const MP = ({ d, ...rest }: { d: string } & Record<string, unknown>) => <motion.path animate={{ d }} initial={false} transition={spring} {...rest} />
  const MC = ({ c, r, ...rest }: { c: P; r: number } & Record<string, unknown>) => <motion.circle animate={{ cx: c[0], cy: c[1], r }} initial={false} transition={spring} {...rest} />

  const eye = (x: number) => (
    <g>
      <ellipse cx={x} cy={65} rx={w ? 7.6 : 7.2} ry={w ? 8.6 : 8} fill="#fff" />
      <circle cx={x + 0.4} cy={66} r={5.4} fill={u('iris')} />
      <circle cx={x + 0.4} cy={66} r={2.6} fill="#0b0b0b" />
      <circle cx={x - 1.6} cy={63.4} r={1.7} fill="#fff" />
      <circle cx={x + 2.2} cy={68.2} r={0.8} fill="#fff" opacity="0.8" />
      <path d={`M ${x - 7.8} 63 Q ${x} 55.5 ${x + 7.8} 63`} stroke="#1a1a1a" strokeWidth={w ? 2.2 : 1.7} fill="none" strokeLinecap="round" />
      {w && <path d={`M ${x + (x < 100 ? -7.4 : 7.4)} 62.4 l ${x < 100 ? -2.6 : 2.6} -2`} stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />}
    </g>
  )

  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label="Dein Avatar">
      <defs>
        <radialGradient id={id('skin')} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={shade(skin, 1.18)} />
          <stop offset="55%" stopColor={skin} />
          <stop offset="100%" stopColor={skinDark} />
        </radialGradient>
        <radialGradient id={id('limb')} cx="38%" cy="32%" r="90%">
          <stop offset="0%" stopColor={shade(skin, 1.14)} />
          <stop offset="60%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, 0.84)} />
        </radialGradient>
        <radialGradient id={id('face')} cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor={shade(skin, 1.15)} />
          <stop offset="70%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, 0.78)} />
        </radialGradient>
        <radialGradient id={id('hair')} cx="38%" cy="20%" r="85%">
          <stop offset="0%" stopColor={shade(hairC, 1.35)} />
          <stop offset="60%" stopColor={hairC} />
          <stop offset="100%" stopColor={shade(hairC, 0.6)} />
        </radialGradient>
        <radialGradient id={id('iris')} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#8a5a33" />
          <stop offset="100%" stopColor="#3b2414" />
        </radialGradient>
        <linearGradient id={id('tank')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a4f57" />
          <stop offset="55%" stopColor="#2c3036" />
          <stop offset="100%" stopColor="#1a1d21" />
        </linearGradient>
        <linearGradient id={id('pants')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#30343b" />
          <stop offset="100%" stopColor="#121417" />
        </linearGradient>
        <linearGradient id={id('shoe')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f8" />
          <stop offset="100%" stopColor="#b9c0c8" />
        </linearGradient>
        <filter id={id('glow')} x="-30%" y="-20%" width="160%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#C6FF00" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Bodenschatten */}
      <motion.ellipse animate={{ rx: 46 + hip * 0.6 }} initial={false} transition={spring} cx="100" cy="292" ry="6" fill="#000" opacity="0.45" />

      <g filter={u('glow')}>
        {/* lange Haare hinten */}
        {look.hair === 'lang' && <path d="M 66 52 Q 60 100 66 138 Q 84 146 100 140 Q 116 146 134 138 Q 140 100 134 52 Z" fill={u('hair')} />}

        {/* Waden + Schuhe */}
        {([1, -1] as const).map((d) => (
          <g key={`leg${d}`}>
            <MP d={limb(...K(d), calf, ...A(d), calf * 0.72)} fill={u('limb')} />
            <MP d={`M ${f1(A(d)[0] - d * 9)} 279 Q ${f1(A(d)[0])} 272 ${f1(A(d)[0] + d * 10)} 280 Q ${f1(A(d)[0] + d * 17)} 284 ${f1(A(d)[0] + d * 16)} 291 L ${f1(A(d)[0] - d * 11)} 291 Q ${f1(A(d)[0] - d * 12)} 284 ${f1(A(d)[0] - d * 9)} 279 Z`} fill={u('shoe')} stroke="#8d96a0" strokeWidth="0.6" />
            <MP d={`M ${f1(A(d)[0] - d * 11)} 288.5 L ${f1(A(d)[0] + d * 16)} 288.5`} stroke="#C6FF00" strokeWidth="2" strokeLinecap="round" />
            <MP d={`M ${f1(A(d)[0] - d * 3)} 279 l ${d * 6} 3 m ${-d * 7} 1 l ${d * 6} 3`} stroke="#8d96a0" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          </g>
        ))}

        {/* Hose (3/4-Tights) */}
        <MP d={pants} fill={u('pants')} />
        {([1, -1] as const).map((d) => (
          <MP key={`st${d}`} d={`M ${f1(100 + d * (hip + 2))} 190 Q ${f1(100 + d * (hip + 4 + th * 0.4))} 226 ${f1(100 + d * (hip + 2 + th * 0.5))} 256`} stroke="#C6FF00" strokeWidth="1.4" fill="none" opacity="0.85" />
        ))}
        <g opacity={0.25 + def * 0.4}>
          {([1, -1] as const).map((d) => (
            <MP key={`q${d}`} d={`M ${f1(100 + d * (hip - 6))} 206 Q ${f1(100 + d * (hip - 2 - s.beine * 2))} 228 ${f1(100 + d * (hip - 4))} 248`} stroke="#0a0b0d" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          ))}
        </g>

        {/* Arme */}
        {([1, -1] as const).map((d) => (
          <g key={`arm${d}`}>
            <MP d={limb(...J(d), ua, ...E(d), ua * 0.78)} fill={u('limb')} />
            <MP d={limb(...E(d), fa, ...F(d), fa * 0.8)} fill={u('limb')} />
            <MP d={`M ${f1(J(d)[0] + d * 2)} ${f1(J(d)[1] + 12)} Q ${f1((J(d)[0] + E(d)[0]) / 2 + d * (ua * 0.15))} ${f1(144 + s.arme * 3)} ${f1(E(d)[0] - d * ua * 0.4)} ${f1(E(d)[1] - 4)}`} {...line} opacity={def * 0.8} />
          </g>
        ))}

        {/* Rumpf */}
        <rect x={100 - neckW + 1} y={88} width={(neckW - 1) * 2} height={24} rx={6} fill={u('skin')} />
        <MP d={torso} fill={u('skin')} />
        {w && (
          <g opacity={def * 0.75}>
            <MP d={`M 100 166 L 100 ${f1(184)}`} {...line} />
            {[170, 178].map((y) => (
              <MP key={y} d={`M ${f1(100 - waist + 6)} ${y} Q 100 ${y + 2} ${f1(100 + waist - 6)} ${y}`} {...line} strokeWidth={1.1} />
            ))}
          </g>
        )}
        <MP d={tank} fill={u('tank')} />
        <MP d={smooth(sym([[100, 128 - (w ? 4 : 0)], [100 + 9, 112], [100 + 17, 110]]).slice(0, -1))} fill="none" />
        <MP d={`M ${f1(100 - 17)} 110.5 Q 100 ${w ? 136 : 140} ${f1(100 + 17)} 110.5`} stroke="#C6FF00" strokeWidth="1.6" fill="none" opacity="0.9" />
        {w && (
          <g>
            <MP d={`M ${f1(100 - lat + 6)} 140 Q ${f1(100 - lat / 2)} 160 98 150`} stroke="#0e1013" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
            <MP d={`M ${f1(100 + lat - 6)} 140 Q ${f1(100 + lat / 2)} 160 102 150`} stroke="#0e1013" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
            <ellipse cx="88" cy="140" rx="6" ry="4" fill="#fff" opacity="0.07" />
            <ellipse cx="112" cy="140" rx="6" ry="4" fill="#fff" opacity="0.07" />
          </g>
        )}
        {/* Muskeln unter dem Shirt */}
        <g opacity={0.06 + def * 0.6}>
          {!w && <MP d={`M ${f1(100 - lat + 7)} 148 Q ${f1(100 - lat / 2)} ${f1(154 + s.brust * 5)} 100 147 Q ${f1(100 + lat / 2)} ${f1(154 + s.brust * 5)} ${f1(100 + lat - 7)} 148`} stroke="#0e1013" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
          {!w && (
            <>
              <MP d={`M 100 152 L 100 188`} stroke="#0e1013" strokeWidth="1.2" fill="none" />
              {[162, 172, 181].map((y) => (
                <MP key={y} d={`M ${f1(100 - waist + 7)} ${y} Q 100 ${y + 2.5} ${f1(100 + waist - 7)} ${y}`} stroke="#0e1013" strokeWidth="1.1" fill="none" opacity={fat > 0 ? 0.3 : 1} />
              ))}
            </>
          )}
        </g>
        {fat > 0 && <MP d={`M ${f1(100 - waist + 2)} 172 Q 100 ${192} ${f1(100 + waist - 2)} 172`} stroke="#0e1013" strokeWidth="1.2" fill="none" opacity="0.4" />}

        {/* Schultern (Deltas) */}
        {([1, -1] as const).map((d) => (
          <g key={`dl${d}`}>
            <MP d={limb(J(d)[0] - d * 5, J(d)[1] - 5, dr * 0.85, J(d)[0] + d * 2, J(d)[1] + 5, dr * 0.92)} fill={u('limb')} />
            <MP d={`M ${f1(J(d)[0] - d * dr * 0.55)} ${f1(J(d)[1] + dr * 0.55)} Q ${f1(J(d)[0] + d * dr * 0.2)} ${f1(J(d)[1] + dr * 1.1)} ${f1(J(d)[0] + d * dr * 0.9)} ${f1(J(d)[1] + dr * 0.3)}`} {...line} opacity={def * 0.9} />
          </g>
        ))}

        {/* Fäuste + Schweißbänder */}
        {([1, -1] as const).map((d) => {
          const f = F(d), e = E(d)
          const dx = f[0] - e[0], dy = f[1] - e[1], L = Math.hypot(dx, dy)
          const w1: P = [f[0] - (dx / L) * 9, f[1] - (dy / L) * 9]
          const w2: P = [f[0] - (dx / L) * 3, f[1] - (dy / L) * 3]
          return (
            <g key={`h${d}`}>
              <MP d={limb(...w1, fa * 0.86, ...w2, fa * 0.84)} fill="#C6FF00" />
              <MC c={[f[0] + d * 0.5, f[1] + 5]} r={7.5 + s.arme * 1.5} fill={u('limb')} />
              <MP d={`M ${f1(f[0] - 5)} ${f1(f[1] + 3)} Q ${f1(f[0])} ${f1(f[1] + 6)} ${f1(f[0] + 5)} ${f1(f[1] + 3)}`} {...line} strokeWidth={1} opacity="0.6" />
            </g>
          )
        })}

        {/* Kopf */}
        <ellipse cx="67" cy="66" rx="6" ry="9" fill={u('skin')} />
        <ellipse cx="133" cy="66" rx="6" ry="9" fill={u('skin')} />
        <path d={head} fill={u('face')} />
      </g>

      {/* Gesicht */}
      <ellipse cx="80" cy="80" rx="6" ry="3.5" fill="#ff7a6b" opacity="0.16" />
      <ellipse cx="120" cy="80" rx="6" ry="3.5" fill="#ff7a6b" opacity="0.16" />
      {look.beard && (
        <>
          <path d="M 67 60 Q 68 90 86 96 Q 100 102 114 96 Q 132 90 133 60 Q 129 80 118 84 Q 100 80 82 84 Q 71 80 67 60 Z" fill={u('hair')} opacity="0.9" />
          <path d="M 89 85 Q 100 79 111 85 Q 100 83.5 89 85 Z" fill={hairC} opacity="0.9" />
        </>
      )}
      {eye(87)}
      {eye(113)}
      <path d={w ? 'M 79 53 Q 87 49 94 52' : 'M 78 53 Q 87 47.5 95 51.5'} stroke={browC} strokeWidth={w ? 2.4 : 3.6} fill="none" strokeLinecap="round" />
      <path d={w ? 'M 106 52 Q 113 49 121 53' : 'M 105 51.5 Q 113 47.5 122 53'} stroke={browC} strokeWidth={w ? 2.4 : 3.6} fill="none" strokeLinecap="round" />
      <path d="M 99 71 Q 103 77 99 79" stroke={skinDark} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d={w ? 'M 93 87 Q 100 91.5 107 87' : 'M 92 87 Q 100 91 108 87'} stroke={shade(skin, 0.45)} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {w && <path d="M 94 88 Q 100 92 106 88 Q 100 90.5 94 88 Z" fill="#c45a5a" opacity="0.55" />}

      {/* Haare */}
      {look.hair === 'kurz' && (
        <g fill={u('hair')}>
          <path d="M 66 62 Q 62 26 100 21 Q 138 26 134 62 Q 130 42 118 39 Q 100 35 82 39 Q 70 42 66 62 Z" />
          <path d="M 74 40 Q 76 14 102 13 Q 118 6 130 28 Q 128 22 120 22 Q 126 32 122 40 Q 112 26 98 30 Q 104 22 96 22 Q 84 28 74 40 Z" />
        </g>
      )}
      {look.hair === 'buzz' && <path d="M 67 56 Q 67 23 100 22 Q 133 23 133 56 Q 126 37 100 35 Q 74 37 67 56 Z" fill={u('hair')} opacity="0.9" />}
      {look.hair === 'locken' && (
        <g fill={u('hair')}>
          {[[72, 46, 9], [78, 33, 10], [90, 25, 10.5], [104, 22, 11], [118, 27, 10.5], [128, 38, 10], [131, 51, 8], [69, 56, 7], [97, 32, 8], [112, 33, 8]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      )}
      {look.hair === 'lang' && <path d="M 64 70 Q 60 22 100 20 Q 140 22 136 70 Q 132 46 122 38 Q 104 46 86 36 Q 70 44 64 70 Z" fill={u('hair')} />}
      {look.hair === 'glatze' && <ellipse cx="88" cy="36" rx="12" ry="6" fill="#fff" opacity="0.18" transform="rotate(-18 88 36)" />}
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
