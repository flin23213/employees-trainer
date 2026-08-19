// Путь: src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import EmployeesScreen from './screens/EmployeesScreen'
import ImportScreen from './screens/ImportScreen'
import CardsScreen from './screens/CardsScreen'
import TestScreen from './screens/TestScreen'
import StatsScreen from './screens/StatsScreen'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="container center" style={{ paddingTop: 80 }}>Загрузка...</div>
  }

  // Не вошёл — показываем только экран входа
  if (!session) return <AuthScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/employees" element={<EmployeesScreen />} />
        <Route path="/import" element={<ImportScreen />} />
        <Route path="/learn" element={<CardsScreen mode="priority" />} />
        <Route path="/cards" element={<CardsScreen mode="all" />} />
        <Route path="/test" element={<TestScreen />} />
        <Route path="/review" element={<CardsScreen mode="review" />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}