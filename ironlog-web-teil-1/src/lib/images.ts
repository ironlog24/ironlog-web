import type { MuscleGroup } from '@/data/types'

/**
 * Zentrale Bildquelle. Alle Fotos stammen von Unsplash (Unsplash License).
 * IDs wurden gesichtet – hier lassen sich Motive bequem austauschen.
 */
export const U = {
  dumbbellRack: '1534438327276-14e5300c3a48',
  barbellLegs: '1517836357463-d25dfeac3438',
  crunchWoman: '1571019613454-1cb2f99b2d8b',
  curlDark: '1583454110551-21f2fa2afe61',
  cableChest: '1581009146145-b5ef050c2e1e',
  battleRopes: '1599058917212-d750089bc07e',
  overheadWoman: '1541534741688-6078c6bfb5c5',
  backWoman: '1574680096145-d05b474e2155',
  pullupBW: '1526506118085-60ce8714f8c5',
  deadliftDark: '1605296867304-46d5465a13f1',
  dumbbellsClose: '1576678927484-cc907957088c',
  pushupDumbbell: '1594737625785-a6cbdabd333c',
  pressMan: '1532029837206-abbe2b7620e3',
  womanBW: '1550345332-09e3ac987658',
  benchPress: '1584466977773-e625c37cdd50',
  landmine: '1597452485669-2c7bb5fef90d',
  pushupWoman: '1598971639058-fab3c3109a00',
  dips: '1530822847156-5df684ec5ee1',
  plank: '1566241142559-40e1dab266c6',
  concrete: '1599058945522-28d584b6f0ff',
  chalkGrip: '1549060279-7e168fcee0c2',
  platesBW: '1544033527-b192daee1f5b',
  lunges: '1567598508481-65985588e295',
  rackDark: '1590487988256-9ed24133863e',
  backMuscles: '1603287681836-b174ce5074c2',
  seatedDumbbells: '1579758629938-03607ccdbaba',
  feetBarbell: '1517963879433-6ad2b056d712',
  machineDark: '1558611848-73f7eb4001a1',
  gymDark: '1593079831268-3381b0db4a77',
  womanBarbell: '1595078475328-1ab05d0a6a0e',
  trainer: '1571019614242-c5c5dee9f50b',
  machines: '1571902943202-507ec2618e8f',
  industrial: '1623874514711-0f321325f318',
  tattooArm: '1534367507873-d2d7e24c797f',
  cableWoman: '1574680178050-55c6a6a96e0a',
  ropesInterior: '1599058918144-1ffabb6ab9a0',
  darkMan: '1611672585731-fa10603fb9e0',
  muscleDumbbells: '1585152968992-d2b9444408cc',
  wristStrap: '1517838277536-f5f99be501cd',
  armDark: '1591940742878-13aba4b7a34e',
} as const

export type PhotoKey = keyof typeof U

export function unsplash(idOrUrl: string, w = 1200, q = 70) {
  if (idOrUrl.startsWith('http') || idOrUrl.startsWith('data:') || idOrUrl.startsWith('blob:')) return idOrUrl
  return `https://images.unsplash.com/photo-${idOrUrl}?auto=format&fit=crop&w=${w}&q=${q}`
}
export function photo(key: PhotoKey, w = 1200) {
  return unsplash(U[key], w)
}
/** Winzige Version für den Blur-Placeholder */
export function tiny(src: string) {
  if (!src.includes('images.unsplash.com')) return null
  return src.replace(/w=\d+/, 'w=32').replace(/q=\d+/, 'q=20')
}

export const HERO = {
  landing: photo('deadliftDark', 1800),
  dashboard: photo('rackDark', 1600),
  login: photo('womanBW', 1400),
  empty: photo('concrete', 1200),
  recap: photo('chalkGrip', 1200),
  progress: photo('platesBW', 1600),
  history: photo('gymDark', 1600),
  library: photo('dumbbellRack', 1600),
  templates: photo('industrial', 1600),
}

export const FEATURE = {
  track: photo('chalkGrip', 900),
  progress: photo('dumbbellsClose', 900),
  records: photo('womanBarbell', 900),
}

export const MUSCLE_COVER: Record<MuscleGroup, string> = {
  brust: photo('benchPress', 1000),
  ruecken: photo('backMuscles', 1000),
  beine: photo('barbellLegs', 1000),
  schultern: photo('muscleDumbbells', 1000),
  arme: photo('tattooArm', 1000),
  core: photo('plank', 1000),
}

import pushCover from '@/assets/covers/push.jpg'
import pullCover from '@/assets/covers/pull.jpg'
import legsCover from '@/assets/covers/legs.jpg'

/** Passende Cover für die Standard-Pläne (im App-Farbton) */
export const PLAN_COVERS = { push: pushCover, pull: pullCover, legs: legsCover }

/** Frühere Standard-Cover → neue, passende Cover (für bereits gespeicherte Pläne) */
export const LEGACY_COVER_MAP: Record<string, string> = {
  [photo('pressMan', 1000)]: pushCover,
  [photo('pullupBW', 1000)]: pullCover,
  [photo('feetBarbell', 1000)]: legsCover,
}

export const TEMPLATE_COVERS: string[] = [
  pushCover,
  pullCover,
  legsCover,
  photo('darkMan', 1000),
  photo('battleRopes', 1000),
  photo('ropesInterior', 1000),
  photo('backWoman', 1000),
  photo('rackDark', 1000),
]

/** Motivationssprüche (täglich wechselnd) */
export const QUOTES = [
  'Disziplin schlägt Motivation. Jeden einzelnen Tag.',
  'Das Gewicht lügt nicht. Es wartet nur auf dich.',
  'Stark wird man nicht an guten Tagen.',
  'Ein Satz mehr. Eine Wiederholung mehr. Ein Ich mehr.',
  'Du trainierst nicht für heute. Du trainierst für dich in einem Jahr.',
  'Schweiß ist nur Schwäche, die den Körper verlässt.',
  'Kein Aufzug zum Erfolg. Nimm die Langhantel.',
  'Konstanz baut Muskeln. Ausreden bauen nichts.',
  'Die letzte Wiederholung ist die, die zählt.',
  'Komm wieder. Leg drauf. Wiederhole.',
]
export function quoteOfDay(d = new Date()) {
  const day = Math.floor(d.getTime() / 86400000)
  return QUOTES[day % QUOTES.length]
}
