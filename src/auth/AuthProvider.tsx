// Путь: src/auth/AuthProvider.tsx
// Хранит текущего пользователя (сессию) и даёт её всем экранам приложения.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { disableDeviceReminders } from '../lib/reminders'

type AuthValue = {
  session: Session | null      // null = не вошёл
  loading: boolean             // true = ещё проверяем, вошёл ли
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. При запуске: проверяем, не сохранён ли вход с прошлого раза
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2. Дальше слушаем изменения: вошёл, вышел, обновился токен
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    // 3. Когда компонент убирается с экрана — отключаем слушателя
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try { await disableDeviceReminders() } catch { /* A push-service outage must not prevent signing out. The local subscription is also invalidated. */ }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Короткий доступ к данным входа из любого экрана: const { session } = useAuth() */
export function useAuth() {
  return useContext(AuthContext)
}
