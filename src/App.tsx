// Путь: src/App.tsx
import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
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

/**
 * Отвечает за правильную «точку входа».
 *
 * Срабатывает один раз при запуске и переводит на главный экран, если:
 *  - приложение открыто как установленная иконка (телефон, рабочий стол);
 *  - либо пользователь только что вошёл или зарегистрировался.
 *
 * Обычную перезагрузку страницы (F5) не трогаем: если вы читаете список
 * сотрудников и нажали F5, вы должны остаться на списке.
 */
function StartAtHome({ afterLogin }: { afterLogin: boolean }) {
  const navigate = useNavigate()

  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if ((installed || afterLogin) && window.location.pathname !== '/') {
      navigate('/', { replace: true })
    }
    // Пустой список зависимостей = «выполнить только при первом запуске»
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function App() {
  const { session, loading } = useAuth()

  // Запоминаем, показывали ли мы экран входа. Если да, значит следующий
  // запуск приложения — результат входа, и начинать надо с главной.
  const sawAuthScreen = useRef(false)

  if (loading) {
    return <div className="container center" style={{ paddingTop: 80 }}>Загрузка...</div>
  }

  if (!session) {
    sawAuthScreen.current = true
    return <AuthScreen />
  }

  return (
    <BrowserRouter>
      <StartAtHome afterLogin={sawAuthScreen.current} />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/employees" element={<EmployeesScreen />} />
        <Route path="/import" element={<ImportScreen />} />
        {/* Развилка: сначала выбор вида занятия, потом брифинг с настройками */}
        <Route path="/learn" element={<LearnScreen />} />
        <Route path="/cards" element={<CardsScreen mode="all" />} />
        <Route path="/test" element={<TestScreen />} />
        <Route path="/review" element={<CardsScreen mode="review" />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        {/* Разбор показателя с главного экрана: known | weak | learning | new | accuracy | progress */}
        <Route path="/insight/:group" element={<InsightScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
