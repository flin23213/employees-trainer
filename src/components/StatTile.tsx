// Путь: src/components/StatTile.tsx
// Кликабельная плитка статистики с «набегающим» числом.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Хук «число набегает от нуля до цели».
 * Работает через requestAnimationFrame — браузер сам подбирает частоту кадров,
 * поэтому анимация плавная и не грузит телефон.
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const begin = from.current
    let raf = 0

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic: быстро в начале, мягко в конце
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(begin + (target - begin) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

type Props = {
  to: string
  icon: string
  label: string
  value: number
  suffix?: string
  color?: string
  loading?: boolean
}

export default function StatTile({ to, icon, label, value, suffix = '', color, loading = false }: Props) {
  const shown = useCountUp(loading ? 0 : value)

  return (
    <Link to={to} className="tile" aria-label={`${label}: ${value}${suffix}. Открыть подробности`}>
      <span className="tile__go" aria-hidden="true">›</span>
      <div className="tile__top">
        <span className="tile__icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="tile__value" style={color ? { color } : undefined}>
        {loading ? '…' : `${shown}${suffix}`}
      </div>
      <div className="tile__label">{label}</div>
    </Link>
  )
}
