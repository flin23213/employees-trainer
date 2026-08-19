// Путь: src/components/OfflineBanner.tsx
import { useEffect, useState } from 'react'

/** Показывает полоску сверху, когда пропал интернет */
export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online) return null

  return (
    <div className="offline-banner">
      📡 Нет интернета. Данные не сохраняются, ответы могут потеряться.
    </div>
  )
}