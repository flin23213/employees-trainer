// Путь: src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthProvider'
import OfflineBanner from './components/OfflineBanner'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OfflineBanner />
      <App />
    </AuthProvider>
  </StrictMode>
)

// Service worker включаем ТОЛЬКО в собранной версии.
// В режиме разработки он мешал бы: браузер отдавал бы старые файлы,
// и вы бы не видели свои правки.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Не удалось зарегистрировать service worker:', err)
    })
  })
}