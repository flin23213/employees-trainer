import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

/** Navigation has its own row, so it never covers the scrollable page. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const content = useRef<HTMLElement>(null)
  useLayoutEffect(() => { content.current?.scrollTo(0, 0) }, [pathname])
  return <div className="app-shell">
    <main className="app-content" ref={content}>{children}</main>
    <BottomNav />
  </div>
}
