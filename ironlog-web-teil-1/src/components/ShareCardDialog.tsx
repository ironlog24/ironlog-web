import { useEffect, useState } from 'react'
import { Copy, Download, Loader2, Share2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { drawCard, shareImage, type CardSpec } from '@/lib/shareCards'

export function ShareCardDialog({ spec, onClose, title = 'Teilen', text }: { spec: CardSpec | null; onClose: () => void; title?: string; text: string }) {
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setImg(null)
    setErr('')
    setNote('')
    if (!spec) return
    let url = ''
    let alive = true
    drawCard(spec)
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setImg({ url, blob })
      })
      .catch((e) => alive && setErr(String(e?.message ?? e)))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [spec])

  const fname = `ironlog-${spec?.kind ?? 'karte'}-${new Date().toISOString().slice(0, 10)}.png`

  async function share() {
    if (!img) return
    setBusy(true)
    const r = await shareImage(img.blob, fname, `${text} ${spec?.link ?? ''}`.trim())
    setBusy(false)
    if (r === 'downloaded') setNote('Bild gespeichert – jetzt in Instagram/WhatsApp hochladen.')
  }

  async function copyLink() {
    if (!spec) return
    try {
      await navigator.clipboard.writeText(spec.link)
      setNote('Link kopiert ✓')
    } catch {
      setNote(spec.link)
    }
  }

  return (
    <Dialog open={!!spec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title}>
        <div className="mx-auto grid aspect-[9/16] h-[56dvh] max-w-full place-items-center overflow-hidden rounded-[22px] border border-white/10 bg-ink">
          {img ? <img src={img.url} alt="Vorschau der Karte" className="h-full w-full object-contain" /> : err ? <p className="p-6 text-center text-sm text-blaze">{err}</p> : <Loader2 className="animate-spin text-white/40" />}
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <Button onClick={share} disabled={!img || busy}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />} Teilen
          </Button>
          <Button variant="soft" size="icon" onClick={() => img && shareImage(img.blob, fname, '', true).then(() => setNote('Bild gespeichert ✓'))} disabled={!img} aria-label="Bild speichern">
            <Download size={17} />
          </Button>
          <Button variant="soft" size="icon" onClick={copyLink} disabled={!spec} aria-label="Link kopieren">
            <Copy size={17} />
          </Button>
        </div>
        {note && <p className="mt-3 break-all text-center text-xs text-white/55">{note}</p>}
      </DialogContent>
    </Dialog>
  )
}
