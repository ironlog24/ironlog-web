import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import { Check, Download, Home, Loader2, Share2, Trophy } from 'lucide-react'
import { useData } from '@/state/store'
import { Img } from '@/components/Img'
import { Logo } from '@/components/bits'
import { CountUp } from '@/components/CountUp'
import { Button } from '@/components/ui/button'
import { MUSCLE_COVER } from '@/lib/images'
import { fmtDate, fmtMinutes, nf } from '@/lib/utils'
import { doneSets, prEvents, workoutDuration, workoutVolume } from '@/data/stats'
import { prConfetti } from '@/lib/confetti'
import { useSocial } from '@/state/social'
import { inviteUrl } from '@/data/social'
import { siteUrl } from '@/data/api'
import { ShareCardDialog } from '@/components/ShareCardDialog'
import type { CardSpec } from '@/lib/shareCards'

export default function Recap() {
  const { id } = useParams()
  const { workouts, exMap } = useData()
  const nav = useNavigate()
  const card = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState<'idle' | 'busy'>('idle')
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [shareErr, setShareErr] = useState('')
  const w = workouts.find((x) => x.id === id)
  const { profile } = useData()
  const social = useSocial()
  const [prCard, setPrCard] = useState<CardSpec | null>(null)

  const data = useMemo(() => {
    if (!w) return null
    const prs = prEvents(workouts).filter((p) => p.workout_id === w.id)
    // Titelbild nach dominanter Muskelgruppe
    const counts = new Map<string, number>()
    for (const we of w.exercises) {
      const mg = exMap.get(we.exercise_id)?.muscle_group
      if (mg) counts.set(mg, (counts.get(mg) ?? 0) + we.sets.length)
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as keyof typeof MUSCLE_COVER | undefined
    return {
      prs,
      sets: doneSets(w).length,
      volume: workoutVolume(w),
      duration: workoutDuration(w),
      cover: top ? MUSCLE_COVER[top] : MUSCLE_COVER.brust,
    }
  }, [w, workouts, exMap])

  useEffect(() => {
    if (data?.prs.length) setTimeout(prConfetti, 700)
  }, [data?.prs.length])

  if (!w || !data) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-white/60">Training nicht gefunden.</p>
          <Button asChild><Link to="/">Zum Dashboard</Link></Button>
        </div>
      </div>
    )
  }

  function openPrCard() {
    const pr = [...data!.prs].sort((a, b) => b.e1rm - a.e1rm)[0]
    if (!pr) return
    // Verlauf: bestes Gewicht je Training dieser Übung
    const hist = workouts
      .filter((x) => x.ended_at && x.exercises.some((e) => e.exercise_id === pr.exercise_id))
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map((x) => Math.max(0, ...x.exercises.filter((e) => e.exercise_id === pr.exercise_id).flatMap((e) => e.sets.filter((st) => st.done).map((st) => st.weight))))
      .filter((v) => v > 0)
    const firstW = hist[0]
    const weeks = Math.max(1, Math.round((Date.now() - +new Date(workouts.filter((x) => x.exercises.some((e) => e.exercise_id === pr.exercise_id)).map((x) => x.started_at).sort()[0] ?? Date.now())) / (7 * 86400000)))
    setPrCard({
      kind: 'pr',
      exercise: exMap.get(pr.exercise_id)?.name ?? 'Übung',
      weight: pr.weight,
      reps: pr.reps,
      history: hist,
      deltaText: firstW && pr.weight > firstW ? `+${nf(pr.weight - firstW, 1)} kg in ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}` : undefined,
      name: profile?.display_name ?? '',
      link: social.code ? inviteUrl(social.code) : siteUrl(),
    })
  }

  async function share() {
    if (!card.current) return
    setSharing('busy')
    setShareErr('')
    const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#0A0A0A' }
    try {
      let url: string
      try {
        url = await toPng(card.current, opts)
      } catch {
        url = await toPng(card.current, { ...opts, skipFonts: true }) // z. B. wenn Schriften nicht geladen werden dürfen
      }
      const blob = await (await fetch(url)).blob()
      setPreview({ url, file: new File([blob], `ironlog-${w!.started_at.slice(0, 10)}.png`, { type: 'image/png' }) })
    } catch (e) {
      console.warn(e)
      setShareErr('Das Bild konnte nicht erstellt werden. Mach stattdessen einen Screenshot der Karte.')
    } finally {
      setSharing('idle')
    }
  }

  async function nativeShare() {
    if (!preview) return
    try {
      await navigator.share({ files: [preview.file], title: 'IRONLOG Recap', text: `${w!.name} – ${nf(data!.volume)} kg bewegt` })
    } catch {
      /* abgebrochen oder nicht erlaubt */
    }
  }

  function download() {
    if (!preview) return
    try {
      const a = document.createElement('a')
      a.href = preview.url
      a.download = preview.file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      /* noop */
    }
  }

  let canShareFile = false
  try {
    canShareFile = !!preview && !!navigator.canShare?.({ files: [preview.file] })
  } catch {
    canShareFile = false
  }

  const items = [
    { l: 'Dauer', v: fmtMinutes(data.duration) },
    { l: 'Sätze', v: String(data.sets) },
    { l: 'Übungen', v: String(w.exercises.length) },
  ]

  return (
    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="min-h-dvh px-4 pb-10 pt-6 md:py-12">
      <div className="mx-auto max-w-[420px]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
          <div className="label !text-lime">Training abgeschlossen</div>
        </motion.div>

        {/* STORY CARD */}
        <motion.div
          ref={card}
          initial={{ opacity: 0, scale: 0.92, rotateX: 12 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          className="relative aspect-[9/16] w-full overflow-hidden rounded-[32px] border border-white/10 bg-ink shadow-[0_40px_80px_-30px_rgba(198,255,0,.25)]"
        >
          <Img src={data.cover} alt="" priority shade="none" className="absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,10,.55)_0%,rgba(10,10,10,.2)_30%,rgba(10,10,10,.92)_62%,#0A0A0A_100%)]" />
          <div className="absolute inset-0 flex flex-col p-6">
            <div className="flex items-center justify-between">
              <Logo className="text-[28px]" />
              <span className="chip !border-white/15 !bg-black/30 backdrop-blur">{fmtDate(w.started_at, { day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="mt-auto">
              <div className="label !text-lime">Recap</div>
              <h1 className="h-display mt-1 text-[58px]">{w.name}</h1>
              <div className="mt-4">
                <div className="label">Volumen</div>
                <div className="num text-[64px] leading-none text-lime drop-shadow-[0_0_28px_rgba(198,255,0,.5)]">
                  <CountUp value={data.volume} duration={1.6} /><span className="ml-1 text-2xl text-white/50">kg</span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {items.map((it, i) => (
                  <motion.div key={it.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur">
                    <div className="label !text-[9px]">{it.l}</div>
                    <div className="num mt-0.5 text-xl">{it.v}</div>
                  </motion.div>
                ))}
              </div>
              {data.prs.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-3 rounded-2xl border border-blaze/40 bg-blaze/10 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-blaze">
                    <Trophy size={13} /> {data.prs.length} {data.prs.length === 1 ? 'neuer PR' : 'neue PRs'}
                  </div>
                  {data.prs.slice(0, 3).map((p) => (
                    <div key={p.exercise_id} className="flex justify-between text-sm">
                      <span className="truncate text-white/80">{exMap.get(p.exercise_id)?.name}</span>
                      <span className="num">{p.weight > 0 ? `${nf(p.weight, 1)} kg × ${p.reps}` : `${p.reps} Wdh.`}</span>
                    </div>
                  ))}
                </motion.div>
              )}
              <div className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">Jede Wiederholung zählt</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <Button size="lg" onClick={share} disabled={sharing === 'busy'}>
            {sharing === 'busy' ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
            Als Bild teilen
          </Button>
          <Button variant="soft" size="lg" onClick={() => nav('/')} aria-label="Zum Dashboard"><Home size={18} /></Button>
        </div>
        {shareErr && <p className="mt-3 rounded-2xl bg-blaze/10 px-4 py-3 text-sm text-blaze">{shareErr}</p>}
        {data.prs.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            onClick={openPrCard}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-lime/30 bg-lime/[0.08] p-4 text-left shadow-glow-sm transition hover:bg-lime/[0.14]"
          >
            <Trophy className="shrink-0 text-lime" size={22} />
            <span className="flex-1">
              <span className="block text-sm font-bold">Neuer PR! Als Story teilen?</span>
              <span className="text-xs text-white/55">PR-Karte mit QR-Code – deine Freunde können direkt gegen dich antreten.</span>
            </span>
            <Share2 size={18} className="text-lime" />
          </motion.button>
        )}
      </div>
      <ShareCardDialog spec={prCard} title="PR teilen" text="Neuer PR auf IRONLOG 🏆 Schlag das 👊" onClose={() => setPrCard(null)} />
      {preview && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-black/85 p-5 backdrop-blur-xl" role="dialog" aria-label="Recap-Bild">
          <img src={preview.url} alt="IRONLOG Recap" className="max-h-[62dvh] w-auto max-w-full rounded-[24px] shadow-glow-sm" />
          <p className="max-w-xs text-center text-xs text-white/55">Bild gedrückt halten oder Rechtsklick → „Bild speichern“.</p>
          <div className="grid w-full max-w-[360px] gap-2">
            {canShareFile && <Button size="lg" onClick={nativeShare}><Share2 size={18} />Teilen</Button>}
            <Button variant={canShareFile ? 'soft' : 'neon'} size="lg" onClick={download}><Download size={18} />Herunterladen</Button>
            <Button variant="ghost" size="lg" onClick={() => setPreview(null)}><Check size={18} />Fertig</Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
