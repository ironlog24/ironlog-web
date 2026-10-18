import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, KeyRound, Loader2, LogOut, Save, Scale, ShieldCheck, Timer, Trash2, User, Users } from 'lucide-react'
import { useData } from '@/state/store'
import { api } from '@/data/api'
import { deleteAccount, exportJson, exportSetsCsv } from '@/data/account'
import { Page } from '@/components/motion'
import { Container, PageHero } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { HERO } from '@/lib/images'

type Msg = { type: 'ok' | 'err'; text: string } | null

function Card({ icon: Icon, title, children }: { icon: typeof User; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-white/[0.06] bg-ink-800/80 p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-2xl tracking-wide">
        <Icon size={20} className="text-lime" /> {title}
      </h2>
      {children}
    </section>
  )
}

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null
  return <p className={`mt-3 rounded-2xl px-4 py-3 text-sm ${msg.type === 'err' ? 'bg-blaze/10 text-blaze' : 'bg-lime/10 text-lime'}`}>{msg.text}</p>
}

const errText = (e: unknown) => (e as { message?: string })?.message ?? String(e)

export default function Settings() {
  const { user, profile, updateProfile, workouts, templates, exercises, exMap } = useData()

  /* Profil */
  const [name, setName] = useState(profile?.display_name ?? '')
  const [rest, setRest] = useState(String(profile?.default_rest_seconds ?? 90))
  const [pMsg, setPMsg] = useState<Msg>(null)
  const [pBusy, setPBusy] = useState(false)
  useEffect(() => {
    if (profile) {
      setName(profile.display_name)
      setRest(String(profile.default_rest_seconds))
    }
  }, [profile])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    const r = Math.round(Number(rest))
    if (!name.trim()) return setPMsg({ type: 'err', text: 'Bitte gib einen Namen ein.' })
    if (!(r >= 15 && r <= 600)) return setPMsg({ type: 'err', text: 'Pausenzeit: 15 bis 600 Sekunden.' })
    setPBusy(true)
    setPMsg(null)
    try {
      await updateProfile({ display_name: name.trim(), default_rest_seconds: r })
      setPMsg({ type: 'ok', text: 'Gespeichert.' })
    } catch (x) {
      setPMsg({ type: 'err', text: errText(x) })
    } finally {
      setPBusy(false)
    }
  }

  /* Passwort */
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<Msg>(null)
  const [pwBusy, setPwBusy] = useState(false)
  async function savePw(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 6) return setPwMsg({ type: 'err', text: 'Mindestens 6 Zeichen.' })
    if (pw !== pw2) return setPwMsg({ type: 'err', text: 'Die Passwörter stimmen nicht überein.' })
    setPwBusy(true)
    setPwMsg(null)
    try {
      await api.updatePassword(pw)
      setPw('')
      setPw2('')
      setPwMsg({ type: 'ok', text: 'Passwort geändert.' })
    } catch (x) {
      const m = errText(x)
      setPwMsg({ type: 'err', text: /different from the old/i.test(m) ? 'Das neue Passwort muss sich vom alten unterscheiden.' : /reauth|recent/i.test(m) ? 'Bitte melde dich neu an und versuch es dann noch einmal.' : m })
    } finally {
      setPwBusy(false)
    }
  }

  /* Export */
  const [exBusy, setExBusy] = useState(false)
  const [exMsg, setExMsg] = useState<Msg>(null)
  async function doExport() {
    setExBusy(true)
    setExMsg(null)
    try {
      await exportJson({ workouts, templates, exercises })
    } catch (x) {
      setExMsg({ type: 'err', text: errText(x) })
    } finally {
      setExBusy(false)
    }
  }

  /* Löschen */
  const [delOpen, setDelOpen] = useState(false)
  const [delText, setDelText] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delMsg, setDelMsg] = useState<Msg>(null)
  async function doDelete() {
    setDelBusy(true)
    setDelMsg(null)
    try {
      await deleteAccount()
    } catch (x) {
      setDelMsg({ type: 'err', text: errText(x) })
      setDelBusy(false)
    }
  }

  return (
    <Page>
      <PageHero image={HERO.empty} kicker={user?.email} title="Einstellungen" />
      <Container className="mt-7 grid gap-4 pb-32 md:grid-cols-2 md:pb-16">
        <Card icon={User} title="Profil">
          <form onSubmit={saveProfile} className="space-y-3">
            <label className="block">
              <span className="label mb-1.5 block">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
            </label>
            <label className="block">
              <span className="label mb-1.5 flex items-center gap-1.5">
                <Timer size={12} /> Standard-Pausenzeit (Sekunden)
              </span>
              <Input type="number" inputMode="numeric" min={15} max={600} step={5} value={rest} onChange={(e) => setRest(e.target.value)} />
            </label>
            <Button type="submit" disabled={pBusy} className="w-full">
              {pBusy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Speichern
            </Button>
          </form>
          <Note msg={pMsg} />
          <Link to="/fortschritt#koerpergewicht" className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/55 hover:text-lime">
            <Scale size={15} /> Körpergewicht eintragen
          </Link>
          <Link to="/buddys" className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/55 hover:text-lime">
            <Users size={15} /> Buddys & Sichtbarkeit
          </Link>
        </Card>

        {api.mode === 'supabase' && (
          <Card icon={KeyRound} title="Passwort ändern">
            <form onSubmit={savePw} className="space-y-3">
              <Input type="password" placeholder="Neues Passwort" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <Input type="password" placeholder="Wiederholen" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <Button type="submit" variant="soft" disabled={pwBusy} className="w-full">
                {pwBusy && <Loader2 className="animate-spin" size={16} />} Passwort ändern
              </Button>
            </form>
            <Note msg={pwMsg} />
          </Card>
        )}

        <Card icon={Download} title="Meine Daten">
          <p className="mb-4 text-sm text-white/55">Lade alle deine Daten herunter: Trainings, Pläne, eigene Übungen, Ernährung und Körpergewicht.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="soft" onClick={doExport} disabled={exBusy}>
              {exBusy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} Alles (JSON)
            </Button>
            <Button variant="soft" onClick={() => exportSetsCsv(workouts, (id) => exMap.get(id)?.name ?? id)} disabled={!workouts.length}>
              <FileSpreadsheet size={16} /> Sätze (Excel/CSV)
            </Button>
          </div>
          <Note msg={exMsg} />
        </Card>

        <Card icon={ShieldCheck} title="Konto">
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => api.signOut()}>
              <LogOut size={16} /> Abmelden
            </Button>
            <Button variant="danger" className="w-full" onClick={() => { setDelText(''); setDelMsg(null); setDelOpen(true) }}>
              <Trash2 size={16} /> Konto löschen
            </Button>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-white/45">
            <Link to="/impressum" className="hover:text-lime">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-lime">Datenschutz</Link>
          </div>
        </Card>
      </Container>

      <Dialog open={delOpen} onOpenChange={(o) => !delBusy && setDelOpen(o)}>
        <DialogContent title="Konto löschen">
          <p className="text-sm text-white/65">
            Dein Konto und <b className="text-white">alle</b> Daten (Trainings, Pläne, Ernährung, Körpergewicht) werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.
          </p>
          <p className="mt-3 text-sm text-white/65">
            Tipp: Vorher unter „Meine Daten“ alles herunterladen. Zum Bestätigen tippe <b className="text-blaze">LÖSCHEN</b>:
          </p>
          <Input className="mt-3" value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="LÖSCHEN" autoCapitalize="characters" />
          <Note msg={delMsg} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="soft" onClick={() => setDelOpen(false)} disabled={delBusy}>Abbrechen</Button>
            <Button variant="danger" onClick={doDelete} disabled={delBusy || delText.trim().toUpperCase() !== 'LÖSCHEN'}>
              {delBusy ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
