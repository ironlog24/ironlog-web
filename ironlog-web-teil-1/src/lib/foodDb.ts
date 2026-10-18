import { gunzipSync, strFromU8 } from 'fflate'
import type { Food } from '@/data/nutrition'
import { BASIS_FOODS } from '@/data/basisFoods'
import dbUrl from '@/assets/foods.dat?url'

/**
 * Lebensmittel-Datenbank
 * - Produkte: Open Food Facts (Deutschland, plausible Nährwerte), mitgeliefert als gzip-JSON.
 *   Daten © Open Food Facts contributors, Lizenz: Open Database License (ODbL).
 * - Grundnahrungsmittel: eigene Durchschnittswerte (BASIS_FOODS).
 * - Online: Suche und Barcode-Abfrage direkt bei Open Food Facts, wenn etwas fehlt.
 */

/** [EAN, Name, Marke, kcal, Eiweiß, Kohlenhydrate, Fett, Zucker, Ballaststoffe, Portion g] – je 100 g, nach Beliebtheit sortiert */
type Row = [string, string, string, number | null, number | null, number | null, number | null, number | null, number | null, number | null]

let rows: Row[] = []
let hay: string[] = []
let byCode = new Map<string, number>()
let loading: Promise<number> | null = null
const basisHay = BASIS_FOODS.map((f) => norm(f.name))

export function norm(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
}

/** Lädt die Datenbank einmalig (≈ 1 s) und liefert die Anzahl der Produkte */
export function loadFoodDb(): Promise<number> {
  if (!loading) {
    loading = (async () => {
      const buf = new Uint8Array(await (await fetch(dbUrl)).arrayBuffer())
      // Manche Server entpacken .gz selbst – dann ist es schon JSON
      const text = buf[0] === 0x1f && buf[1] === 0x8b ? strFromU8(gunzipSync(buf)) : strFromU8(buf)
      rows = JSON.parse(text) as Row[]
      hay = rows.map((r) => norm(r[1] + ' ' + (r[2] || '')))
      byCode = new Map(rows.map((r, i) => [r[0], i]))
      return rows.length
    })().catch((e) => {
      loading = null
      throw e
    })
  }
  return loading
}

export const foodDbSize = () => rows.length

function rowToFood(r: Row): Food {
  return {
    id: r[0],
    code: r[0],
    name: r[1],
    brand: r[2] || undefined,
    kcal: r[3] ?? 0,
    p: r[4] ?? 0,
    c: r[5] ?? 0,
    f: r[6] ?? 0,
    sugar: r[7],
    fiber: r[8],
    serving: r[9],
    source: 'off',
  }
}

/** Lokale Suche: alle Wörter müssen vorkommen; Grundnahrungsmittel und beliebte Produkte zuerst */
export function searchFoods(query: string, custom: Food[] = [], limit = 60): Food[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return []
  const match = (h: string) => tokens.every((t) => h.includes(t))
  const starts = (h: string) => h.startsWith(tokens[0])

  const own = custom.filter((f) => match(norm(f.name + ' ' + (f.brand ?? ''))))
  const basis = BASIS_FOODS.filter((_, i) => match(basisHay[i])).sort((a, b) => Number(starts(norm(b.name))) - Number(starts(norm(a.name))))

  const hitsStart: number[] = []
  const hitsOther: number[] = []
  for (let i = 0; i < hay.length && hitsStart.length + hitsOther.length < 2000; i++) {
    if (match(hay[i])) (starts(hay[i]) ? hitsStart : hitsOther).push(i)
  }
  // rows sind bereits nach Beliebtheit sortiert
  const products = [...hitsStart, ...hitsOther].slice(0, limit).map((i) => rowToFood(rows[i]))
  return [...own, ...basis, ...products].slice(0, limit)
}

export function findByCode(code: string, custom: Food[] = []): Food | null {
  const own = custom.find((f) => f.code === code)
  if (own) return own
  const i = byCode.get(code) ?? byCode.get(code.replace(/^0+/, '')) ?? byCode.get(code.padStart(13, '0'))
  return i == null ? null : rowToFood(rows[i])
}

/* ── Online (Open Food Facts) ── */

const num = (v: unknown) => (v == null || v === '' || isNaN(Number(v)) ? null : Math.round(Number(v) * 10) / 10)

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  brands?: string | string[]
  nutriments?: Record<string, unknown>
  serving_quantity?: number | string
  unique_scans_n?: number
}

function offToFood(p: OffProduct): Food | null {
  const n = p.nutriments ?? {}
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? Math.round(Number(n['energy_100g']) / 4.184) : null)
  const name = (p.product_name_de || p.product_name || '').trim()
  if (!p.code || !name || kcal == null) return null
  return {
    id: p.code,
    code: p.code,
    name,
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || undefined,
    kcal,
    p: num(n.proteins_100g) ?? 0,
    c: num(n.carbohydrates_100g) ?? 0,
    f: num(n.fat_100g) ?? 0,
    sugar: num(n.sugars_100g),
    fiber: num(n.fiber_100g),
    salt: num(n.salt_100g),
    serving: num(p.serving_quantity),
    source: 'off',
    scans: p.unique_scans_n ?? 0,
  }
}

const FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,unique_scans_n'

export async function lookupBarcodeOnline(code: string): Promise<Food | null> {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}&lc=de`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`Open Food Facts antwortet nicht (${r.status})`)
  const j = (await r.json()) as { status?: number; product?: OffProduct }
  return j.status === 1 && j.product ? offToFood({ ...j.product, code: j.product.code ?? code }) : null
}

export async function searchOnline(query: string): Promise<Food[]> {
  const q = query.trim()
  if (!q) return []
  // 1. Neue Open-Food-Facts-Suche, 2. Fallback: klassische API
  try {
    const r = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=de&page_size=40&sort_by=-unique_scans_n&fields=${FIELDS}`)
    if (r.ok) {
      const j = (await r.json()) as { hits?: OffProduct[] }
      return (j.hits ?? []).map(offToFood).filter((f): f is Food => !!f)
    }
  } catch {
    /* Fallback */
  }
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&countries_tags_en=germany&page_size=40&sort_by=unique_scans_n&fields=${FIELDS}`)
  if (!r.ok) throw new Error(`Online-Suche nicht erreichbar (${r.status})`)
  const j = (await r.json()) as { products?: OffProduct[] }
  return (j.products ?? []).map(offToFood).filter((f): f is Food => !!f)
}
