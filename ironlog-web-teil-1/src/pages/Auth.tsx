import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Loader2, Lock, Mail, User } from 'lucide-react'
import { api } from '@/data/api'
import { InviteBanner } from '@/components/InviteBanner'
import { Img } from '@/components/Img'
import { Logo } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HERO } from '@/lib/images'

function translateError(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/invalid login/i.test(m)) return 'E-Mail oder Passwort ist falsch.'
  if (/already registered/i.test(m)) return 'Diese E-Mail ist bereits registriert.'
  if (/password/i.test(m) && /6/.test(m)) return 'Das Passwort braucht mindestens 6 Zeichen.'
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  if (/rate limit|too many|security purposes/i.test(m)) return 'Zu viele Versuche. Bitte warte kurz und versuch es dann erneut.'
  if (/failed to fetch|network/i.test(m)) return 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.'
  return m
}

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null)

  async function forgot() {
    setMsg(null)
    const mail = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      setMsg({ type: 'err', text: 'Gib oben deine E-Mail-Adresse ein und tippe dann auf „Passwort vergessen?“.' })
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(mail)
      setMsg({ type: 'ok', text: 'Falls ein Konto existiert, ist jetzt eine E-Mail mit einem Link zum Zurücksetzen unterwegs. Schau auch im Spam-Ordner nach.' })
    } catch (err) {
      setMsg({ type: 'err', text: translateError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signup') {
        const r = await api.signUp(email.trim(), password, name.trim())
        if (r.needsConfirm) setMsg({ type: 'ok', text: 'Fast geschafft! Bestätige deine E-Mail und logge dich dann ein.' })
      } else {
        await api.signIn(email.trim(), password)
      }
    } catch (err) {
      setMsg({ type: 'err', text: translateError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="min-h-dvh md:grid md:grid-cols-2">
      <div className="relative h-[34vh] md:sticky md:top-0 md:h-dvh">
        <Img src={HERO.login} alt="" priority shade="none" className="absolute inset-0" imgClassName="animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40 md:bg-gradient-to-r md:from-transparent md:via-ink/20 md:to-ink" />
        <div className="pt-safe absolute left-0 top-0 flex w-full items-center justify-between p-5">
          <Link to="/" className="grid h-11 w-11 place-items-center rounded-2xl glass" aria-label="Zurück">
            <ArrowLeft size={18} />
          </Link>
          <Logo className="text-3xl md:hidden" />
        </div>
        <div className="absolute bottom-10 left-10 hidden md:block">
          <Logo className="text-6xl" />
          <p className="mt-2 max-w-xs text-white/60">Jede Wiederholung zählt.</p>
        </div>
      </div>

      <div className="relative -mt-10 flex items-start justify-center px-5 pb-16 md:mt-0 md:items-center md:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 inline-flex rounded-2xl border border-white/[0.06] bg-ink-800 p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => setParams({ mode: m })} className={`relative h-10 rounded-xl px-5 text-xs font-bold uppercase tracking-wider transition ${mode === m ? 'text-ink' : 'text-white/55'}`}>
                {mode === m && <motion.span layoutId="authseg" className="absolute inset-0 rounded-xl bg-lime shadow-glow-sm" />}
                <span className="relative">{m === 'login' ? 'Einloggen' : 'Registrieren'}</span>
              </button>
            ))}
          </div>

          <InviteBanner className="mb-6" />
          <AnimatePresence mode="wait">
            <motion.h1 key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-display text-6xl">
              {mode === 'login' ? 'Willkommen zurück.' : 'Los geht’s.'}
            </motion.h1>
          </AnimatePresence>
          <p className="mb-8 mt-2 text-white/55">{mode === 'login' ? 'Dein Fortschritt wartet auf dich.' : 'Leg dein Konto an und starte dein erstes Training.'}</p>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Field icon={User}>
                    <Input placeholder="Vorname" value={name} onChange={(e) => setName(e.target.value)} className="pl-11" autoComplete="given-name" />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
            <Field icon={Mail}>
              <Input type="email" required placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11" autoComplete="email" />
            </Field>
            <Field icon={Lock}>
              <Input type="password" required minLength={6} placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            {mode === 'login' && api.mode === 'supabase' && (
              <div className="flex justify-end">
                <button type="button" onClick={forgot} disabled={busy} className="text-xs font-semibold text-white/50 underline-offset-4 hover:text-lime hover:underline">
                  Passwort vergessen?
                </button>
              </div>
            )}
            {msg && <p className={`rounded-2xl px-4 py-3 text-sm ${msg.type === 'err' ? 'bg-blaze/10 text-blaze' : 'bg-lime/10 text-lime'}`}>{msg.text}</p>}
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={18} />}
              {mode === 'login' ? 'Einloggen' : 'Konto erstellen'}
            </Button>
          </form>
          {api.mode === 'demo' && (
            <p className="mt-6 rounded-2xl border border-lime/20 bg-lime/[0.06] p-4 text-xs leading-relaxed text-white/60">
              <b className="text-lime">Demo-Modus:</b> Kein Supabase-Projekt verbunden. Gib beliebige Daten ein – alles wird lokal in deinem Browser gespeichert. Du startest bei 0.
            </p>
          )}
          <p className="mt-8 text-xs text-white/40">
            {mode === 'signup' ? 'Wie wir deine Daten verarbeiten: ' : ''}
            <Link to="/datenschutz" className="underline-offset-4 hover:text-lime hover:underline">Datenschutzerklärung</Link>
            {' · '}
            <Link to="/impressum" className="underline-offset-4 hover:text-lime hover:underline">Impressum</Link>
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/35" />
      {children}
    </div>
  )
}
