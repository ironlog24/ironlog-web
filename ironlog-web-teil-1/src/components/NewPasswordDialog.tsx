import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { api, passwordRecovery } from '@/data/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Erscheint, wenn jemand über den Link aus der „Passwort vergessen“-Mail kommt */
export function NewPasswordDialog() {
  const [open, setOpen] = useState(passwordRecovery.get())
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => passwordRecovery.subscribe(setOpen), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (pw.length < 6) return setErr('Das Passwort braucht mindestens 6 Zeichen.')
    if (pw !== pw2) return setErr('Die Passwörter stimmen nicht überein.')
    setBusy(true)
    try {
      await api.updatePassword(pw)
      setDone(true)
      try {
        history.replaceState(null, '', window.location.pathname)
      } catch {
        /* noop */
      }
    } catch (x) {
      const m = (x as { message?: string })?.message ?? String(x)
      setErr(/different from the old/i.test(m) ? 'Das neue Passwort muss sich vom alten unterscheiden.' : /session/i.test(m) ? 'Der Link ist abgelaufen. Fordere bitte einen neuen an.' : m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) passwordRecovery.set(false) }}>
      <DialogContent title="Neues Passwort">
        {done ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-lime/10 px-4 py-3 text-sm text-lime">Passwort geändert. Du bist eingeloggt.</p>
            <Button className="w-full" onClick={() => passwordRecovery.set(false)}>Weiter</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-white/55">Leg ein neues Passwort für dein Konto fest.</p>
            {[
              [pw, setPw, 'Neues Passwort'],
              [pw2, setPw2, 'Passwort wiederholen'],
            ].map(([v, set, ph]) => (
              <div key={ph as string} className="relative">
                <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/35" />
                <Input type="password" required minLength={6} autoComplete="new-password" placeholder={ph as string} value={v as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} className="pl-11" />
              </div>
            ))}
            {err && <p className="rounded-2xl bg-blaze/10 px-4 py-3 text-sm text-blaze">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={18} />}
              Passwort speichern
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
