import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { WorkoutSet } from '@/data/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Epley-Formel: 1RM = w · (1 + r/30) */
export function epley(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export const nf = (n: number, d = 0) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n)

export function fmtKg(n: number) {
  return `${nf(n, 1)} kg`
}

/** Kompakte Volumenangabe: 12.450 kg → 12,5 t */
export function fmtVolume(kg: number) {
  if (kg >= 10000) return { value: nf(kg / 1000, 1), unit: 't' }
  return { value: nf(kg), unit: 'kg' }
}

export function setVolume(s: Pick<WorkoutSet, 'weight' | 'reps'>) {
  return s.weight * s.reps
}

export function fmtDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function fmtMinutes(ms: number) {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat('de-DE', opts).format(new Date(iso))

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 14) return 'Mahlzeit'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

/** Montag 00:00 der Woche */
export function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* noop */
  }
}
