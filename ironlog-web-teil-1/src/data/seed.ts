import type { Exercise, MuscleGroup, Template, Workout } from './types'
import { photo, type PhotoKey, PLAN_COVERS } from '@/lib/images'
import { exerciseImage } from '@/lib/exerciseImages'

type SeedRow = [id: string, name: string, muscle: MuscleGroup, equipment: string, img: PhotoKey, bodyweight?: boolean]

const ROWS: SeedRow[] = [
  // Brust
  ['bankdruecken', 'Bankdrücken', 'brust', 'Langhantel', 'benchPress'],
  ['schraegbankdruecken', 'Schrägbankdrücken', 'brust', 'Langhantel', 'pressMan'],
  ['kh-bankdruecken', 'Kurzhantel-Bankdrücken', 'brust', 'Kurzhantel', 'dumbbellsClose'],
  ['kabel-flys', 'Kabel-Flys', 'brust', 'Kabelzug', 'cableChest'],
  ['butterfly', 'Butterfly', 'brust', 'Maschine', 'cableChest'],
  ['brustpresse', 'Brustpresse', 'brust', 'Maschine', 'machines'],
  ['bankdrueckmaschine', 'Bankdrückmaschine', 'brust', 'Multipresse', 'machines'],
  ['liegestuetze', 'Liegestütze', 'brust', 'Körpergewicht', 'pushupWoman', true],
  ['dips', 'Dips', 'brust', 'Körpergewicht', 'dips', true],
  ['kh-schraegbankdruecken', 'Schrägbankdrücken mit Kurzhanteln', 'brust', 'Kurzhantel', 'dumbbellRack'],
  ['schraegbank-gefuehrt', 'Schrägbankdrücken geführt', 'brust', 'Multipresse', 'machines'],
  // Rücken
  ['kreuzheben', 'Kreuzheben', 'ruecken', 'Langhantel', 'deadliftDark'],
  ['klimmzuege', 'Klimmzüge', 'ruecken', 'Körpergewicht', 'pullupBW', true],
  ['latziehen', 'Latziehen breit', 'ruecken', 'Kabelzug', 'cableWoman'],
  ['latziehen-eng', 'Latziehen eng', 'ruecken', 'Kabelzug', 'cableWoman'],
  ['langhantelrudern', 'Langhantelrudern', 'ruecken', 'Langhantel', 'landmine'],
  ['kabelrudern', 'Kabelrudern', 'ruecken', 'Kabelzug', 'machineDark'],
  ['kh-rudern', 'Einarmiges Kurzhantelrudern', 'ruecken', 'Kurzhantel', 'backWoman'],
  ['face-pulls', 'Face Pulls', 'ruecken', 'Kabelzug', 'backMuscles'],
  ['t-bar-rudern', 'T-Bar-Rudern', 'ruecken', 'T-Bar', 'landmine'],
  ['rudern-kabelturm', 'Rudern am Kabelturm', 'ruecken', 'Kabelzug', 'cableWoman'],
  ['ueberzuege-kabelturm', 'Überzüge am Kabelturm', 'ruecken', 'Kabelzug', 'gymDark'],
  ['rudermaschine-breit', 'Rudermaschine breit', 'ruecken', 'Maschine', 'machineDark'],
  // Beine
  ['kniebeugen', 'Kniebeugen', 'beine', 'Langhantel', 'rackDark'],
  ['rum-kreuzheben', 'Rumänisches Kreuzheben', 'beine', 'Langhantel', 'womanBarbell'],
  ['beinpresse', 'Beinpresse', 'beine', 'Maschine', 'machines'],
  ['beinstrecker', 'Beinstrecker', 'beine', 'Maschine', 'machineDark'],
  ['beinbeuger', 'Beinbeuger', 'beine', 'Maschine', 'gymDark'],
  ['wadenheben', 'Wadenheben', 'beine', 'Maschine', 'feetBarbell'],
  ['ausfallschritte', 'Ausfallschritte', 'beine', 'Kurzhantel', 'lunges'],
  ['hip-thrusts', 'Hip Thrusts', 'beine', 'Langhantel', 'barbellLegs'],
  ['bulgarian-split', 'Bulgarian Split Squats', 'beine', 'Kurzhantel', 'industrial'],
  // Schultern
  ['schulterdruecken', 'Schulterdrücken', 'schultern', 'Langhantel', 'overheadWoman'],
  ['kh-schulterdruecken', 'Kurzhantel-Schulterdrücken', 'schultern', 'Kurzhantel', 'muscleDumbbells'],
  ['seitheben', 'Seitheben', 'schultern', 'Kurzhantel', 'darkMan'],
  ['arnold-press', 'Arnold Press', 'schultern', 'Kurzhantel', 'trainer'],
  ['reverse-flys', 'Reverse Flys', 'schultern', 'Kurzhantel', 'armDark'],
  ['schulterdruecken-maschine', 'Schulterdrücken Maschine', 'schultern', 'Maschine', 'industrial'],
  ['seitheben-maschine', 'Seitheben Maschine', 'schultern', 'Maschine', 'machineDark'],
  // Arme
  ['bizepscurls', 'Bizepscurls', 'arme', 'Langhantel', 'curlDark'],
  ['hammercurls', 'Hammercurls', 'arme', 'Kurzhantel', 'seatedDumbbells'],
  ['sz-curls', 'SZ-Curls', 'arme', 'SZ-Stange', 'tattooArm'],
  ['trizepsdruecken', 'Trizepsdrücken', 'arme', 'Kabelzug', 'cableChest'],
  ['french-press', 'French Press', 'arme', 'SZ-Stange', 'wristStrap'],
  ['konzentrationscurls', 'Konzentrationscurls', 'arme', 'Kurzhantel', 'chalkGrip'],
  ['curls-einarmig-kabel', 'Bizepscurls einarmig am Kabelturm', 'arme', 'Kabelzug', 'armDark'],
  ['bizeps-maschine', 'Bizepsmaschine', 'arme', 'Maschine', 'curlDark'],
  // Core
  ['plank', 'Plank', 'core', 'Körpergewicht', 'plank', true],
  ['crunches', 'Crunches', 'core', 'Körpergewicht', 'crunchWoman', true],
  ['beinheben', 'Hängendes Beinheben', 'core', 'Körpergewicht', 'ropesInterior', true],
  ['russian-twists', 'Russian Twists', 'core', 'Kurzhantel', 'pushupDumbbell'],
  ['ab-wheel', 'Ab Wheel Rollouts', 'core', 'Ab Wheel', 'concrete', true],
]

export const SEED_EXERCISES: Exercise[] = ROWS.map(([id, name, muscle_group, equipment, img, bw]) => ({
  id,
  user_id: null,
  name,
  muscle_group,
  equipment,
  image_url: exerciseImage(id, photo(img, 1200)),
  is_custom: false,
  bodyweight: !!bw,
}))

export function seedTemplates(): Template[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'tpl-push',
      name: 'Push Day',
      cover_url: PLAN_COVERS.push,
      created_at: now,
      items: [
        { exercise_id: 'bankdruecken', target_sets: 4, target_reps: 6 },
        { exercise_id: 'schraegbankdruecken', target_sets: 3, target_reps: 8 },
        { exercise_id: 'schulterdruecken', target_sets: 3, target_reps: 8 },
        { exercise_id: 'seitheben', target_sets: 3, target_reps: 12 },
        { exercise_id: 'trizepsdruecken', target_sets: 3, target_reps: 12 },
      ],
    },
    {
      id: 'tpl-pull',
      name: 'Pull Day',
      cover_url: PLAN_COVERS.pull,
      created_at: now,
      items: [
        { exercise_id: 'kreuzheben', target_sets: 3, target_reps: 5 },
        { exercise_id: 'klimmzuege', target_sets: 3, target_reps: 8 },
        { exercise_id: 'langhantelrudern', target_sets: 3, target_reps: 8 },
        { exercise_id: 'face-pulls', target_sets: 3, target_reps: 15 },
        { exercise_id: 'bizepscurls', target_sets: 3, target_reps: 10 },
      ],
    },
    {
      id: 'tpl-legs',
      name: 'Leg Day',
      cover_url: PLAN_COVERS.legs,
      created_at: now,
      items: [
        { exercise_id: 'kniebeugen', target_sets: 4, target_reps: 6 },
        { exercise_id: 'rum-kreuzheben', target_sets: 3, target_reps: 8 },
        { exercise_id: 'beinpresse', target_sets: 3, target_reps: 10 },
        { exercise_id: 'beinbeuger', target_sets: 3, target_reps: 12 },
        { exercise_id: 'wadenheben', target_sets: 4, target_reps: 15 },
      ],
    },
  ]
}

/** Deterministische Demo-Historie (≈10 Wochen PPL mit progressiver Überlastung) */
export function demoHistory(): Workout[] {
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const base: Record<string, [number, number]> = {
    bankdruecken: [70, 6], schraegbankdruecken: [55, 8], schulterdruecken: [42.5, 8], seitheben: [10, 12],
    trizepsdruecken: [25, 12], kreuzheben: [110, 5], klimmzuege: [0, 7], langhantelrudern: [60, 8],
    'face-pulls': [20, 15], bizepscurls: [30, 10], kniebeugen: [90, 6], 'rum-kreuzheben': [80, 8],
    beinpresse: [160, 10], beinbeuger: [40, 12], wadenheben: [80, 15],
  }
  const tpls = seedTemplates()
  const out: Workout[] = []
  const today = new Date()
  today.setHours(18, 30, 0, 0)
  const weeks = 10
  let t = 0
  for (let w = weeks; w >= 0; w--) {
    const days = rnd() > 0.35 ? [0, 2, 4] : [1, 3]
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    for (const d of days) {
      const date = new Date(monday)
      date.setDate(monday.getDate() - w * 7 + d)
      if (date.getTime() > Date.now() - 86400000) continue // heute frei lassen
      date.setHours(17 + Math.floor(rnd() * 3), Math.floor(rnd() * 60))
      const tpl = tpls[t++ % 3]
      const progress = (weeks - w) / weeks
      const exercises = tpl.items.map((it, pos) => {
        const [bw, br] = base[it.exercise_id] ?? [20, 10]
        const weight = bw === 0 ? 0 : Math.round((bw * (1 + progress * 0.14) + (rnd() - 0.4) * 2.5) / 2.5) * 2.5
        return {
          id: `we-${out.length}-${pos}`,
          exercise_id: it.exercise_id,
          position: pos,
          sets: Array.from({ length: it.target_sets }, (_, i) => ({
            id: `s-${out.length}-${pos}-${i}`,
            set_number: i + 1,
            weight,
            reps: Math.max(1, br + (bw === 0 ? Math.round(progress * 4) : 0) - (i > 1 ? Math.round(rnd()) : 0)),
            done: true,
          })),
        }
      })
      const dur = 55 + Math.floor(rnd() * 30)
      out.push({
        id: `demo-${out.length}`,
        name: tpl.name,
        template_id: tpl.id,
        started_at: date.toISOString(),
        ended_at: new Date(date.getTime() + dur * 60000).toISOString(),
        notes: '',
        exercises,
      })
    }
  }
  return out
}
