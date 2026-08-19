// Путь: src/components/AppHeader.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppMenu from './AppMenu'

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
  back?: boolean
  /** Больше не используется: «Выйти» переехало в боковое меню.
   *  Оставлено, чтобы не переписывать все экраны. */
  showSignOut?: boolean
}

export default function AppHeader({ title, back = false }: Props) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Есть ли куда возвращаться внутри приложения? idx = 0 значит «мы на первой
  // странице этой вкладки», шаг назад увёл бы с сайта — тогда ведём на главную.
  const state = window.history.state as { idx?: number } | null
  const canGoBack = typeof state?.idx === 'number' && state.idx > 0

  function handleBack() {
    if (canGoBack) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 18, gap: 8 }}>
        {back && (
          <button className="btn btn--ghost btn--sm" onClick={handleBack} aria-label="Назад">
            ←
          </button>
        )}

        <h1 className="truncate" style={{ margin: 0, fontSize: back ? '1.2rem' : '1.4rem', flex: 1 }}>
          {title}
        </h1>

        <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">
          <span /><span /><span />
        </button>
      </div>

      <AppMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
      />
    </>
  )
}