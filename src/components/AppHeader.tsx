// Путь: src/components/AppHeader.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppMenu from './AppMenu'
import Icon from './Icon'

/** Небольшой хук темы: помнит выбор пользователя между запусками */
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* Storage can be unavailable. */ }
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
      <header className={'app-header' + (back ? ' app-header--back' : '')}>
        {back && (
          <button className="btn btn--ghost btn--sm app-header__back" onClick={handleBack} aria-label="Назад">
            <Icon name="arrow" />
          </button>
        )}

        <h1>
          {title}
        </h1>

        <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">
          <span /><span /><span />
        </button>
      </header>

      <AppMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
      />
    </>
  )
}
