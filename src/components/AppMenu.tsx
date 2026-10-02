// Путь: src/components/AppMenu.tsx
// Выдвижное меню. Плашка «Ваш аккаунт» сверху сама ведёт в профиль,
// а под ней — плашка активного профиля списка: из любого раздела видно,
// с каким списком вы сейчас работаете, и можно его сменить в один тап.

import { useEffect, useRef } from 'react'
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
    paths: ['/today', '/learn', '/cards', '/test', '/review', '/games', '/stats', '/insight'],
    items: [
      { to: '/today', icon: 'clock', label: 'Занятие на сегодня' },
      { to: '/learn', icon: 'cards', label: 'Карточки и тесты' },
      { to: '/review', icon: 'repeat', label: 'Повторить ошибки' },
      { to: '/games', icon: 'games', label: 'Игры и рекорды' },
      { to: '/stats', icon: 'chart', label: 'Мой прогресс' },
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
    id: 'settings', label: 'Настройки', icon: 'settings',
    paths: ['/profile'],
    items: [],
  },
]

export default function AppMenu({ open, onClose, theme, onToggleTheme }: Props) {
  const { session, signOut } = useAuth()
  const { active } = useLists()
  const email = session?.user.email ?? ''
  const { pathname } = useLocation()
  const drawer = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])

  // Focus stays in the dialog; closed categories have no reachable controls.
  useEffect(() => {
    if (!open) return
    const menu = drawer.current
    if (!menu) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const visibleControls = () => Array.from(menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )).filter(control => {
      if (control.closest('[hidden], [inert], [aria-hidden="true"]') || !control.getClientRects().length || getComputedStyle(control).visibility === 'hidden') return false
      for (let parent = control.parentElement; parent && parent !== menu; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector('summary')?.contains(control)) return false
      }
      return true
    })

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return }
      if (e.key !== 'Tab') return
      const controls = visibleControls()
      const first = controls[0]
      const last = controls[controls.length - 1]
      const focused = document.activeElement
      if (!first || !last) { e.preventDefault(); menu!.focus(); return }
      const outside = !(focused instanceof HTMLElement) || !controls.includes(focused)
      if (e.shiftKey && (focused === first || outside)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (focused === last || outside)) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    visibleControls()[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.querySelector<HTMLElement>('button[aria-label="Открыть меню"]')?.focus()
    }
  }, [open])

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

      <aside ref={drawer} className={'drawer' + (open ? ' is-open' : '')} role="dialog" aria-modal={open || undefined}
        aria-label="Меню" tabIndex={-1} inert={!open} aria-hidden={!open}>
        <div className="drawer__head">
          {/* Вся плашка — ссылка в профиль */}
          <NavLink
            to="/profile"
            end
            aria-label="Профиль и напоминания"
            className={({ isActive }) => 'drawer__account' + (isActive ? ' is-active' : '')}
            onClick={onClose}
          >
            <span className="drawer__avatar">{email.charAt(0).toUpperCase() || '?'}</span>
            <span className="drawer__user">
              <span className="drawer__email">{email}</span>
              <span className="drawer__hint">Профиль и напоминания</span>
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
                {group.id === 'settings' && <>
                  <button type="button" className="drawer__item drawer__theme-switch" role="switch"
                    aria-label="Тёмная тема" aria-checked={theme === 'dark'} onClick={onToggleTheme}>
                    <span className="drawer__icon"><Icon name="moon" /></span>
                    <span className="drawer__theme-copy">
                      <span>Тёмная тема</span>
                      <span className="drawer__theme-state" aria-hidden="true">{theme === 'dark' ? 'Включена' : 'Выключена'}</span>
                    </span>
                    <span className={'switch' + (theme === 'dark' ? ' is-on' : '')} aria-hidden="true" />
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
