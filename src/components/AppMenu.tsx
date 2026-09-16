// Путь: src/components/AppMenu.tsx
// Выдвижное меню. Плашка «Ваш аккаунт» сверху сама ведёт в профиль,
// а под ней — плашка активного профиля списка: из любого раздела видно,
// с каким списком вы сейчас работаете, и можно его сменить в один тап.

import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useLists } from '../lib/lists'
import AuthorLinks from './AuthorLinks'

type Props = {
  open: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

/** Разделы меню в одном месте: чтобы добавить новый, дописываете одну строку */
const SECTIONS = [
  { to: '/',          icon: '🏠', label: 'Главная' },
  { to: '/library',   icon: '📚', label: 'Библиотека' },
  { to: '/create',    icon: '➕', label: 'Создать список' },
  { to: '/learn',     icon: '🃏', label: 'Карточки и тесты' },
  { to: '/games',     icon: '🎮', label: 'Игры и рекорды' },
  { to: '/stats',     icon: '📊', label: 'Мой прогресс' },
  { to: '/share',     icon: '🤝', label: 'Обмен списками' },
]

export default function AppMenu({ open, onClose, theme, onToggleTheme }: Props) {
  const { session, signOut } = useAuth()
  const { active } = useLists()
  const email = session?.user.email ?? ''

  // Пока меню открыто: Esc закрывает, страница под ним не прокручивается.
  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [open, onClose])

  /** Подсветка текущего раздела */
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    'drawer__item' + (isActive ? ' is-active' : '')

  return (
    <>
      <div
        className={'drawer-overlay' + (open ? ' is-open' : '')}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={'drawer' + (open ? ' is-open' : '')} aria-label="Меню" inert={!open} aria-hidden={!open}>
        <div className="drawer__head">
          {/* Вся плашка — ссылка в профиль */}
          <NavLink
            to="/profile"
            end
            className={({ isActive }) => 'drawer__account' + (isActive ? ' is-active' : '')}
            onClick={onClose}
          >
            <span className="drawer__avatar">{email.charAt(0).toUpperCase() || '?'}</span>
            <span className="drawer__user">
              <span className="drawer__email">{email}</span>
              <span className="drawer__hint">Ваш аккаунт · открыть профиль</span>
            </span>
            <span className="drawer__account-chev" aria-hidden="true">›</span>
          </NavLink>

          <button className="btn btn--ghost btn--sm drawer__close" onClick={onClose} aria-label="Закрыть меню">
            ✕
          </button>
        </div>

        {/* Какой список сотрудников открыт прямо сейчас */}
        {active && (
          <NavLink
            to="/library"
            end
            className={({ isActive }) => 'drawer__list' + (isActive ? ' is-active' : '')}
            onClick={onClose}
          >
            <span className="drawer__list-emoji" aria-hidden="true">{active.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="drawer__list-label">Текущий список</span>
              <span className="drawer__list-name truncate">{active.name}</span>
            </span>
            <span className="muted small" style={{ flex: 'none' }}>
              {active.employee_count} чел. ›
            </span>
          </NavLink>
        )}

        <div className="drawer__label">Разделы</div>
        <nav className="drawer__nav">
          {SECTIONS.map((s) => (
            <NavLink key={s.to} to={s.to} end className={itemClass} onClick={onClose}>
              <span className="drawer__icon">{s.icon}</span>
              <span>{s.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="drawer__label">Настройки</div>
        <nav className="drawer__nav">
          <button className="drawer__item" onClick={onToggleTheme}>
            <span className="drawer__icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            <span>{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</span>
          </button>

          <button
            className="drawer__item drawer__item--danger"
            onClick={() => { void signOut().then(onClose).catch(() => alert('Не удалось выйти. Проверьте соединение и попробуйте снова.')) }}
          >
            <span className="drawer__icon">🚪</span>
            <span>Выйти</span>
          </button>
        </nav>

        <div className="spacer" />
        <AuthorLinks />
      </aside>
    </>
  )
}
