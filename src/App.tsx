// Путь: src/App.tsx
import { useEffect, useRef, useState, type RefObject } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { supabase } from './lib/supabase'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import EmployeesScreen from './screens/EmployeesScreen'
import ImportScreen from './screens/ImportScreen'
import CardsScreen from './screens/CardsScreen'
import TestScreen from './screens/TestScreen'
import StatsScreen from './screens/StatsScreen'
import ProfileScreen from './screens/ProfileScreen'
import InsightScreen from './screens/InsightScreen'
import LearnScreen from './screens/LearnScreen'
import ShareScreen from './screens/ShareScreen'
import ListsScreen from './screens/ListsScreen'
import NewPasswordScreen from './screens/NewPasswordScreen'
import LibraryScreen from './screens/LibraryScreen'
import CreateScreen from './screens/CreateScreen'
import GamesScreen from './screens/GamesScreen'
import GameScreen from './screens/GameScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import DailyScreen from './screens/DailyScreen'
import ListDetailScreen from './screens/ListDetailScreen'
import BottomNav from './components/BottomNav'

/** После входа открываем главную. Ссылки уведомлений и запуск PWA сохраняют свой маршрут. */
function StartAtHome({ afterLogin }: { afterLogin: RefObject<boolean> }) {
  const navigate = useNavigate()

  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (afterLogin.current && !installed && !['/', '/today'].includes(window.location.pathname)) {
      navigate('/', { replace: true })
    }
    // Пустой список зависимостей = «выполнить только при первом запуске»
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

/**
 * Пришёл ли человек по ссылке «восстановить пароль».
 * Supabase кладёт признак в адрес страницы (type=recovery) и почти сразу
 * убирает его, поэтому проверяем адрес при первом запуске И слушаем событие.
 */
function useRecoveryMode(): [boolean, () => void] {
  const [recovery, setRecovery] = useState(() => {
    const hash = window.location.hash
    return hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('recovery') === '1'
  })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Закончили менять пароль: чистим адрес и возвращаемся в приложение
  const finish = () => {
    window.history.replaceState(null, '', window.location.pathname)
    setRecovery(false)
  }

  return [recovery, finish]
}

export default function App() {
  const { session, loading } = useAuth()
  const [recovery, finishRecovery] = useRecoveryMode()

  // Запоминаем, показывали ли мы экран входа. Если да, значит следующий
  // запуск приложения — результат входа, и начинать надо с главной.
  const sawAuthScreen = useRef(false)
  useEffect(() => {
    if (!loading && !session) sawAuthScreen.current = true
  }, [loading, session])

  if (window.location.pathname === '/privacy') return <PrivacyScreen />

  if (loading) {
    return <div className="container center" style={{ paddingTop: 80 }}>Загрузка...</div>
  }

  // Ссылка из письма важнее всего остального: сначала даём задать новый пароль
  if (recovery) {
    return <NewPasswordScreen onDone={finishRecovery} />
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <BrowserRouter>
      <StartAtHome afterLogin={sawAuthScreen} />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/today" element={<DailyScreen />} />
        <Route path="/library/:id" element={<ListDetailScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/create" element={<CreateScreen />} />
        <Route path="/games" element={<GamesScreen />} />
        <Route path="/games/match" element={<GameScreen key="match" mode="match" />} />
        <Route path="/games/quiz" element={<GameScreen key="quiz" mode="quiz" />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/employees" element={<EmployeesScreen />} />
        <Route path="/import" element={<ImportScreen />} />
        {/* Развилка: сначала выбор вида занятия, потом брифинг с настройками */}
        <Route path="/learn" element={<LearnScreen />} />
        <Route path="/cards" element={<CardsScreen mode="all" />} />
        <Route path="/test" element={<TestScreen />} />
        <Route path="/review" element={<CardsScreen mode="review" />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/share" element={<ShareScreen />} />
        <Route path="/lists" element={<ListsScreen />} />
        {/* Разбор показателя с главного экрана: known | weak | learning | new | accuracy | progress */}
        <Route path="/insight/:group" element={<InsightScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
