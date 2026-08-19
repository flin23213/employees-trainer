// Путь: src/components/AppHeader.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

/** Небольшой хук темы: помнит выбор пользователя между запусками */
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, toggle: () => setTheme(theme === 'light' ? 'dark' : 'light') }
}

type Props = {
  title: string
  back?: boolean          // показывать кнопку «назад»
  showSignOut?: boolean   // показывать «выйти» (нужно только на главной)
}

export default function AppHeader({ title, back = false, showSignOut = false }: Props) {
  const { theme, toggle } = useTheme()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="row" style={{ marginBottom: 18 }}>
      {back && (
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)} aria-label="Назад">
          ← Назад
        </button>
      )}
      <h1 style={{ margin: 0, fontSize: back ? '1.2rem' : '1.5rem' }}>{title}</h1>
      <div className="spacer" />
      <button className="btn btn--ghost btn--sm" onClick={toggle} aria-label="Сменить тему">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      {showSignOut && (
        <button className="btn btn--ghost btn--sm" onClick={signOut}>Выйти</button>
      )}
    </div>
  )
}