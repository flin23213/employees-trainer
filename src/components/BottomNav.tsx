import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

export default function BottomNav() {
  const { pathname } = useLocation()
  if (['/privacy', '/cards', '/review', '/test', '/games/match', '/games/quiz'].includes(pathname)) return null
  return <nav className="bottom-nav" aria-label="Основная навигация">
    {[
      { to: '/', label: 'Главная', icon: 'home' },
      { to: '/library', label: 'Библиотека', icon: 'library' },
      { to: '/games', label: 'Игры', icon: 'games' },
      { to: '/stats', label: 'Прогресс', icon: 'chart' },
    ].map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}
      className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' is-active' : '')}>
      <Icon name={item.icon} /><span>{item.label}</span>
    </NavLink>)}
  </nav>
}
