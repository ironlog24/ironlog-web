import { useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Link2, Loader2, MoreHorizontal, Share2, Swords, Trophy, UserMinus, UserPlus, Users } from 'lucide-react'
import { useData } from '@/state/store'
import { useSocial } from '@/state/social'
import { Page } from '@/components/motion'
import { Container, PageHero, Seg, SectionTitle } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ShareCardDialog } from '@/components/ShareCardDialog'
import { HERO } from '@/lib/images'
import { cn, nf } from '@/lib/utils'
import { isoWeek } from '@/data/stats'
import {
  CHALLENGE_LABEL, STREAK_MILESTONES, addWeeks, challengeKind, duoStreak, inviteUrl, score, weekStart, weekStats,
  type Buddy, type ChallengeKind, type Summary,
} from '@/data/social'
import type { CardSpec } from '@/lib/shareCards'

/* ── Helfer ── */

export function ago(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((+today - +day) / 86400000)
  if (diff <= 0) return 'heute'
  if (diff === 1) return 'gestern'
  if (diff < 7) return `vor ${diff} Tagen`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d)
}

export const fmtScore = (kind: ChallengeKind, v: number | null) =>
  kind === 'konstanz' ? String(v ?? 0) : v == null ? '–' : `${v > 0 ? '+' : ''}${nf(v, 0)} %`

/** Duell-Daten zwischen mir und einem Buddy */
export function useDuel(buddy: Buddy) {
  const { summaries, mine, shareLevel } = useSocial()
  return useMemo(() => {
    const theirs = summaries.filter((s) => s.user_id === buddy.id)
    const volOk = shareLevel === 'stats' && buddy.shareLevel === 'stats'
    const wk = weekStart()
    const last = addWeeks(wk, -1)
    const mk = (week: Date) => {
      const kind = challengeKind(week, volOk)
      const a = weekStats(mine, week)
      const b = weekStats(theirs, week)
      const sa = score(kind, a)
      const sb = score(kind, b)
      const disp = (s: ReturnType<typeof weekStats>) => (kind === 'konstanz' ? s.count : s.growth)
      return { kind, week, me: a, them: b, myVal: disp(a), theirVal: disp(b), lead: sa === sb ? 0 : sa > sb ? 1 : -1 }
    }
    const daysLeft = Math.max(0, Math.ceil((+addWeeks(wk, 1) - Date.now()) / 86400000))
    return { theirs, now: mk(wk), last: mk(last), streak: duoStreak(mine, theirs), daysLeft, lastTrained: theirs[0]?.started_at ?? null }
  }, [summaries, mine, shareLevel, buddy])
}

function Bar({ label, value, max, text, win }: { label: string; value: number; max: number; text: string; win: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 truncate text-sm font-semibold">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${max > 0 ? Math.max(4, (value / max) * 100) : 4}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', win ? 'bg-lime shadow-glow-sm' : 'bg-white/35')}
        />
      </div>
      <span className={cn('num w-16 text-right text-sm', win ? 'text-lime' : 'text-white/70')}>{text}</span>
    </div>
  )
}

/* ── Seite ── */

export default function Buddies() {
  const { profile } = useData()
  const s = useSocial()
  const myName = profile?.display_name?.split(' ')[0] || 'Ich'
  const [card, setCard] = useState<{ spec: CardSpec; title: string; text: string } | null>(null)
  const link = s.code ? inviteUrl(s.code) : ''

  const weekCount = useMemo(() => weekStats(s.mine, weekStart()).count, [s.mine])

  async function shareLink() {
    const text = `Trainier mit mir auf IRONLOG und tritt gegen mich an 💪 Mein Code: ${s.code}`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: 'IRONLOG', text, url: link })
        return
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`)
      s.toast('Einladung kopiert ✓ – jetzt bei WhatsApp einfügen')
    } catch {
      s.toast(link)
    }
  }

  return (
    <Page>
      <PageHero image={HERO.history} kicker="Gemeinsam stärker" title="Buddys" />
      <Container className="mt-6 space-y-8 pb-32 md:pb-16">
        {s.setupMissing && (
          <p className="rounded-2xl border border-blaze/30 bg-blaze/10 p-4 text-sm text-blaze">
            In Supabase fehlt noch die Einrichtung für Buddys. Bitte die Datei <b>ironlog-social.sql</b> im SQL Editor ausführen und die Seite neu laden.
          </p>
        )}
        {s.error && !s.setupMissing && <p className="rounded-2xl bg-blaze/10 p-4 text-sm text-blaze">{s.error}</p>}

        {/* Einladen */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card relative overflow-hidden p-5">
            <div className="label mb-2 flex items-center gap-1.5"><UserPlus size={12} /> Dein Einladungscode</div>
            <div className="num text-[44px] leading-none text-lime drop-shadow-[0_0_18px_rgba(198,255,0,.45)]" data-testid="invite-code">{s.code || '…'}</div>
            <p className="mt-2 text-sm text-white/55">Schick ihn deinem Trainingspartner. Über den Link seid ihr nach der Registrierung automatisch verbunden.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={shareLink} disabled={!s.code}><Link2 size={16} /> Einladen</Button>
              <Button variant="soft" disabled={!s.code} onClick={() => setCard({ title: 'Herausforderung', text: `Ich war diese Woche ${weekCount}× im Gym. Schaffst du mehr? 👊`, spec: { kind: 'challenge', name: myName, count: weekCount, link } })}>
                <Swords size={16} /> Schlag mich
              </Button>
            </div>
          </section>
          <JoinCard />
        </div>

        {/* Buddys */}
        <section>
          <SectionTitle action={<span className="chip"><Users size={13} className="text-lime" />{s.buddies.length}</span>}>Deine Buddys</SectionTitle>
          {!s.ready ? (
            <div className="grid h-32 place-items-center"><Loader2 className="animate-spin text-white/40" /></div>
          ) : s.buddies.length === 0 ? (
            <div className="card p-6 text-center text-white/55">
              <Users className="mx-auto mb-3 text-lime" size={30} />
              Noch keine Buddys. Lad deinen Trainingspartner ein und startet eure erste Wochen-Challenge.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {s.buddies.map((b) => (
                <DuelCard key={b.id} buddy={b} myName={myName} onCard={setCard} link={link} />
              ))}
            </div>
          )}
        </section>

        <Received />

        {/* Privatsphäre */}
        <section className="card p-5">
          <div className="label mb-1">Was deine Buddys sehen</div>
          <p className="mb-3 text-sm text-white/55">
            {s.shareLevel === 'stats' ? 'Buddys sehen Trainingsname, Dauer, Volumen und PRs.' : 'Buddys sehen nur, wann du trainiert hast – die Challenge ist dann immer „Konstanz“.'} Körpergewicht, Ernährung und einzelne Sätze sind immer privat.
          </p>
          <Seg
            value={s.shareLevel}
            onChange={(v) => s.setShareLevel(v).catch((e) => s.toast(String(e?.message ?? e)))}
            options={[{ v: 'stats', l: 'Volumen & PRs' }, { v: 'basic', l: 'Nur „trainiert“' }]}
          />
        </section>
      </Container>

      <ShareCardDialog spec={card?.spec ?? null} title={card?.title} text={card?.text ?? ''} onClose={() => setCard(null)} />
    </Page>
  )
}

function JoinCard() {
  const s = useSocial()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      const name = await s.accept(code)
      setMsg({ ok: true, text: `Verbunden mit ${name} 🤝` })
      setCode('')
    } catch (x) {
      setMsg({ ok: false, text: String((x as Error)?.message ?? x) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card p-5">
      <div className="label mb-2">Code von einem Freund?</div>
      <form onSubmit={submit} className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="IRON-XXXXX" aria-label="Einladungscode" autoCapitalize="characters" className="num tracking-wider" />
        <Button type="submit" disabled={busy || !code.trim()}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Verbinden</Button>
      </form>
      {msg && <p className={cn('mt-3 rounded-2xl px-4 py-3 text-sm', msg.ok ? 'bg-lime/10 text-lime' : 'bg-blaze/10 text-blaze')}>{msg.text}</p>}
      <p className="mt-3 text-xs text-white/40">Verbunden seid ihr beide gleichzeitig – keine Anfrage, kein Warten.</p>
    </section>
  )
}

export function RespectButton({ s: sum, small }: { s: Summary; small?: boolean }) {
  const { user } = useData()
  const { reactions, react } = useSocial()
  const on = reactions.some((r) => r.workout_id === sum.id && r.from_user === user?.id)
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => react(sum.id, sum.user_id, !on)}
      aria-pressed={on}
      aria-label={on ? 'Respekt zurücknehmen' : 'Respekt geben'}
      className={cn(
        'flex items-center gap-1.5 rounded-full border font-bold transition',
        small ? 'h-8 px-3 text-[11px]' : 'h-9 px-3.5 text-xs',
        on ? 'border-blaze/50 bg-blaze/15 text-blaze shadow-glow-orange' : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white',
      )}
    >
      <Flame size={small ? 13 : 14} fill={on ? 'currentColor' : 'none'} /> {on ? 'Gegeben' : 'Respekt'}
    </motion.button>
  )
}

function DuelCard({ buddy, myName, onCard, link }: { buddy: Buddy; myName: string; onCard: (c: { spec: CardSpec; title: string; text: string }) => void; link: string }) {
  const s = useSocial()
  const d = useDuel(buddy)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const first = buddy.name.split(' ')[0]
  const label = CHALLENGE_LABEL[d.now.kind]
  const nowMax = d.now.kind === 'konstanz' ? Math.max(d.now.myVal ?? 0, d.now.theirVal ?? 0, 3) : Math.max(Math.abs(d.now.myVal ?? 0), Math.abs(d.now.theirVal ?? 0), 10)
  const lastPlayed = d.last.me.count + d.last.them.count > 0
  const lastWinner = d.last.lead === 0 ? null : d.last.lead > 0 ? myName : first
  const milestone = STREAK_MILESTONES.includes(d.streak)
  const trainedToday = d.lastTrained && ago(d.lastTrained) === 'heute'

  const resultCard = () =>
    onCard({
      title: 'Ergebnis teilen',
      text: lastWinner ? `${lastWinner} gewinnt die ${CHALLENGE_LABEL[d.last.kind].title}-Challenge 🏅` : 'Unentschieden in unserer Wochen-Challenge 🤝',
      spec: {
        kind: 'duel', week: `KW ${isoWeek(d.last.week)}`, title: CHALLENGE_LABEL[d.last.kind].title, me: myName, them: first,
        myScore: fmtScore(d.last.kind, d.last.myVal), theirScore: fmtScore(d.last.kind, d.last.theirVal), winner: lastWinner, streak: d.streak, link,
      },
    })

  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden" data-testid="duel-card">
      <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-lime/15 font-display text-2xl text-lime">
          {first.charAt(0).toUpperCase()}
          <span className={cn('absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-800', trainedToday ? 'bg-lime' : 'bg-white/25')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{buddy.name}</div>
          <div className="text-xs text-white/45">{d.lastTrained ? `zuletzt ${ago(d.lastTrained)}` : 'noch kein Training'}</div>
        </div>
        <div className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', d.streak ? 'bg-blaze/15 text-blaze' : 'bg-white/5 text-white/40')} title="Duo-Streak: Wochen in Folge, in denen ihr beide mind. 3× trainiert habt">
          <Flame size={13} fill={d.streak ? 'currentColor' : 'none'} /> {d.streak}
        </div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60" aria-label={`Optionen für ${buddy.name}`}><MoreHorizontal size={17} /></button>
          {menu && (
            <div className="glass absolute right-0 top-11 z-20 w-48 rounded-2xl p-1.5">
              <button onClick={() => { setMenu(false); setConfirm(true) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-blaze hover:bg-blaze/10"><UserMinus size={15} /> Buddy entfernen</button>
            </div>
          )}
        </div>
      </header>

      {/* Challenge dieser Woche */}
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="label !text-lime/90 flex items-center gap-1.5"><Swords size={12} /> Challenge KW {isoWeek(d.now.week)} · {label.title}</div>
            <div className="mt-0.5 text-xs text-white/45">{label.sub}</div>
          </div>
          <span className="chip shrink-0">noch {d.daysLeft} {d.daysLeft === 1 ? 'Tag' : 'Tage'}</span>
        </div>
        <div className="space-y-2.5">
          <Bar label={myName} value={Math.max(0, d.now.myVal ?? 0)} max={nowMax} text={fmtScore(d.now.kind, d.now.myVal)} win={d.now.lead > 0} />
          <Bar label={first} value={Math.max(0, d.now.theirVal ?? 0)} max={nowMax} text={fmtScore(d.now.kind, d.now.theirVal)} win={d.now.lead < 0} />
        </div>
        <p className="mt-3 text-xs font-semibold text-white/55">
          {d.now.lead > 0 ? '💪 Du führst – dranbleiben!' : d.now.lead < 0 ? `😤 ${first} führt – Zeit fürs Gym.` : 'Gleichstand – wer legt vor?'}
        </p>
      </div>

      {/* Letzte Woche + Streak */}
      {(lastPlayed || milestone) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-4 py-3">
          {lastPlayed && (
            <>
              <Trophy size={15} className={lastWinner === myName ? 'text-lime' : 'text-white/40'} />
              <span className="text-sm">
                Letzte Woche: <b className="num">{fmtScore(d.last.kind, d.last.myVal)} : {fmtScore(d.last.kind, d.last.theirVal)}</b>{' '}
                <span className="text-white/50">{lastWinner === myName ? '– gewonnen 🏅' : lastWinner ? `– ${first} gewinnt` : '– unentschieden'}</span>
              </span>
              <Button size="sm" variant="soft" className="ml-auto" onClick={resultCard}><Share2 size={14} /> Teilen</Button>
            </>
          )}
          {milestone && (
            <Button size="sm" variant="soft" onClick={() => onCard({ title: 'Duo-Streak', text: `${d.streak} Wochen in Folge zusammen im Gym 🔥`, spec: { kind: 'streak', weeks: d.streak, me: myName, them: first, link } })}>
              <Flame size={14} /> {d.streak}-Wochen-Streak teilen
            </Button>
          )}
        </div>
      )}

      {/* Letzte Trainings */}
      {d.theirs.length > 0 && (
        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {d.theirs.slice(0, 3).map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-white/45">
                  {ago(t.started_at)}
                  {t.volume != null && ` · ${nf(t.volume / 1000, 1)} t`}
                  {t.duration_min ? ` · ${t.duration_min} min` : ''}
                </div>
                {t.prs.length > 0 && <div className="mt-1 text-xs font-semibold text-lime">🏆 PR: {t.prs[0].name} {nf(t.prs[0].weight, 1)} kg × {t.prs[0].reps}</div>}
              </div>
              <RespectButton s={t} small />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Buddy entfernen?">
          <p className="text-sm text-white/65">Ihr seht danach gegenseitig keine Trainings mehr. Ihr könnt euch jederzeit wieder per Code verbinden.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="soft" onClick={() => setConfirm(false)}>Abbrechen</Button>
            <Button variant="danger" onClick={() => { setConfirm(false); s.remove(buddy.id).catch((e) => s.toast(String(e?.message ?? e))) }}><UserMinus size={15} /> Entfernen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.article>
  )
}

function Received() {
  const { user, workouts } = useData()
  const { reactions, buddies } = useSocial()
  const list = reactions
    .filter((r) => r.to_user === user?.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
  if (!list.length) return null
  return (
    <section>
      <SectionTitle>Respekt bekommen</SectionTitle>
      <ul className="card divide-y divide-white/[0.05]">
        {list.map((r) => {
          const who = buddies.find((b) => b.id === r.from_user)?.name ?? 'Ein Buddy'
          const w = workouts.find((x) => x.id === r.workout_id)
          return (
            <li key={r.workout_id + r.from_user} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Flame size={16} className="shrink-0 text-blaze" fill="currentColor" />
              <span className="flex-1"><b>{who}</b> <span className="text-white/60">gibt dir Respekt für</span> {w?.name ?? 'dein Training'}</span>
              <span className="text-xs text-white/40">{ago(r.created_at)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

