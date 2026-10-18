import { Link } from 'react-router-dom'
import { ChevronRight, Flame, UserPlus, Users } from 'lucide-react'
import { useSocial } from '@/state/social'
import { useData } from '@/state/store'
import { SectionTitle } from '@/components/bits'
import { CHALLENGE_LABEL, type Buddy } from '@/data/social'
import { RespectButton, ago, fmtScore, useDuel } from '@/pages/Buddies'
import { cn, nf } from '@/lib/utils'

/** Dashboard-Karte: was machen meine Buddys, wer führt die Challenge? */
export function BuddyStrip() {
  const { buddies, ready, setupMissing, error } = useSocial()
  if (!ready) return null
  if (setupMissing || error)
    return (
      <section>
        <SectionTitle>Deine Buddys</SectionTitle>
        <Link to="/buddys" className="card flex items-center gap-4 border-blaze/30 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blaze/15 text-blaze"><Users size={22} /></span>
          <span className="flex-1 text-sm">
            <span className="block font-semibold text-white">Buddys noch nicht eingerichtet</span>
            <span className="text-white/55">{setupMissing ? 'In Supabase muss einmal die Datei „ironlog-social.sql“ ausgeführt werden.' : error}</span>
          </span>
          <ChevronRight className="text-white/30" />
        </Link>
      </section>
    )
  return (
    <section>
      <SectionTitle action={<Link to="/buddys" className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-lime">Alle <ChevronRight size={14} /></Link>}>Deine Buddys</SectionTitle>
      {buddies.length === 0 ? (
        <Link to="/buddys" className="card group flex items-center gap-4 p-5 transition hover:border-lime/30">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><UserPlus size={22} /></span>
          <span className="flex-1">
            <span className="block font-semibold">Trainier nicht allein</span>
            <span className="text-sm text-white/50">Lad deinen Trainingspartner ein – Wochen-Challenges, Duo-Streak & Respekt 🔥</span>
          </span>
          <ChevronRight className="text-white/30 transition group-hover:translate-x-1 group-hover:text-lime" />
        </Link>
      ) : (
        <div className="card divide-y divide-white/[0.05]">
          {buddies.slice(0, 3).map((b) => <Row key={b.id} b={b} />)}
          {buddies.length > 3 && (
            <Link to="/buddys" className="flex items-center justify-center gap-2 p-3 text-xs font-semibold text-white/50 hover:text-lime"><Users size={14} /> {buddies.length - 3} weitere</Link>
          )}
        </div>
      )}
    </section>
  )
}

function Row({ b }: { b: Buddy }) {
  const { profile } = useData()
  const d = useDuel(b)
  const last = d.theirs[0]
  const first = b.name.split(' ')[0]
  const me = profile?.display_name?.split(' ')[0] || 'Du'
  const today = last && ago(last.started_at) === 'heute'
  return (
    <div className="flex items-center gap-3 p-4">
      <Link to="/buddys" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime/15 font-display text-2xl text-lime">
        {first.charAt(0).toUpperCase()}
        <span className={cn('absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-800', today ? 'bg-lime' : 'bg-white/25')} />
      </Link>
      <Link to="/buddys" className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{first}</span>
          {d.streak > 0 && <span className="flex items-center gap-0.5 text-xs font-bold text-blaze"><Flame size={12} fill="currentColor" />{d.streak}</span>}
        </div>
        <div className="truncate text-xs text-white/50">
          {last ? `${last.name} · ${ago(last.started_at)}${last.volume != null ? ` · ${nf(last.volume / 1000, 1)} t` : ''}` : 'noch kein Training'}
        </div>
        {last?.prs[0] && <div className="truncate text-xs font-semibold text-lime">🏆 {last.prs[0].name} {nf(last.prs[0].weight, 1)} kg × {last.prs[0].reps}</div>}
        <div className="mt-0.5 truncate text-[11px] text-white/40">
          {CHALLENGE_LABEL[d.now.kind].title}: {me} {fmtScore(d.now.kind, d.now.myVal)} : {fmtScore(d.now.kind, d.now.theirVal)} {first}
        </div>
      </Link>
      {last && <RespectButton s={last} small />}
    </div>
  )
}
