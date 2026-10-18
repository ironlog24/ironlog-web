import confetti from 'canvas-confetti'

export function prConfetti() {
  const colors = ['#C6FF00', '#FFFFFF', '#FF5F1F', '#E6FF80']
  const base = { colors, zIndex: 80, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 48, origin: { x: 0.5, y: 0.65 } })
  setTimeout(() => {
    confetti({ ...base, particleCount: 55, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } })
    confetti({ ...base, particleCount: 55, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } })
  }, 180)
}
