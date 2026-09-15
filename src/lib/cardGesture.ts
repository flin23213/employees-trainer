export function swipeDecision(dx: number, dy: number, width: number): 'left' | 'right' | null {
  const threshold = Math.min(100, Math.max(56, width * 0.22))
  if (Math.abs(dx) <= threshold || Math.abs(dx) <= Math.abs(dy)) return null
  return dx > 0 ? 'right' : 'left'
}
