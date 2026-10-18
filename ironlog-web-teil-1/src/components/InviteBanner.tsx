import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { pendingInvite, socialStore } from '@/data/social'
import { cn } from '@/lib/utils'

/** Zeigt ausgeloggten Besuchern, wer sie eingeladen hat */
export function InviteBanner({ className, cta }: { className?: string; cta?: boolean }) {
  const [code] = useState(() => pendingInvite())
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    if (!code) return
    socialStore.inviteInfo(code).then(setName).catch(() => setName(null))
  }, [code])
  if (!code) return null
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-sm shadow-glow-sm backdrop-blur', className)} data-testid="invite-banner">
      <Swords className="shrink-0 text-lime" size={22} />
      <div className="flex-1">
        <b className="text-lime">{name ?? 'Ein Freund'} fordert dich heraus!</b>
        <div className="text-white/65">Registrier dich – ihr seid danach automatisch verbunden und startet eure Wochen-Challenge.</div>
      </div>
      {cta && <Link to="/login?mode=signup" className="shrink-0 rounded-xl bg-lime px-3 py-2 text-xs font-bold uppercase text-ink">Annehmen</Link>}
    </div>
  )
}
