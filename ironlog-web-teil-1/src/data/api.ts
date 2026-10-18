import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, Profile, Template, Workout } from './types'
import { SEED_EXERCISES, seedTemplates } from './seed'
import { uid } from '@/lib/utils'
import { exerciseImage } from '@/lib/exerciseImages'

export interface SessionUser {
  id: string
  email: string
}

export interface Api {
  mode: 'supabase' | 'demo'
  getUser(): Promise<SessionUser | null>
  onAuthChange(cb: (u: SessionUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, name: string): Promise<{ needsConfirm: boolean }>
  signOut(): Promise<void>
  /** Schickt eine E-Mail mit Link zum Zurücksetzen des Passworts */
  resetPassword(email: string): Promise<void>
  /** Setzt ein neues Passwort für den eingeloggten Nutzer */
  updatePassword(password: string): Promise<void>
  getProfile(): Promise<Profile>
  updateProfile(p: Partial<Profile>): Promise<void>
  listExercises(): Promise<Exercise[]>
  createExercise(ex: Omit<Exercise, 'id' | 'user_id' | 'is_custom' | 'image_url'>, image?: File | null): Promise<Exercise>
  listWorkouts(): Promise<Workout[]>
  saveWorkout(w: Workout): Promise<void>
  deleteWorkout(id: string): Promise<void>
  listTemplates(): Promise<Template[]>
  saveTemplate(t: Template): Promise<void>
  deleteTemplate(id: string): Promise<void>
  uploadCover(file: File): Promise<string>
}

/* ───────────────────────── Bild-Helfer ───────────────────────── */

async function downscale(file: File, max = 1000, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', quality))
}
const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(b)
  })

/* ───────────────────────── Demo (localStorage) ───────────────────────── */

function createDemoApi(): Api {
  const K = 'ironlog.demo.v1'
  type Db = {
    session: (SessionUser & { name: string }) | null
    profile: Profile | null
    customExercises: Exercise[]
    workouts: Workout[]
    templates: Template[]
  }
  const empty: Db = { session: null, profile: null, customExercises: [], workouts: [], templates: [] }
  const load = (): Db => {
    try {
      return { ...empty, ...JSON.parse(localStorage.getItem(K) || '{}') }
    } catch {
      return { ...empty }
    }
  }
  let db = load()
  // Beispiel-Trainings aus früheren Versionen entfernen – Fortschritt startet bei 0
  if (db.workouts.some((w) => w.id.startsWith('demo-'))) {
    db.workouts = db.workouts.filter((w) => !w.id.startsWith('demo-'))
    try {
      localStorage.setItem(K, JSON.stringify(db))
    } catch {
      /* noop */
    }
  }
  const save = () => {
    try {
      localStorage.setItem(K, JSON.stringify(db))
    } catch (e) {
      console.warn('Speichern fehlgeschlagen', e)
    }
  }
  const listeners = new Set<(u: SessionUser | null) => void>()
  const emit = () => listeners.forEach((l) => l(db.session))
  const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))

  const startSession = (email: string, name: string) => {
    const fresh = !db.profile
    db.session = { id: 'demo-user', email, name }
    if (fresh) {
      db.profile = { id: 'demo-user', display_name: name, default_rest_seconds: 90 }
      db.templates = seedTemplates()
      db.workouts = []
    }
    save()
    emit()
  }

  return {
    mode: 'demo',
    async getUser() {
      return db.session
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email) {
      await wait(500)
      startSession(email, db.profile?.display_name || email.split('@')[0].replace(/^\w/, (c) => c.toUpperCase()))
    },
    async signUp(email, _pw, name) {
      await wait(500)
      startSession(email, name || email.split('@')[0])
      if (db.profile && name) db.profile.display_name = name
      save()
      return { needsConfirm: false }
    },
    async resetPassword() {
      await wait(400)
    },
    async updatePassword() {
      await wait(300)
    },
    async signOut() {
      db.session = null
      save()
      emit()
    },
    async getProfile() {
      return db.profile ?? { id: 'demo-user', display_name: 'Athlet', default_rest_seconds: 90 }
    },
    async updateProfile(p) {
      db.profile = { ...(await this.getProfile()), ...p }
      save()
    },
    async listExercises() {
      await wait(150)
      return [...SEED_EXERCISES, ...db.customExercises]
    },
    async createExercise(ex, image) {
      const image_url = image ? await blobToDataUrl(await downscale(image, 800)) : null
      const e: Exercise = { ...ex, id: uid(), user_id: 'demo-user', is_custom: true, image_url }
      db.customExercises.push(e)
      save()
      return e
    },
    async listWorkouts() {
      await wait(200)
      return [...db.workouts]
    },
    async saveWorkout(w) {
      const i = db.workouts.findIndex((x) => x.id === w.id)
      if (i >= 0) db.workouts[i] = w
      else db.workouts.push(w)
      save()
    },
    async deleteWorkout(id) {
      db.workouts = db.workouts.filter((w) => w.id !== id)
      save()
    },
    async listTemplates() {
      return [...db.templates]
    },
    async saveTemplate(t) {
      const i = db.templates.findIndex((x) => x.id === t.id)
      if (i >= 0) db.templates[i] = t
      else db.templates.push(t)
      save()
    },
    async deleteTemplate(id) {
      db.templates = db.templates.filter((t) => t.id !== id)
      save()
    },
    async uploadCover(file) {
      return blobToDataUrl(await downscale(file, 1000))
    },
  }
}

/* ───────────────────────── Supabase ───────────────────────── */

function createSupabaseApi(sb: SupabaseClient): Api {
  const BUCKET = 'exercise-images'
  // getSession liest lokal (funktioniert offline, kein extra Request); Zugriffsschutz macht RLS auf dem Server
  const userId = async () => {
    const { data } = await sb.auth.getSession()
    if (!data.session?.user) throw new Error('Nicht eingeloggt')
    return data.session.user.id
  }
  const check = <T>(r: { data: T; error: unknown }) => {
    if (r.error) throw r.error
    return r.data
  }
  const upload = async (file: File, folder: string) => {
    const id = await userId()
    const blob = await downscale(file, 1200)
    const path = `${id}/${folder}/${uid()}.jpg`
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw error
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  /** Beim ersten Login: Standard-Vorlagen anlegen */
  const ensureSeeded = async () => {
    const id = await userId()
    const { count } = await sb.from('templates').select('id', { count: 'exact', head: true })
    const { data: prof } = await sb.from('profiles').select('seeded').eq('id', id).maybeSingle()
    if (prof?.seeded || (count ?? 0) > 0) return
    await sb.from('templates').insert(
      seedTemplates().map((t) => ({ id: uid(), user_id: id, name: t.name, cover_url: t.cover_url, items: t.items })),
    )
    await sb.from('profiles').update({ seeded: true }).eq('id', id)
  }

  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      return u ? { id: u.id, email: u.email ?? '' } : null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null))
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password, name) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: siteUrl() } })
      if (error) throw error
      return { needsConfirm: !data.session }
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() + '/' })
      if (error) throw error
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw error
      passwordRecovery.set(false)
    },
    async getProfile() {
      const id = await userId()
      await ensureSeeded().catch(console.warn)
      const p = check(await sb.from('profiles').select('id, display_name, default_rest_seconds').eq('id', id).maybeSingle())
      return (p as Profile) ?? { id, display_name: 'Athlet', default_rest_seconds: 90 }
    },
    async updateProfile(p) {
      const id = await userId()
      check(await sb.from('profiles').update(p).eq('id', id))
    },
    async listExercises() {
      const rows = check(await sb.from('exercises').select('*').order('name')) as Exercise[]
      // globale Übungen: passendes, mitgeliefertes Foto
      return rows.map((e) => (e.is_custom ? e : { ...e, image_url: exerciseImage(e.id, e.image_url) }))
    },
    async createExercise(ex, image) {
      const id = await userId()
      const image_url = image ? await upload(image, 'exercises') : null
      const row = check(
        await sb.from('exercises').insert({ ...ex, user_id: id, is_custom: true, image_url }).select('*').single(),
      )
      return row as Exercise
    },
    async listWorkouts() {
      const rows = check(
        await sb
          .from('workouts')
          .select('id, name, template_id, started_at, ended_at, notes, workout_exercises(id, exercise_id, position, sets(id, set_number, weight, reps, done))')
          .order('started_at'),
      ) as unknown as Workout[]
      return rows.map((w) => ({
        ...w,
        exercises: ((w as unknown as { workout_exercises: Workout['exercises'] }).workout_exercises ?? [])
          .sort((a, b) => a.position - b.position)
          .map((we) => ({ ...we, sets: we.sets.sort((a, b) => a.set_number - b.set_number).map((s) => ({ ...s, weight: Number(s.weight) })) })),
      }))
    },
    async saveWorkout(w) {
      const id = await userId()
      check(
        await sb.from('workouts').upsert({
          id: w.id, user_id: id, name: w.name, template_id: w.template_id,
          started_at: w.started_at, ended_at: w.ended_at, notes: w.notes,
        }),
      )
      check(await sb.from('workout_exercises').delete().eq('workout_id', w.id))
      if (!w.exercises.length) return
      check(
        await sb.from('workout_exercises').insert(
          w.exercises.map((we, i) => ({ id: we.id, workout_id: w.id, user_id: id, exercise_id: we.exercise_id, position: i })),
        ),
      )
      const sets = w.exercises.flatMap((we) =>
        we.sets.map((s, i) => ({
          id: s.id, workout_exercise_id: we.id, user_id: id, set_number: i + 1, weight: s.weight, reps: s.reps, done: s.done,
        })),
      )
      if (sets.length) check(await sb.from('sets').insert(sets))
    },
    async deleteWorkout(wid) {
      check(await sb.from('workouts').delete().eq('id', wid))
    },
    async listTemplates() {
      return check(await sb.from('templates').select('id, name, cover_url, items, created_at').order('created_at')) as Template[]
    },
    async saveTemplate(t) {
      const id = await userId()
      check(await sb.from('templates').upsert({ id: t.id, user_id: id, name: t.name, cover_url: t.cover_url, items: t.items }))
    },
    async deleteTemplate(tid) {
      check(await sb.from('templates').delete().eq('id', tid))
    },
    uploadCover: (file) => upload(file, 'covers'),
  }
}

/** Wohin Links aus Bestätigungs-/Reset-Mails führen: echte Web-Adresse; bei lokal geöffneter HTML-Datei die Online-Seite */
export function siteUrl() {
  const o = typeof window !== 'undefined' ? window.location.origin : ''
  return /^https?:\/\//.test(o) && !/claude|anthropic|usercontent/.test(o) ? o : SITE_URL
}
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://ironlog-youssef.netlify.app'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase-Client (null im Demo-Modus) – auch für das Ernährungs-Modul */
/* Passwort-Reset: Der Link aus der E-Mail öffnet die App mit #…type=recovery.
   Muss vor createClient gelesen werden, weil Supabase den Hash danach entfernt. */
export const passwordRecovery = (() => {
  let on = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search)
  const subs = new Set<(v: boolean) => void>()
  return {
    get: () => on,
    set(v: boolean) {
      on = v
      subs.forEach((f) => f(v))
    },
    subscribe(f: (v: boolean) => void) {
      subs.add(f)
      return () => void subs.delete(f)
    },
  }
})()

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
supabase?.auth.onAuthStateChange((e) => {
  if (e === 'PASSWORD_RECOVERY') passwordRecovery.set(true)
})

export const api: Api = supabase ? createSupabaseApi(supabase) : createDemoApi()
