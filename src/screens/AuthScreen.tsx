// Путь: src/screens/AuthScreen.tsx
// Экран входа и регистрации по email и паролю.

import { useState } from 'react'
import { supabase } from '../lib/supabase'

/** Переводим технические сообщения Supabase на понятный русский */
function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (m.includes('user already registered')) return 'Такой email уже зарегистрирован. Нажмите «Войти».'
  if (m.includes('password should be at least')) return 'Пароль слишком короткий: нужно минимум 6 символов.'
  if (m.includes('unable to validate email address')) return 'Похоже, email введён с ошибкой.'
  if (m.includes('email logins are disabled')) return 'Вход по email отключён в настройках Supabase.'
  if (m.includes('email not confirmed')) return 'Email не подтверждён. Отключите «Confirm email» в настройках Supabase.'
  if (m.includes('failed to fetch')) return 'Нет связи с сервером. Проверьте интернет и адрес в .env.local.'
  if (m.includes('for security purposes')) return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  return 'Ошибка: ' + message
}

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()          // не перезагружать страницу при отправке формы
    setError(null)
    setInfo(null)
    setBusy(true)

    const credentials = { email: email.trim(), password }

    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)

    setBusy(false)

    if (error) {
      setError(translateError(error.message))
      return
    }

    // Если подтверждение email включено, сессии не будет — предупредим об этом
    if (mode === 'signup' && !data.session) {
      setInfo('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.')
      setMode('signin')
    }
    // Если сессия есть, AuthProvider сам заметит вход и покажет приложение
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 48 }}>
      <div className="center" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 44 }}>🧑‍💼</div>
        <h1>Тренажёр сотрудников</h1>
        <p className="muted small">
          {mode === 'signin' ? 'Войдите, чтобы продолжить обучение' : 'Создайте аккаунт, это займёт минуту'}
        </p>
      </div>

      <form className="card card--pad-lg" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Пароль</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="минимум 6 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{error}</div>
        )}
        {info && (
          <div className="card answer-correct small" style={{ marginBottom: 12 }}>{info}</div>
        )}

        <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={busy}>
          {busy ? 'Подождите...' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <hr className="hr" />

        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }}
        >
          {mode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>

      <p className="muted small center" style={{ marginTop: 16 }}>
        Данные хранятся в вашем личном пространстве и другим пользователям не видны.
      </p>
    </div>
  )
}