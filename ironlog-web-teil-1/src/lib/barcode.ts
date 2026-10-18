/**
 * Barcode-Scanner über die Kamera.
 * Nutzt den eingebauten BarcodeDetector (Chrome/Android), sonst ZXing (iPhone/Safari).
 * Funktioniert nur über https (oder localhost) – Browser geben die Kamera sonst nicht frei.
 */

export interface ScannerHandle {
  stop(): void
}

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }

export function cameraAvailable() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
}

export async function startScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<ScannerHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()

  let stopped = false
  const stopStream = () => stream.getTracks().forEach((t) => t.stop())

  const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
  let native: Detector | null = null
  if (BD) {
    try {
      native = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    } catch {
      native = null
    }
  }

  if (native) {
    const loop = async () => {
      if (stopped) return
      try {
        const res = await native!.detect(video)
        const code = res.find((r) => /^\d{8,14}$/.test(r.rawValue))?.rawValue
        if (code) {
          onCode(code)
          return
        }
      } catch {
        /* nächster Versuch */
      }
      setTimeout(loop, 150)
    }
    loop()
    return {
      stop() {
        stopped = true
        stopStream()
      },
    }
  }

  // Fallback: ZXing (wird erst bei Bedarf geladen)
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (stopped || !result) return
    const code = result.getText()
    if (/^\d{8,14}$/.test(code)) {
      stopped = true
      onCode(code)
    }
  })
  return {
    stop() {
      stopped = true
      controls.stop()
      stopStream()
    },
  }
}
