export type MuscleGroup = 'brust' | 'ruecken' | 'beine' | 'schultern' | 'arme' | 'core'

export interface Profile {
  id: string
  display_name: string
  default_rest_seconds: number
}

export interface Exercise {
  id: string
  user_id: string | null // null = global/vorbefüllt
  name: string
  muscle_group: MuscleGroup
  equipment: string
  image_url: string | null
  is_custom: boolean
  /** Körpergewichtsübung: Fortschritt über Wiederholungen statt kg */
  bodyweight?: boolean
}

export interface WorkoutSet {
  id: string
  set_number: number
  weight: number
  reps: number
  done: boolean
  is_pr?: boolean
}

export interface WorkoutExercise {
  id: string
  exercise_id: string
  position: number
  sets: WorkoutSet[]
  /** Ziel-Wiederholungen (nur lokal, für den Gewichtsvorschlag) */
  target_reps?: number
}

export interface Workout {
  id: string
  name: string
  template_id: string | null
  started_at: string // ISO
  ended_at: string | null
  notes: string
  exercises: WorkoutExercise[]
}

export interface TemplateItem {
  exercise_id: string
  target_sets: number
  target_reps: number
}

export interface Template {
  id: string
  name: string
  cover_url: string | null
  items: TemplateItem[]
  created_at: string
}

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  brust: 'Brust',
  ruecken: 'Rücken',
  beine: 'Beine',
  schultern: 'Schultern',
  arme: 'Arme',
  core: 'Core',
}

export const MUSCLES: MuscleGroup[] = ['brust', 'ruecken', 'beine', 'schultern', 'arme', 'core']
