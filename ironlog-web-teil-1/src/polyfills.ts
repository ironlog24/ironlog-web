/* Absicherung für eingeschränkte Umgebungen (eingebettete Vorschauen, ältere WebViews). Muss als erstes Modul laden. */
const w = window as unknown as Record<string, unknown>

if (typeof w.queueMicrotask !== 'function') {
  w.queueMicrotask = (cb: () => void) => void Promise.resolve().then(cb)
}
if (typeof w.requestAnimationFrame !== 'function') {
  w.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16)
  w.cancelAnimationFrame = (id: number) => window.clearTimeout(id)
}
if (typeof w.ResizeObserver !== 'function') {
  // Minimal-Ersatz: misst bei Fenstergröße-Änderung neu
  w.ResizeObserver = class {
    private els = new Set<Element>()
    private onResize = () => this.cb([...this.els].map((target) => ({ target, contentRect: target.getBoundingClientRect() })) as never, this as never)
    constructor(private cb: ResizeObserverCallback) {
      window.addEventListener('resize', this.onResize)
    }
    observe(el: Element) {
      this.els.add(el)
      setTimeout(this.onResize, 0)
    }
    unobserve(el: Element) {
      this.els.delete(el)
    }
    disconnect() {
      this.els.clear()
      window.removeEventListener('resize', this.onResize)
    }
  }
}
if (typeof w.structuredClone !== 'function') {
  w.structuredClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
}
export {}
