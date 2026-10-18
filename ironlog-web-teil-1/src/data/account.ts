import { api, supabase } from './api'
import { nutritionStore } from './nutrition'
import type { Exercise, Template, Workout } from './types'

/* ════════════════════ Körpergewicht ════════════════════ */

export interface BodyWeight {
  day: string // YYYY-MM-DD
  kg: number
}

export interface BodyStore {
  list(): Promise<BodyWeight[]>
  save(e: BodyWeight): Promise<void>
  remove(day: string): Promise<void>
}

const userId = async () => (await api.getUser())?.id ?? 'anon'

function localBody(): BodyStore {
  const key = async () => `ironlog.body.${await userId()}.v1`
  const load = async (): Promise<BodyWeight[]> => {
    try {
      return JSON.parse(localStorage.getItem(await key()) || '[]')
    } catch {
      return []
    }
  }
  const put = async (rows: BodyWeight[]) => {
    try {
      localStorage.setItem(await key(), JSON.stringify(rows))
    } catch {
      /* noop */
    }
  }
  return {
    async list() {
      return (await load()).sort((a, b) => a.day.localeCompare(b.day))
    },
    async save(e) {
      await put([...(await load()).filter((x) => x.day !== e.day), e])
    },
    async remove(day) {
      await put((await load()).filter((x) => x.day !== day))
    },
  }
}

function supabaseBody(): BodyStore {
  const sb = supabase!
  return {
    async list() {
      const { data, error } = await sb.from('body_weights').select('day, kg').order('day')
      if (error) throw error
      return (data ?? []).map((r) => ({ day: r.day as string, kg: Number(r.kg) }))
    },
    async save(e) {
      const { error } = await sb.from('body_weights').upsert({ user_id: await userId(), day: e.day, kg: e.kg })
      if (error) throw error
    },
    async remove(day) {
      const { error } = await sb.from('body_weights').delete().eq('day', day)
      if (error) throw error
    },
  }
}

export const bodyStore: BodyStore = supabase ? supabaseBody() : localBody()

/* ════════════════════ Datenexport (DSGVO Art. 20) ════════════════════ */

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export async function exportJson(data: { workouts: Workout[]; templates: Template[]; exercises: Exercise[] }) {
  const user = await api.getUser()
  const [profile, goals, foods, custom, body] = await Promise.all([
    api.getProfile().catch(() => null),
    nutritionStore.getGoals().catch(() => null),
    nutritionStore.listEntries('1900-01-01', '2999-12-31').catch(() => []),
    nutritionStore.listCustomFoods().catch(() => []),
    bodyStore.list().catch(() => []),
  ])
  const out = {
    app: 'IRONLOG',
    exportiert_am: new Date().toISOString(),
    konto: { email: user?.email ?? null },
    profil: profile,
    trainings: data.workouts,
    plaene: data.templates,
    eigene_uebungen: data.exercises.filter((e) => e.is_custom),
    ernaehrung: { ziele: goals, eintraege: foods, eigene_lebensmittel: custom },
    koerpergewicht: body,
  }
  download(`ironlog-export-${stamp()}.json`, JSON.stringify(out, null, 2), 'application/json')
}

export function exportSetsCsv(workouts: Workout[], exName: (id: string) => string) {
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = [['Datum', 'Training', 'Übung', 'Satz', 'Gewicht (kg)', 'Wiederholungen', 'Erledigt']]
  for (const w of [...workouts].sort((a, b) => a.started_at.localeCompare(b.started_at))) {
    for (const we of w.exercises) {
      we.sets.forEach((s, i) =>
        rows.push([w.started_at.slice(0, 10), w.name, exName(we.exercise_id), String(i + 1), String(s.weight).replace('.', ','), String(s.reps), s.done ? 'ja' : 'nein']),
      )
    }
  }
  // Semikolon + BOM: öffnet sich in deutschem Excel direkt richtig
  download(`ironlog-saetze-${stamp()}.csv`, '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n'), 'text/csv;charset=utf-8')
}

/* ════════════════════ Konto löschen ════════════════════ */

function clearLocal() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ironlog.'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}

export async function deleteAccount() {
  if (supabase) {
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      if (/could not find the function|PGRST202/i.test(error.message)) throw new Error('In Supabase fehlt noch die Funktion zum Löschen. Bitte die SQL-Datei „ironlog-update.sql“ ausführen.')
      throw error
    }
    clearLocal()
    await supabase.auth.signOut().catch(() => undefined)
    window.location.reload()
  } else {
    clearLocal()
    window.location.reload()
  }
}
