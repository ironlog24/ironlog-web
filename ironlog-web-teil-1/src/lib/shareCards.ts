import QRCode from 'qrcode'

/**
 * Teilbare Story-Karten (1080 × 1920) im IRONLOG-Look, direkt im Browser gezeichnet.
 * Jede Karte trägt einen QR-Code + Link → wer sie sieht, kann direkt mitmachen.
 */

const W = 1080
const H = 1920
const LIME = '#C6FF00'
const INK = '#0A0A0A'
const DISPLAY = '"Bebas Neue", Impact, "Arial Narrow", sans-serif'
const TEXT = '"Inter Variable", Inter, system-ui, sans-serif'

export type CardSpec =
  | { kind: 'pr'; exercise: string; weight: number; reps: number; history: number[]; deltaText?: string; name: string; link: string }
  | { kind: 'duel'; week: string; title: string; me: string; them: string; myScore: string; theirScore: string; winner: string | null; streak: number; link: string }
  | { kind: 'streak'; weeks: number; me: string; them: string; link: string }
  | { kind: 'challenge'; name: string; count: number; link: string }

const fmt = (n: number, d = 1) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(n)

async function fonts() {
  try {
    await Promise.all([document.fonts.load(`200px ${DISPLAY}`), document.fonts.load(`600 40px ${TEXT}`), document.fonts.load(`800 40px ${TEXT}`)])
  } catch {
    /* Fallback-Schriften */
  }
}

function background(c: CanvasRenderingContext2D, glowY = 0.38) {
  c.fillStyle = INK
  c.fillRect(0, 0, W, H)
  const g = c.createRadialGradient(W * 0.5, H * glowY, 40, W * 0.5, H * glowY, W * 0.95)
  g.addColorStop(0, 'rgba(198,255,0,0.30)')
  g.addColorStop(0.45, 'rgba(198,255,0,0.07)')
  g.addColorStop(1, 'rgba(10,10,10,0)')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  // Diagonale Streifen
  c.save()
  c.globalAlpha = 0.05
  c.strokeStyle = LIME
  c.lineWidth = 2
  for (let x = -H; x < W; x += 46) {
    c.beginPath()
    c.moveTo(x, H)
    c.lineTo(x + H, 0)
    c.stroke()
  }
  c.restore()
  // Körnung
  const img = c.getImageData(0, 0, W, H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  c.putImageData(img, 0, 0)
}

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, opts: { font?: string; weight?: number; color?: string; align?: CanvasTextAlign; max?: number; glow?: boolean; spacing?: number } = {}) {
  c.save()
  c.font = `${opts.weight ?? 400} ${size}px ${opts.font ?? DISPLAY}`
  c.fillStyle = opts.color ?? '#fff'
  c.textAlign = opts.align ?? 'center'
  c.textBaseline = 'alphabetic'
  if ('letterSpacing' in c && opts.spacing) (c as unknown as { letterSpacing: string }).letterSpacing = `${opts.spacing}px`
  if (opts.glow) {
    c.shadowColor = 'rgba(198,255,0,0.75)'
    c.shadowBlur = 40
  }
  // zu breit → verkleinern
  if (opts.max) {
    let s2 = size
    while (c.measureText(s).width > opts.max && s2 > 20) {
      s2 -= 4
      c.font = `${opts.weight ?? 400} ${s2}px ${opts.font ?? DISPLAY}`
    }
  }
  c.fillText(s, x, y)
  c.restore()
}

function pill(c: CanvasRenderingContext2D, label: string, y: number) {
  c.save()
  c.font = `800 34px ${TEXT}`
  const w = c.measureText(label).width + 70
  const x = (W - w) / 2
  c.fillStyle = LIME
  c.beginPath()
  c.roundRect(x, y - 52, w, 76, 38)
  c.fill()
  c.fillStyle = INK
  c.textAlign = 'center'
  c.fillText(label, W / 2, y)
  c.restore()
}

function logo(c: CanvasRenderingContext2D, y: number) {
  c.save()
  c.font = `110px ${DISPLAY}`
  c.textBaseline = 'alphabetic'
  const a = c.measureText('IRON').width
  const b = c.measureText('LOG').width
  const x = (W - a - b) / 2
  c.fillStyle = '#fff'
  c.fillText('IRON', x, y)
  c.fillStyle = LIME
  c.shadowColor = 'rgba(198,255,0,0.6)'
  c.shadowBlur = 24
  c.fillText('LOG', x + a, y)
  c.restore()
}

async function footer(c: CanvasRenderingContext2D, link: string, cta: string) {
  const size = 230
  const q = document.createElement('canvas')
  await QRCode.toCanvas(q, link, { margin: 1, width: size, color: { dark: INK, light: LIME }, errorCorrectionLevel: 'M' })
  const y = H - 360
  c.save()
  c.fillStyle = 'rgba(255,255,255,0.05)'
  c.strokeStyle = 'rgba(255,255,255,0.12)'
  c.lineWidth = 2
  c.beginPath()
  c.roundRect(70, y - 20, W - 140, size + 60, 36)
  c.fill()
  c.stroke()
  c.drawImage(q, 110, y + 10, size, size)
  c.restore()
  text(c, cta, 380, y + 110, 64, { align: 'left', max: W - 470 })
  const short = link.replace(/^https?:\/\//, '')
  text(c, short, 380, y + 170, 30, { font: TEXT, weight: 600, color: 'rgba(255,255,255,0.55)', align: 'left', max: W - 470 })
  text(c, 'Gratis · ohne Werbung', 380, y + 222, 28, { font: TEXT, weight: 600, color: LIME, align: 'left' })
}

function sparkBars(c: CanvasRenderingContext2D, values: number[], y: number) {
  const v = values.slice(-8)
  if (v.length < 2) return
  const max = Math.max(...v)
  const min = Math.min(...v) * 0.85
  const bw = 54
  const gap = 18
  const total = v.length * bw + (v.length - 1) * gap
  let x = (W - total) / 2
  v.forEach((val, i) => {
    const h = 40 + ((val - min) / Math.max(1, max - min)) * 150
    c.save()
    c.fillStyle = i === v.length - 1 ? LIME : 'rgba(198,255,0,0.28)'
    if (i === v.length - 1) {
      c.shadowColor = 'rgba(198,255,0,0.8)'
      c.shadowBlur = 30
    }
    c.beginPath()
    c.roundRect(x, y - h, bw, h, 12)
    c.fill()
    c.restore()
    x += bw + gap
  })
}

export async function drawCard(spec: CardSpec): Promise<Blob> {
  await fonts()
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!
  background(c)
  logo(c, 230)

  if (spec.kind === 'pr') {
    pill(c, '🏆 NEUER PR', 400)
    text(c, spec.exercise.toUpperCase(), W / 2, 590, 130, { max: W - 120 })
    text(c, `${fmt(spec.weight)} KG`, W / 2, 860, 300, { color: LIME, glow: true, max: W - 80 })
    text(c, `× ${spec.reps} WIEDERHOLUNGEN`, W / 2, 960, 70, { color: 'rgba(255,255,255,0.85)' })
    if (spec.deltaText) text(c, spec.deltaText, W / 2, 1050, 40, { font: TEXT, weight: 700, color: LIME })
    sparkBars(c, spec.history, 1330)
    text(c, spec.name, W / 2, 1420, 44, { font: TEXT, weight: 700, color: 'rgba(255,255,255,0.6)' })
    await footer(c, spec.link, 'SCHLAG DAS 👊')
  }

  if (spec.kind === 'duel') {
    pill(c, `⚔️ ${spec.week}`, 400)
    text(c, spec.title.toUpperCase(), W / 2, 560, 110, { max: W - 120 })
    // Spalten
    text(c, spec.me.toUpperCase(), W * 0.27, 720, 70, { max: 400, color: spec.winner === spec.me ? LIME : '#fff' })
    text(c, spec.them.toUpperCase(), W * 0.73, 720, 70, { max: 400, color: spec.winner === spec.them ? LIME : '#fff' })
    text(c, spec.myScore, W * 0.27, 950, 200, { color: spec.winner === spec.me ? LIME : '#fff', glow: spec.winner === spec.me, max: 380 })
    text(c, spec.theirScore, W * 0.73, 950, 200, { color: spec.winner === spec.them ? LIME : '#fff', glow: spec.winner === spec.them, max: 380 })
    text(c, ':', W / 2, 920, 140, { color: 'rgba(255,255,255,0.35)' })
    text(c, spec.winner ? `🏅 ${spec.winner.toUpperCase()} GEWINNT` : '🤝 UNENTSCHIEDEN', W / 2, 1150, 96, { color: LIME, glow: true, max: W - 120 })
    if (spec.streak > 0) text(c, `🔥 Duo-Streak: ${spec.streak} ${spec.streak === 1 ? 'Woche' : 'Wochen'}`, W / 2, 1270, 46, { font: TEXT, weight: 700, color: 'rgba(255,255,255,0.8)' })
    await footer(c, spec.link, 'TRITT GEGEN UNS AN')
  }

  if (spec.kind === 'streak') {
    pill(c, '🔥 DUO-STREAK', 400)
    text(c, String(spec.weeks), W / 2, 900, 460, { color: LIME, glow: true })
    text(c, spec.weeks === 1 ? 'WOCHE' : 'WOCHEN IN FOLGE', W / 2, 1010, 90)
    text(c, `${spec.me} & ${spec.them}`, W / 2, 1120, 52, { font: TEXT, weight: 800, max: W - 140 })
    text(c, 'jede Woche beide mind. 3× im Gym', W / 2, 1185, 38, { font: TEXT, weight: 600, color: 'rgba(255,255,255,0.55)' })
    await footer(c, spec.link, 'FINDE DEINEN BUDDY')
  }

  if (spec.kind === 'challenge') {
    pill(c, '👊 HERAUSFORDERUNG', 400)
    text(c, 'DIESE WOCHE', W / 2, 560, 90, { color: 'rgba(255,255,255,0.75)' })
    text(c, `${spec.count}×`, W / 2, 900, 380, { color: LIME, glow: true })
    text(c, 'IM GYM', W / 2, 1010, 110)
    text(c, `${spec.name} fordert dich heraus:`, W / 2, 1140, 46, { font: TEXT, weight: 700, color: 'rgba(255,255,255,0.75)', max: W - 140 })
    text(c, 'SCHAFFST DU MEHR?', W / 2, 1240, 100, { color: LIME, max: W - 120 })
    await footer(c, spec.link, 'NIMM AN 👊')
  }

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht erstellt werden'))), 'image/png'))
}

/** Teilen-Menü (Handy) oder Download (PC) */
export async function shareImage(blob: Blob, filename: string, text: string, forceDownload = false): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (!forceDownload && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
  return 'downloaded'
}
