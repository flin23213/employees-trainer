import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

/** The floating navigation reserves its actual height at the end of each page. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const shell = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLElement>(null)
  useLayoutEffect(() => { content.current?.scrollTo(0, 0) }, [pathname])
  useLayoutEffect(() => {
    const root = shell.current
    const nav = root?.querySelector<HTMLElement>('.bottom-nav')
    if (!root) return
    if (!nav) { root.style.setProperty('--nav-space', '0px'); return }
    const measure = () => {
      const bottom = Number.parseFloat(getComputedStyle(nav).bottom) || 0
      root.style.setProperty('--nav-space', `${nav.getBoundingClientRect().height + bottom + 16}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [pathname])
  return <div className="app-shell" ref={shell}>
    <main className="app-content" ref={content}>{children}</main>
    <BottomNav />
  </div>
}
