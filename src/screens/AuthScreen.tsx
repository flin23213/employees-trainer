// Путь: src/screens/AuthScreen.tsx
// Экран входа и регистрации. Логика та же, что была; добавлены живой фон,
// вкладки «Вход / Регистрация», показ пароля и рассказ о приложении внизу.

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

/** Переводим технические сообщения Supabase на понятный русский */
function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (m.includes('user already registered')) return 'Такой email уже зарегистрирован. Нажмите «Вход».'
  if (m.includes('password should be at least')) return 'Пароль слишком короткий: нужно минимум 6 символов.'
  if (m.includes('unable to validate email address')) return 'Похоже, email введён с ошибкой.'
  if (m.includes('email logins are disabled')) return 'Вход по email отключён в настройках Supabase.'
  if (m.includes('email not confirmed')) return 'Email не подтверждён. Отключите «Confirm email» в настройках Supabase.'
  if (m.includes('failed to fetch')) return 'Нет связи с сервером. Проверьте интернет и адрес в .env.local.'
  if (m.includes('for security purposes')) return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  return 'Ошибка: ' + message
}

/* ------------------------------------------------------------------ */
/*  Блок, который «выезжает», когда доходит до него прокрутка          */
/* ------------------------------------------------------------------ */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return

    // IntersectionObserver — встроенный в браузер наблюдатель:
    // сообщает, когда элемент появился в видимой части страницы.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className={'reveal' + (shown ? ' is-in' : '')}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Меняющийся смайлик в логотипе                                      */
/* ------------------------------------------------------------------ */
const FACES = ['🧑‍💼', '👩‍💻', '👨‍🔧', '👩‍🏫', '🧑‍🚀', '👩‍⚕️', '🧑‍🎨']

function AuthLogo() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setI((n) => (n + 1) % FACES.length), 2200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="auth__logo" aria-hidden="true">
      <span className="auth__logo-face" key={i}>{FACES[i]}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Экран                                                             */
/* ------------------------------------------------------------------ */
export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
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

  function switchMode(next: 'signin' | 'signup') {
    if (next === mode) return
    setMode(next)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="auth">
      {/* Живой фон: три цветных пятна медленно плавают */}
      <div className="auth__bg" aria-hidden="true">
        <span className="blob blob--1" />
        <span className="blob blob--2" />
        <span className="blob blob--3" />
      </div>

      {/* Плавающие карточки-«сотрудники» для настроения */}
      <div className="auth__floaters" aria-hidden="true">
        <span className="floater floater--1">👩‍💻 Дизайнер</span>
        <span className="floater floater--2">🧑‍🔧 Инженер</span>
        <span className="floater floater--3">👨‍💼 Директор</span>
        <span className="floater floater--4">👩‍⚕️ Врач</span>
      </div>

      <div className="auth__wrap">
        {/* =============== ЛЕВАЯ ЧАСТЬ: О ПРИЛОЖЕНИИ =============== */}
        <div className="auth__pitch">
          <Reveal>
            <AuthLogo />
            <h1 className="auth__h1">
              Запомните <span className="auth__accent">всех коллег</span> по именам
            </h1>
            <p className="auth__lead">
              Личный тренажёр: загружаете список сотрудников, а он сам решает, кого показать вам сегодня,
              чтобы через неделю вы не путались в лицах и должностях.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="auth__chips">
              <span className="chip">🗂 Карточки со свайпами</span>
              <span className="chip">✍️ Тесты с проверкой опечаток</span>
              <span className="chip">📈 График занятий</span>
              <span className="chip">📂 Импорт из Excel</span>
              <span className="chip">📱 Работает как приложение</span>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="auth__how">
              <h2 className="section__title" style={{ marginBottom: 14 }}>Как это работает</h2>
              <ol className="steps">
                <li><span className="steps__num">1</span><span><strong>Загружаете список.</strong> Excel, CSV или просто текст, скопированный откуда угодно.</span></li>
                <li><span className="steps__num">2</span><span><strong>Занимаетесь 5 минут в день.</strong> Карточки для узнавания, тест для проверки.</span></li>
                <li><span className="steps__num">3</span><span><strong>Тренажёр запоминает ваши ошибки</strong> и возвращает трудных людей чаще, а выученных — реже.</span></li>
                <li><span className="steps__num">4</span><span><strong>Смотрите прогресс.</strong> Видно, кого знаете, где слабые места и сколько дней подряд занимаетесь.</span></li>
              </ol>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p className="muted small auth__note">
              🔒 Список сотрудников виден только вам: данные лежат в вашем личном пространстве
              и защищены на стороне сервера.
            </p>
          </Reveal>
        </div>

        {/* =============== ПРАВАЯ ЧАСТЬ: ФОРМА =============== */}
        <div className="auth__formside">
          <div className="auth__card">
            {/* Вкладки с бегающим индикатором */}
            <div className="tabs" role="tablist">
              <span className={'tabs__slider' + (mode === 'signup' ? ' is-right' : '')} aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={'tabs__btn' + (mode === 'signin' ? ' is-on' : '')}
                onClick={() => switchMode('signin')}
              >
                Вход
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={'tabs__btn' + (mode === 'signup' ? ' is-on' : '')}
                onClick={() => switchMode('signup')}
              >
                Регистрация
              </button>
            </div>

            <p className="muted small center" style={{ margin: '14px 0 18px' }}>
              {mode === 'signin'
                ? 'С возвращением! Продолжим с того места, где остановились.'
                : 'Аккаунт создаётся за минуту, ничего подтверждать не нужно.'}
            </p>

            <form onSubmit={handleSubmit} key={mode} className="auth__form">
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
                <div className="input-wrap">
                  <input
                    id="password"
                    className="input"
                    type={showPass ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="input-eye"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error && <div className="card answer-wrong small shake" style={{ marginBottom: 12 }}>{error}</div>}
              {info && <div className="card answer-correct small" style={{ marginBottom: 12 }}>{info}</div>}

              <button
                className={'btn btn--primary btn--block btn--lg' + (busy ? ' is-busy' : '')}
                type="submit"
                disabled={busy}
              >
                {busy ? 'Подождите…' : mode === 'signin' ? 'Войти →' : 'Создать аккаунт →'}
              </button>
            </form>

            <p className="muted small center" style={{ marginTop: 16, marginBottom: 0 }}>
              {mode === 'signin' ? (
                <>Первый раз здесь? <button className="link-btn" onClick={() => switchMode('signup')}>Зарегистрируйтесь</button></>
              ) : (
                <>Уже есть аккаунт? <button className="link-btn" onClick={() => switchMode('signin')}>Войдите</button></>
              )}
            </p>
          </div>

          <p className="auth__scroll-hint muted small center">↓ ниже — коротко о тренажёре</p>
        </div>
      </div>
    </div>
  )
}
