import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Flame, LineChart, Trophy, Zap } from 'lucide-react'
import { InviteBanner } from '@/components/InviteBanner'
import { Img } from '@/components/Img'
import { Logo } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { FEATURE, HERO } from '@/lib/images'

const FEATURES = [
  { img: FEATURE.track, icon: Zap, k: '01', title: 'Tracken', text: 'Sätze, Gewichte, Wiederholungen – in Sekunden erfasst. Mit Pausen-Timer und deinen letzten Werten direkt im Blick.' },
  { img: FEATURE.progress, icon: LineChart, k: '02', title: 'Fortschritt sehen', text: 'Volumen, geschätztes 1RM und Muskelverteilung. Deine Entwicklung als klare, schöne Charts.' },
  { img: FEATURE.records, icon: Trophy, k: '03', title: 'Rekorde brechen', text: 'IRONLOG erkennt jeden neuen PR automatisch – und feiert ihn mit dir.' },
]

const word = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: 0, transition: { delay: 0.25 + i * 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }),
}

export default function Landing() {
  return (
    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="bg-ink">
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden">
        <div className="pt-safe absolute inset-x-0 top-20 z-20 mx-auto max-w-xl px-4"><InviteBanner cta /></div>
        <Img src={HERO.landing} alt="Athlet beim Kreuzheben" priority shade="none" className="absolute inset-0" imgClassName="animate-kenburns" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0A0A0A_0%,rgba(10,10,10,.75)_35%,rgba(10,10,10,.1)_70%,rgba(10,10,10,.6)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_70%_20%,rgba(198,255,0,.10),transparent_70%)]" />

        <div className="pt-safe absolute inset-x-0 top-0 z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
          <Logo className="text-[34px]" />
          <Button asChild variant="glass" size="sm">
            <Link to="/login?mode=login">Einloggen</Link>
          </Button>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-7xl px-5 pb-14 md:px-10 md:pb-20">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="chip mb-5 !border-lime/30 !bg-lime/10 !text-lime">
            <Flame size={13} /> Dein Gym-Tracker
          </motion.div>
          <h1 className="h-display text-[19vw] leading-[0.86] sm:text-[110px] md:text-[150px]">
            {['JEDE', 'WIEDERHOLUNG', 'ZÄHLT.'].map((w, i) => (
              <span key={w} className="block overflow-hidden">
                <motion.span custom={i} variants={word} initial="hidden" animate="show" className={`block ${i === 2 ? 'text-lime drop-shadow-[0_0_40px_rgba(198,255,0,.45)]' : ''}`}>
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 md:text-lg">
            Tracke jedes Training, sieh deinen Fortschritt schwarz auf weiß und brich Rekord um Rekord. Gebaut für Menschen, die es ernst meinen.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" className="animate-pulseglow">
              <Link to="/login?mode=signup">
                Jetzt starten <ArrowRight size={20} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/login?mode=login">Einloggen</Link>
            </Button>
          </motion.div>
        </div>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 text-white/40 md:block">
          <ChevronDown />
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="label mb-3 !text-lime">Warum IRONLOG</div>
        <h2 className="h-display mb-10 max-w-2xl text-5xl md:text-7xl">Weniger tippen. Mehr heben.</h2>
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.k}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 120, damping: 20 }}
              whileHover={{ y: -6 }}
              className="group relative h-[420px] overflow-hidden rounded-[28px] border border-white/[0.06]"
            >
              <Img src={f.img} alt={f.title} shade="none" className="absolute inset-0" imgClassName="transition-transform duration-[1.2s] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
              <div className="absolute left-5 top-5 font-display text-6xl text-white/15">{f.k}</div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink shadow-glow-sm transition group-hover:shadow-glow">
                  <f.icon size={22} />
                </div>
                <h3 className="h-display text-4xl">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{f.text}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <Img src={HERO.dashboard} alt="" shade="full" className="absolute inset-0" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-24 md:px-10">
          <h2 className="h-display text-6xl md:text-8xl">
            Dein nächster PR <span className="text-lime">wartet.</span>
          </h2>
          <Button asChild size="xl">
            <Link to="/login?mode=signup">
              Kostenlos starten <ArrowRight size={20} />
            </Link>
          </Button>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-xs text-white/35 md:px-10">
        <Logo className="text-2xl" />
        <span className="flex gap-4">
          <Link to="/impressum" className="hover:text-lime">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-lime">Datenschutz</Link>
        </span>
      </footer>
    </motion.div>
  )
}
