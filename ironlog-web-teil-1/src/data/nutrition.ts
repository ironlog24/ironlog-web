import { api, supabase } from './api'
import { uid } from '@/lib/utils'

/* ════════════════════ Typen ════════════════════ */

export type Meal = 'fruehstueck' | 'mittag' | 'abend' | 'snacks'
export const MEALS: { id: Meal; label: string }[] = [
  { id: 'fruehstueck', label: 'Frühstück' },
  { id: 'mittag', label: 'Mittagessen' },
  { id: 'abend', label: 'Abendessen' },
  { id: 'snacks', label: 'Snacks' },
]

/** Nährwerte je 100 g (bzw. 100 ml) */
export interface Food {
  id: string // EAN-Code, "b:<slug>" (Grundnahrungsmittel) oder "c:<uuid>" (eigene)
  code?: string
  name: string
  brand?: string
  kcal: number
  p: number
  c: number
  f: number
  sugar?: number | null
  fiber?: number | null
  salt?: number | null
  /** Portionsgröße in g, falls bekannt */
  serving?: number | null
  source: 'off' | 'basis' | 'eigen'
  scans?: number
}

export interface FoodEntry {
  id: string
  day: string // YYYY-MM-DD
  meal: Meal
  grams: number
  food: Food // Momentaufnahme der Nährwerte
  created_at: string
}

export interface Goals {
  kcal: number
  p: number
  c: number
  f: number
  /** Optionale Angaben für den Rechner */
  calc?: GoalInput
}

export interface GoalInput {
  sex: 'm' | 'w'
  age: number
  height: number // cm
  weight: number // kg
  activity: number // PAL-Faktor
  goal: 'aufbau' | 'halten' | 'definition'
}

export const DEFAULT_GOALS: Goals = { kcal: 2500, p: 160, c: 280, f: 80 }

export const ACTIVITY: { v: number; l: string }[] = [
  { v: 1.2, l: 'Kaum Bewegung (Büro)' },
  { v: 1.375, l: '1–3× Training/Woche' },
  { v: 1.55, l: '3–5× Training/Woche' },
  { v: 1.725, l: '6–7× Training/Woche' },
  { v: 1.9, l: 'Körperlich harter Job + Training' },
]

/** Mifflin-St-Jeor × Aktivität, Ziel-Anpassung, 2 g Eiweiß/kg, 25 % Fett, Rest Kohlenhydrate */
export function calcGoals(i: GoalInput): Goals {
  const bmr = 10 * i.weight + 6.25 * i.height - 5 * i.age + (i.sex === 'm' ? 5 : -161)
  const tdee = bmr * i.activity
  const kcal = Math.round((tdee + (i.goal === 'aufbau' ? 300 : i.goal === 'definition' ? -400 : 0)) / 10) * 10
  const p = Math.round(i.weight * (i.goal === 'definition' ? 2.2 : 2.0))
  const f = Math.round((kcal * 0.25) / 9)
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))
  return { kcal, p, c, f, calc: i }
}

export function scale(food: Food, grams: number) {
  const k = grams / 100
  return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k }
}

export function sumEntries(entries: FoodEntry[]) {
  return entries.reduce(
    (a, e) => {
      const s = scale(e.food, e.grams)
      return { kcal: a.kcal + s.kcal, p: a.p + s.p, c: a.c + s.c, f: a.f + s.f }
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  )
}

export function dayString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number)
  return dayString(new Date(y, m - 1, d + n))
}

/* ════════════════════ Speicher ════════════════════ */

export interface NutritionStore {
  getGoals(): Promise<Goals | null>
  saveGoals(g: Goals): Promise<void>
  listEntries(from: string, to: string): Promise<FoodEntry[]>
  saveEntry(e: FoodEntry): Promise<void>
  deleteEntry(id: string): Promise<void>
  listCustomFoods(): Promise<Food[]>
  saveCustomFood(f: Food): Promise<void>
}

function localStore(): NutritionStore {
  const key = async () => `ironlog.nutrition.${(await api.getUser())?.id ?? 'anon'}.v1`
  type Db = { goals: Goals | null; entries: FoodEntry[]; custom: Food[] }
  const load = async (): Promise<Db> => {
    try {
      return { goals: null, entries: [], custom: [], ...JSON.parse(localStorage.getItem(await key()) || '{}') }
    } catch {
      return { goals: null, entries: [], custom: [] }
    }
  }
  const save = async (db: Db) => {
    try {
      localStorage.setItem(await key(), JSON.stringify(db))
    } catch (e) {
      console.warn('Speichern fehlgeschlagen', e)
    }
  }
  return {
    async getGoals() {
      return (await load()).goals
    },
    async saveGoals(g) {
      const db = await load()
      db.goals = g
      await save(db)
    },
    async listEntries(from, to) {
      return (await load()).entries.filter((e) => e.day >= from && e.day <= to)
    },
    async saveEntry(e) {
      const db = await load()
      db.entries = [...db.entries.filter((x) => x.id !== e.id), e]
      await save(db)
    },
    async deleteEntry(id) {
      const db = await load()
      db.entries = db.entries.filter((x) => x.id !== id)
      await save(db)
    },
    async listCustomFoods() {
      return (await load()).custom
    },
    async saveCustomFood(f) {
      const db = await load()
      db.custom = [...db.custom.filter((x) => x.id !== f.id), f]
      await save(db)
    },
  }
}

function supabaseStore(): NutritionStore {
  const sb = supabase!
  const userId = async () => (await api.getUser())?.id
  return {
    async getGoals() {
      const id = await userId()
      const { data } = await sb.from('profiles').select('nutrition_goals').eq('id', id).maybeSingle()
      return (data?.nutrition_goals as Goals) ?? null
    },
    async saveGoals(g) {
      const id = await userId()
      const { error } = await sb.from('profiles').update({ nutrition_goals: g }).eq('id', id)
      if (error) throw error
    },
    async listEntries(from, to) {
      const { data, error } = await sb.from('food_entries').select('id, day, meal, grams, food, created_at').gte('day', from).lte('day', to)
      if (error) throw error
      return (data ?? []).map((r) => ({ ...r, grams: Number(r.grams) })) as FoodEntry[]
    },
    async saveEntry(e) {
      const { error } = await sb.from('food_entries').upsert({ ...e, user_id: await userId() })
      if (error) throw error
    },
    async deleteEntry(id) {
      const { error } = await sb.from('food_entries').delete().eq('id', id)
      if (error) throw error
    },
    async listCustomFoods() {
      const { data, error } = await sb.from('custom_foods').select('food')
      if (error) throw error
      return (data ?? []).map((r) => r.food as Food)
    },
    async saveCustomFood(f) {
      const { error } = await sb.from('custom_foods').upsert({ id: f.id.replace(/^c:/, ''), user_id: await userId(), food: f })
      if (error) throw error
    },
  }
}

export const nutritionStore: NutritionStore = supabase ? supabaseStore() : localStore()

/* ════════════════════ Favoriten & Zuletzt (pro Gerät) ════════════════════ */

const LS = {
  get<T>(k: string, d: T): T {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d
    } catch {
      return d
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* noop */
    }
  },
}

export const favorites = {
  all: () => LS.get<Food[]>('ironlog.food.favs', []),
  has: (id: string) => favorites.all().some((f) => f.id === id),
  toggle(food: Food) {
    const list = favorites.all()
    LS.set('ironlog.food.favs', list.some((f) => f.id === food.id) ? list.filter((f) => f.id !== food.id) : [food, ...list].slice(0, 100))
  },
}

export const recents = {
  all: () => LS.get<{ food: Food; grams: number }[]>('ironlog.food.recent', []),
  add(food: Food, grams: number) {
    LS.set('ironlog.food.recent', [{ food, grams }, ...recents.all().filter((r) => r.food.id !== food.id)].slice(0, 40))
  },
}

export function newEntry(day: string, meal: Meal, food: Food, grams: number): FoodEntry {
  return { id: uid(), day, meal, food, grams, created_at: new Date().toISOString() }
}

export function newCustomFood(data: Omit<Food, 'id' | 'source'>): Food {
  return { ...data, id: 'c:' + uid(), source: 'eigen' }
}
