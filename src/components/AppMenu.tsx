// Путь: src/components/AppMenu.tsx
// Выдвижное меню. Плашка «Ваш аккаунт» сверху сама ведёт в профиль,
// а под ней — плашка активного профиля списка: из любого раздела видно,
// с каким списком вы сейчас работаете, и можно его сменить в один тап.

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useLists } from '../lib/lists'
import AuthorLinks from './AuthorLinks'
import Icon from './Icon'

type Props = {
  open: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const GROUPS = [
  {
    id: 'learning', label: 'Обучение', icon: 'cards',
    paths: ['/today', '/learn', '/cards', '/test', '/review', '/games'],
    items: [
      { to: '/today', icon: 'clock', label: 'Занятие на сегодня' },
      { to: '/learn', icon: 'cards', label: 'Карточки и тесты' },
      { to: '/review', icon: 'repeat', label: 'Повторить ошибки' },
      { to: '/games', icon: 'games', label: 'Игры и рекорды' },
    ],
  },
  {
    id: 'library', label: 'Библиотека', icon: 'library',
    paths: ['/library', '/lists', '/create', '/employees', '/import', '/share'],
    items: [
      { to: '/library', icon: 'library', label: 'Мои списки' },
      { to: '/create', icon: 'plus', label: 'Создать список' },
      { to: '/employees', icon: 'user', label: 'Сотрудники текущего списка' },
      { to: '/import', icon: 'upload', label: 'Добавить из файла или фото' },
      { to: '/share', icon: 'share', label: 'Обмен списками' },
    ],
  },
  {
    id: 'account', label: 'Аккаунт и настройки', icon: 'settings',
    paths: ['/profile', '/stats', '/insight'],
    items: [
      { to: '/stats', icon: 'chart', label: 'Мой прогресс' },
      { to: '/profile', icon: 'user', label: 'Профиль и напоминания' },
    ],
  },
]

export default function AppMenu({ open, onClose, theme, onToggleTheme }: Props) {
  const { session, signOut } = useAuth()
  const { active } = useLists()
  const email = session?.user.email ?? ''
  const { pathname } = useLocation()

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
            <span className="drawer__account-chev"><Icon name="chevron" /></span>
          </NavLink>

          <button className="btn btn--ghost btn--sm drawer__close" onClick={onClose} aria-label="Закрыть меню">
            <Icon name="close" />
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

        <nav className="drawer__nav" aria-label="Разделы сайта">
          <NavLink to="/" end className={itemClass} onClick={onClose}>
            <span className="drawer__icon"><Icon name="home" /></span>
            <span>Главная</span>
          </NavLink>
          {GROUPS.map((group) => {
            const current = group.paths.some((path) => pathname === path || pathname.startsWith(path + '/'))
            return <details key={group.id + (current ? '-current' : '')} className="drawer__group" open={current}>
              <summary className={'drawer__group-title' + (current ? ' is-current' : '')}>
                <span className="drawer__icon"><Icon name={group.icon} /></span>
                <span>{group.label}</span>
                <span className="drawer__group-chevron"><Icon name="chevron" /></span>
              </summary>
              <div className="drawer__group-items">
                {group.items.map((item) => <NavLink key={item.to} to={item.to} end className={itemClass} onClick={onClose}>
                  <span className="drawer__icon"><Icon name={item.icon} /></span>
                  <span>{item.label}</span>
                </NavLink>)}
                {group.id === 'account' && <>
                  <button className="drawer__item" onClick={onToggleTheme}>
                    <span className="drawer__icon"><Icon name={theme === 'light' ? 'moon' : 'sun'} /></span>
                    <span>{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</span>
                  </button>
                  <button className="drawer__item drawer__item--danger"
                    onClick={() => { void signOut().then(onClose).catch(() => alert('Не удалось выйти. Проверьте соединение и попробуйте снова.')) }}>
                    <span className="drawer__icon"><Icon name="logout" /></span>
                    <span>Выйти</span>
                  </button>
                </>}
              </div>
            </details>
          })}
        </nav>

        <div className="spacer" />
        <AuthorLinks />
      </aside>
    </>
  )
}
