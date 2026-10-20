import { api, siteUrl, supabase } from './api'
import type { Workout } from './types'
import { doneSets, isoWeek, prEvents, workoutDuration, workoutVolume } from './stats'
import { startOfWeek } from '@/lib/utils'

/* ════════════════════ Typen ════════════════════ */

function demoAvatar(n: number): Pick<Buddy, 'avatar' | 'avatarStats'> {
  const lv = n ? 3 : 4
  const g = n ? 0.38 : 0.48
  return {
    avatar: n ? { body: 'm', skin: 1, hair: 'kurz', hairColor: 3, beard: false, build: 'schlank' } : { body: 'm', skin: 3, hair: 'buzz', hairColor: 0, beard: true, build: 'sportlich' },
    avatarStats: { level: lv, title: n ? 'Regelmäßig' : 'Eisenfresser', total: n ? 10 : 18, sizes: { brust: g * 1.2, ruecken: g, schultern: g, arme: g * 1.3, beine: g * 0.7, core: g * 0.8 } },
  }
}

export type ShareLevel = 'basic' | 'stats'

/** Avatar-Stand, den jeder Nutzer für seine Buddys veröffentlicht */
export interface AvatarStats {
  level: number
  title: string
  total: number
  sizes: Record<string, number>
}

export interface Buddy {
  id: string
  name: string
  shareLevel: ShareLevel
  since: string
  /** Aussehen (Look) – null, wenn der Buddy noch keinen Avatar erstellt hat */
  avatar?: Record<string, unknown> | null
  avatarStats?: AvatarStats | null
}

export interface Summary {
  id: string
  user_id: string
  started_at: string
  name: string
  duration_min: number | null
  sets: number | null
  volume: number | null
  prs: { name: string; weight: number; reps: number }[]
}

export interface Reaction {
  workout_id: string
  from_user: string
  to_user: string
  created_at: string
}

export interface SocialStore {
  me(): Promise<{ code: string; shareLevel: ShareLevel }>
  setShareLevel(l: ShareLevel): Promise<void>
  inviteInfo(code: string): Promise<string | null>
  acceptInvite(code: string): Promise<{ id: string; name: string }>
  buddies(): Promise<Buddy[]>
  removeBuddy(id: string): Promise<void>
  publish(rows: Omit<Summary, 'user_id'>[]): Promise<void>
  unpublish(ids: string[]): Promise<void>
  summaries(userIds: string[], sinceIso: string): Promise<Summary[]>
  reactions(sinceIso: string): Promise<Reaction[]>
  react(workoutId: string, toUser: string, on: boolean): Promise<void>
}

const errMsg = (e: unknown) => (e as { message?: string })?.message ?? String(e)
export const socialSetupMissing = (e: unknown) => /invite_code|share_level|friendships|workout_summaries|reactions|my_buddies|accept_invite|invite_info|schema cache|PGRST20[02]|does not exist/i.test(errMsg(e))

/* ════════════════════ Supabase ════════════════════ */

function supabaseSocial(): SocialStore {
  const sb = supabase!
  const uid = async () => (await api.getUser())?.id ?? ''
  const ok = <T,>(r: { data: T; error: unknown }) => {
    if (r.error) throw r.error
    return r.data
  }
  return {
    async me() {
      const id = await uid()
      const p = ok(await sb.from('profiles').select('invite_code, share_level').eq('id', id).maybeSingle()) as { invite_code: string | null; share_level: ShareLevel } | null
      return { code: p?.invite_code ?? '', shareLevel: p?.share_level ?? 'stats' }
    },
    async setShareLevel(l) {
      ok(await sb.from('profiles').update({ share_level: l }).eq('id', await uid()))
    },
    async inviteInfo(code) {
      const name = ok(await sb.rpc('invite_info', { code })) as string | null
      return name ?? null
    },
    async acceptInvite(code) {
      const { data, error } = await sb.rpc('accept_invite', { code })
      if (error) {
        if (/nicht gefunden/i.test(error.message)) throw new Error('Diesen Code gibt es nicht. Prüf die Schreibweise.')
        if (/eigener Code/i.test(error.message)) throw new Error('Das ist dein eigener Code 😄')
        throw error
      }
      const row = (Array.isArray(data) ? data[0] : data) as { id: string; display_name: string }
      return { id: row.id, name: row.display_name }
    },
    async buddies() {
      const rows = ok(await sb.rpc('my_buddies')) as { id: string; display_name: string; share_level: ShareLevel; since: string; avatar?: Record<string, unknown> | null; avatar_stats?: AvatarStats | null }[]
      return (rows ?? []).map((r) => ({ id: r.id, name: r.display_name, shareLevel: r.share_level, since: r.since, avatar: r.avatar ?? null, avatarStats: r.avatar_stats ?? null }))
    },
    async removeBuddy(id) {
      const me = await uid()
      const [a, b] = me < id ? [me, id] : [id, me]
      ok(await sb.from('friendships').delete().eq('user_a', a).eq('user_b', b))
    },
    async publish(rows) {
      if (!rows.length) return
      const me = await uid()
      ok(await sb.from('workout_summaries').upsert(rows.map((r) => ({ ...r, user_id: me, updated_at: new Date().toISOString() }))))
    },
    async unpublish(ids) {
      if (!ids.length) return
      ok(await sb.from('workout_summaries').delete().in('id', ids))
    },
    async summaries(userIds, sinceIso) {
      if (!userIds.length) return []
      const rows = ok(
        await sb
          .from('workout_summaries')
          .select('id, user_id, started_at, name, duration_min, sets, volume, prs')
          .in('user_id', userIds)
          .gte('started_at', sinceIso)
          .order('started_at', { ascending: false }),
      ) as Summary[]
      return rows.map((r) => ({ ...r, volume: r.volume == null ? null : Number(r.volume) }))
    },
    async reactions(sinceIso) {
      return (ok(await sb.from('reactions').select('workout_id, from_user, to_user, created_at').gte('created_at', sinceIso)) as Reaction[]) ?? []
    },
    async react(workoutId, toUser, on) {
      const me = await uid()
      if (on) {
        const { error } = await sb.from('reactions').insert({ workout_id: workoutId, from_user: me, to_user: toUser })
        if (error && !/duplicate/i.test(error.message)) throw error
      } else ok(await sb.from('reactions').delete().eq('workout_id', workoutId).eq('from_user', me))
    },
  }
}

/* ════════════════════ Demo (ohne Server, für Tests/Vorschau) ════════════════════ */

function demoSocial(): SocialStore {
  const K = 'ironlog.social.demo.v1'
  type Db = { shareLevel: ShareLevel; buddies: Buddy[]; mine: Omit<Summary, 'user_id'>[]; reactions: Reaction[] }
  const load = (): Db => {
    try {
      return { shareLevel: 'stats', buddies: [], mine: [], reactions: [], ...JSON.parse(localStorage.getItem(K) || '{}') }
    } catch {
      return { shareLevel: 'stats', buddies: [], mine: [], reactions: [] }
    }
  }
  const save = (db: Db) => {
    try {
      localStorage.setItem(K, JSON.stringify(db))
    } catch {
      /* noop */
    }
  }
  // Simulierter Buddy: trainiert ~3–4×/Woche, deterministisch pro Woche
  const fake = (buddy: Buddy, sinceIso: string): Summary[] => {
    const out: Summary[] = []
    const now = new Date()
    const plans = ['Push Day', 'Pull Day', 'Leg Day', 'Oberkörper']
    for (let d = 0; d < 120; d++) {
      const day = new Date(now)
      day.setDate(now.getDate() - d)
      day.setHours(18, 0, 0, 0)
      if (day.toISOString() < sinceIso || day > now) continue
      const seed = (day.getFullYear() * 400 + day.getMonth() * 31 + day.getDate()) % 7
      if (![0, 2, 4, 5].includes(seed)) continue
      out.push({
        id: `demo-${buddy.id}-${day.toISOString().slice(0, 10)}`,
        user_id: buddy.id,
        started_at: day.toISOString(),
        name: plans[seed % plans.length],
        duration_min: 55 + seed * 3,
        sets: buddy.shareLevel === 'stats' ? 16 + seed : null,
        volume: buddy.shareLevel === 'stats' ? 9000 + seed * 900 + (120 - d) * 15 : null,
        prs: d === 1 ? [{ name: 'Bankdrücken', weight: 92.5, reps: 5 }] : [],
      })
    }
    return out
  }
  return {
    async me() {
      return { code: 'IRON-DEMO1', shareLevel: load().shareLevel }
    },
    async setShareLevel(l) {
      const db = load()
      db.shareLevel = l
      save(db)
    },
    async inviteInfo(code) {
      return code.trim() ? 'Ali (Demo)' : null
    },
    async acceptInvite(code) {
      const c = code.trim().toUpperCase()
      if (!c) throw new Error('Bitte gib einen Code ein.')
      if (c === 'IRON-DEMO1') throw new Error('Das ist dein eigener Code 😄')
      const db = load()
      const n = db.buddies.length
      const b: Buddy = { id: `demo-buddy-${n + 1}`, name: n ? `Max (Demo ${n + 1})` : 'Ali (Demo)', shareLevel: 'stats', since: new Date().toISOString(), ...demoAvatar(n) }
      db.buddies.push(b)
      // Ali hat dir schon mal Respekt gegeben
      const myLast = [...db.mine].sort((a, z) => z.started_at.localeCompare(a.started_at))[0]
      if (myLast) db.reactions.push({ workout_id: myLast.id, from_user: b.id, to_user: 'demo-user', created_at: new Date().toISOString() })
      save(db)
      return { id: b.id, name: b.name }
    },
    async buddies() {
      return load().buddies.map((b, i) => (b.avatarStats ? b : { ...b, ...demoAvatar(i) }))
    },
    async removeBuddy(id) {
      const db = load()
      db.buddies = db.buddies.filter((b) => b.id !== id)
      save(db)
    },
    async publish(rows) {
      const db = load()
      const ids = new Set(rows.map((r) => r.id))
      db.mine = [...db.mine.filter((m) => !ids.has(m.id)), ...rows]
      save(db)
    },
    async unpublish(ids) {
      const db = load()
      db.mine = db.mine.filter((m) => !ids.includes(m.id))
      save(db)
    },
    async summaries(userIds, sinceIso) {
      return load()
        .buddies.filter((b) => userIds.includes(b.id))
        .flatMap((b) => fake(b, sinceIso))
    },
    async reactions(sinceIso) {
      return load().reactions.filter((r) => r.created_at >= sinceIso)
    },
    async react(workoutId, toUser, on) {
      const db = load()
      db.reactions = db.reactions.filter((r) => !(r.workout_id === workoutId && r.from_user === 'demo-user'))
      if (on) db.reactions.push({ workout_id: workoutId, from_user: 'demo-user', to_user: toUser, created_at: new Date().toISOString() })
      save(db)
    },
  }
}

export const socialStore: SocialStore = supabase ? supabaseSocial() : demoSocial()

/* ════════════════════ Zusammenfassungen & Auswertung ════════════════════ */

export function toSummaries(workouts: Workout[], exName: (id: string) => string, level: ShareLevel, sinceMs: number): Omit<Summary, 'user_id'>[] {
  const prs = prEvents(workouts)
  return workouts
    .filter((w) => w.ended_at && +new Date(w.started_at) >= sinceMs)
    .map((w) => ({
      id: w.id,
      started_at: w.started_at,
      name: w.name || 'Training',
      duration_min: Math.round(workoutDuration(w) / 60000),
      sets: level === 'stats' ? doneSets(w).length : null,
      volume: level === 'stats' ? Math.round(workoutVolume(w)) : null,
      prs: level === 'stats' ? prs.filter((p) => p.workout_id === w.id).map((p) => ({ name: exName(p.exercise_id), weight: p.weight, reps: p.reps })) : [],
    }))
}

/** Fingerabdruck einer Zusammenfassung – nur Geändertes wird hochgeladen */
export const summaryKey = (s: Omit<Summary, 'user_id'>) => [s.started_at, s.name, s.duration_min, s.sets, s.volume, s.prs.length].join('|')

export type ChallengeKind = 'konstanz' | 'steigerung'
export const CHALLENGE_LABEL: Record<ChallengeKind, { title: string; sub: string }> = {
  konstanz: { title: 'Konstanz', sub: 'Wer trainiert öfter?' },
  steigerung: { title: 'Steigerung', sub: 'Wer steigert sein Volumen stärker? (vs. eigene Vorwoche)' },
}

export const weekStart = (d = new Date()) => startOfWeek(d)
export const addWeeks = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n * 7)
  return x
}

/** Challenge-Art der Woche: wechselt wöchentlich; ohne Volumen-Daten immer Konstanz */
export function challengeKind(week: Date, volumeAvailable: boolean): ChallengeKind {
  if (!volumeAvailable) return 'konstanz'
  return isoWeek(week) % 2 === 0 ? 'konstanz' : 'steigerung'
}

type Entry = { started_at: string; volume: number | null }

export function weekStats(entries: Entry[], week: Date) {
  const a = +week
  const b = +addWeeks(week, 1)
  const p = +addWeeks(week, -1)
  const inWeek = entries.filter((e) => +new Date(e.started_at) >= a && +new Date(e.started_at) < b)
  const prev = entries.filter((e) => +new Date(e.started_at) >= p && +new Date(e.started_at) < a)
  const vol = inWeek.reduce((s, e) => s + (e.volume ?? 0), 0)
  const prevVol = prev.reduce((s, e) => s + (e.volume ?? 0), 0)
  return { count: inWeek.length, volume: vol, growth: prevVol > 0 ? (vol / prevVol - 1) * 100 : null }
}

export function score(kind: ChallengeKind, s: ReturnType<typeof weekStats>) {
  return kind === 'konstanz' ? s.count : s.growth ?? (s.volume > 0 ? 0 : -100)
}

/** Duo-Streak: Wochen in Folge, in denen beide mind. `min`× trainiert haben (laufende Woche zählt, sobald beide es geschafft haben) */
export function duoStreak(mine: Entry[], theirs: Entry[], min = 3) {
  const cnt = (list: Entry[], w: Date) => weekStats(list, w).count
  let w = weekStart()
  let streak = 0
  if (cnt(mine, w) >= min && cnt(theirs, w) >= min) streak++
  w = addWeeks(w, -1)
  for (let i = 0; i < 104; i++) {
    if (cnt(mine, w) >= min && cnt(theirs, w) >= min) streak++
    else break
    w = addWeeks(w, -1)
  }
  return streak
}

export const STREAK_MILESTONES = [4, 10, 25, 52]

/* ════════════════════ Einladungslinks ════════════════════ */

export const inviteUrl = (code: string) => `${siteUrl()}/i/${encodeURIComponent(code)}`

const PENDING = 'ironlog.pendingInvite'
/** Beim Start: Einladungscode aus /i/CODE oder ?invite=CODE merken */
export function captureInvite() {
  try {
    const m = window.location.pathname.match(/^\/i\/([A-Za-z0-9-]{4,20})\/?$/)
    const q = new URLSearchParams(window.location.search).get('invite')
    const code = (m?.[1] ?? q ?? '').toUpperCase()
    if (code) {
      localStorage.setItem(PENDING, code)
      history.replaceState(null, '', '/' + window.location.hash)
    }
  } catch {
    /* noop */
  }
}
export const pendingInvite = () => {
  try {
    return localStorage.getItem(PENDING)
  } catch {
    return null
  }
}
export const clearPendingInvite = () => {
  try {
    localStorage.removeItem(PENDING)
  } catch {
    /* noop */
  }
}

