import { Component, type ErrorInfo, type ReactNode } from 'react'
import { api } from '@/data/api'

interface State {
  error: Error | null
  where?: string
}

/** Fängt Render-Fehler ab, damit nie ein schwarzer Bildschirm stehen bleibt */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[IRONLOG]', error, info.componentStack)
    this.setState({ where: (info.componentStack ?? '').trim().split('\n').slice(0, 4).map((l) => l.trim()).join('\n') })
    document.getElementById('splash')?.classList.add('hide')
  }

  private resetData = async () => {
    await api.signOut().catch(() => {})
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('ironlog.')).forEach((k) => localStorage.removeItem(k))
    } catch {
      /* noop */
    }
    this.setState({ error: null, where: undefined })
    try {
      location.reload()
    } catch {
      /* noop */
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-6 text-center">
        <div className="max-w-sm">
          <div className="font-display text-5xl text-white">
            IRON<span className="text-lime">LOG</span>
          </div>
          <h1 className="mt-6 text-lg font-bold text-white">Da ist etwas schiefgelaufen.</h1>
          <p className="mt-2 text-sm text-white/55">Lade die Seite neu. Hilft das nicht, setze die lokalen Daten zurück.</p>
          <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/5 p-3 text-left text-[11px] text-blaze">{this.state.error.message}
{(this.state.error.stack ?? '').split('\n').slice(1, 5).join('\n')}
{this.state.where}</pre>
          <div className="mt-6 grid gap-3">
            <button onClick={() => this.setState({ error: null, where: undefined })} className="h-12 rounded-2xl bg-lime text-xs font-bold uppercase tracking-wider text-ink">Erneut versuchen</button>
            <button onClick={this.resetData} className="h-12 rounded-2xl border border-white/20 text-xs font-bold uppercase tracking-wider text-white">Lokale Daten zurücksetzen</button>
          </div>
        </div>
      </div>
    )
  }
}
