/**
 * Echte Übungsfotos je Übung (Start-/Endposition der Bewegung).
 * Quelle: Free Exercise DB (github.com/yuhonas/free-exercise-db), Public Domain (Unlicense).
 * Dateiname = Übungs-ID aus seed.ts. Die Fotos sind vorab in den App-Farbton (Schwarz → Neon-Lime) umgefärbt.
 */
const files = import.meta.glob('../assets/exercises/*.jpg', { eager: true, import: 'default' }) as Record<string, string>

export const EXERCISE_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.jpg', ''), url]),
)

/** Bereits im IRONLOG-Farbton bearbeitete Fotos (kein zusätzlicher CSS-Duotone nötig) */
const covers = import.meta.glob('../assets/covers/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
export const BAKED_IMAGES = new Set([...Object.values(EXERCISE_IMAGES), ...Object.values(covers)])

/** Für vorbefüllte Übungen immer das passende lokale Foto verwenden */
export function exerciseImage(id: string, fallback: string | null) {
  return EXERCISE_IMAGES[id] ?? fallback
}
