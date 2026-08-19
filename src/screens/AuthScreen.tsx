// Путь: src/screens/AuthScreen.tsx
// Экран входа, регистрации и восстановления пароля.
// Обезьянка: висит на лиане, падает (банан улетает), потом выглядывает
// из-за поля пароля и реагирует на ввод.

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
  if (m.includes('redirect') && m.includes('not allowed'))
    return 'Адрес возврата не разрешён в Supabase: добавьте его в Authentication → URL Configuration.'
  return 'Ошибка: ' + message
}

/* ------------------------------------------------------------------ */
/*  Блок, который «выезжает», когда до него доходит прокрутка          */
/* ------------------------------------------------------------------ */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return

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
    <div ref={box} className={'reveal' + (shown ? ' is-in' : '')} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Меняющийся смайлик в логотипе                                      */
/* ------------------------------------------------------------------ */
const FACES = ['\u{1F9D1}\u200D\u{1F4BC}', '\u{1F469}\u200D\u{1F4BB}', '\u{1F468}\u200D\u{1F527}', '\u{1F469}\u200D\u{1F3EB}', '\u{1F9D1}\u200D\u{1F680}']

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
/*  Обезьянка у поля пароля.                                          */
/*  Две картинки из public/monkey/: peek (смотрит) и hide (закрыла    */
/*  глаза). Показывается через 1,6 с после загрузки; уезжает вниз     */
/*  полностью, когда пароль показывают или отправляют форму.          */
/* ------------------------------------------------------------------ */
function Monkey({ visible, eyesClosed, onPoke }: {
  visible: boolean
  eyesClosed: boolean
  onPoke: () => void
}) {
  // Картинки скачиваем заранее, чтобы подмена кадра не мигала
  useEffect(() => {
    ;['peek', 'hide'].forEach((name) => {
      const img = new Image()
      img.src = `/monkey/${name}.webp`
    })
  }, [])

  return (
    <span className={'peek' + (visible ? ' is-in' : '')} onClick={onPoke} role="presentation">
      <img className="peek__img" src={eyesClosed ? '/monkey/hide.webp' : '/monkey/peek.webp'} alt="" />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Экран                                                             */
/* ------------------------------------------------------------------ */
export default function AuthScreen() {
  const [view, setView] = useState<'auth' | 'forgot'>('auth')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  /* --- поведение обезьянки --- */
  const [shown, setShown] = useState(false)      // показалась ли она вообще
  const [typing, setTyping] = useState(false)    // прямо сейчас вводят пароль
  const [poked, setPoked] = useState(false)      // щёлкнули по ней
  const typingTimer = useRef<number | null>(null)
  const pokeTimer = useRef<number | null>(null)

  // Через 1,6 секунды после открытия страницы выглядывает из-за поля
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 1600)
    return () => window.clearTimeout(t)
  }, [])

  // Пока печатают — глаза закрыты. Через 1,2 с после последней клавиши
  // считаем, что ввод закончен, и она открывает глаза.
  function handlePasswordChange(value: string) {
    setPassword(value)
    setTyping(true)
    if (typingTimer.current !== null) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => setTyping(false), 1200)
  }

  /** Щёлкнули по обезьянке — на секунду закрывает глаза */
  function poke() {
    setPoked(true)
    if (pokeTimer.current !== null) window.clearTimeout(pokeTimer.current)
    pokeTimer.current = window.setTimeout(() => setPoked(false), 900)
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current)
      if (pokeTimer.current !== null) window.clearTimeout(pokeTimer.current)
    }
  }, [])

  // Видна, если: уже показалась, пароль не раскрыт, форма не отправляется
  // и мы не на экране восстановления пароля.
  const monkeyVisible = shown && !showPass && !busy && view === 'auth'
  const monkeyEyesClosed = typing || poked

  /* ------------------------- вход и регистрация ------------------------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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

    if (mode === 'signup' && !data.session) {
      setInfo('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.')
      setMode('signin')
    }
  }

  /* ---------------------- восстановление пароля ------------------------ */
  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)

    // redirectTo — куда вернуть человека после нажатия ссылки в письме.
    // Этот адрес должен быть разрешён в Supabase → Authentication → URL Configuration.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/',
    })

    setBusy(false)

    if (error) {
      setError(translateError(error.message))
      return
    }

    setInfo('Письмо отправлено. Откройте ссылку из него — и сможете задать новый пароль. Если письма нет, проверьте «Спам».')
  }

  function switchMode(next: 'signin' | 'signup') {
    if (next === mode) return
    setMode(next)
    setError(null)
    setInfo(null)
  }

  function openForgot() {
    setView('forgot')
    setError(null)
    setInfo(null)
    setPassword('')
  }

  function backToAuth() {
    setView('auth')
    setError(null)
    setInfo(null)
  }

  return (
    <div className="auth">
      {/* Живой фон */}
      <div className="auth__bg" aria-hidden="true">
        <span className="blob blob--1" />
        <span className="blob blob--2" />
        <span className="blob blob--3" />
      </div>

      <div className="auth__floaters" aria-hidden="true">
        <span className="floater floater--1">{'\u{1F469}\u200D\u{1F4BB}'} Дизайнер</span>
        <span className="floater floater--2">{'\u{1F9D1}\u200D\u{1F527}'} Инженер</span>
        <span className="floater floater--3">{'\u{1F468}\u200D\u{1F4BC}'} Директор</span>
        <span className="floater floater--4">{'\u{1F469}\u200D\u2695\uFE0F'} Врач</span>
      </div>

      <div className="auth__wrap">
        {/* =============== О ПРИЛОЖЕНИИ =============== */}
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
              <span className="chip">🃏 Карточки со свайпами</span>
              <span className="chip">✍️ Тесты с проверкой опечаток</span>
              <span className="chip">📈 График занятий</span>
              <span className="chip">📂 Импорт из Excel</span>
              <span className="chip">🤝 Обмен списками по коду</span>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="auth__how">
              <h2 className="section__title" style={{ marginBottom: 14 }}>Как это работает</h2>
              <ol className="steps">
                <li><span className="steps__num">1</span><span><strong>Загружаете список.</strong> Excel, CSV или просто текст, скопированный откуда угодно.</span></li>
                <li><span className="steps__num">2</span><span><strong>Занимаетесь 5 минут в день.</strong> Карточки для узнавания, тест для проверки.</span></li>
                <li><span className="steps__num">3</span><span><strong>Тренажёр запоминает ошибки</strong> и возвращает трудных людей чаще, а выученных — реже.</span></li>
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

        {/* =============== ФОРМА =============== */}
        <div className="auth__formside">
          <div className="auth__card">
            {view === 'auth' ? (
              <>
                <div className="tabs" role="tablist">
                  <span className={'tabs__slider' + (mode === 'signup' ? ' is-right' : '')} aria-hidden="true" />
                  <button type="button" role="tab" aria-selected={mode === 'signin'}
                          className={'tabs__btn' + (mode === 'signin' ? ' is-on' : '')}
                          onClick={() => switchMode('signin')}>
                    Вход
                  </button>
                  <button type="button" role="tab" aria-selected={mode === 'signup'}
                          className={'tabs__btn' + (mode === 'signup' ? ' is-on' : '')}
                          onClick={() => switchMode('signup')}>
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
                    {/* Слева от обезьянки: она сидит над правым краем поля */}
                    <label className="label" htmlFor="password">Пароль</label>

                    {/* Обёртка нужна, чтобы обезьянка села за верхний край поля */}
                    <div className="pw">
                      <Monkey visible={monkeyVisible} eyesClosed={monkeyEyesClosed} onPoke={poke} />
                      <input
                        id="password"
                        className="input pw__input"
                        type={showPass ? 'text' : 'password'}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        placeholder="минимум 6 символов"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => setTyping(false)}
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="row" style={{ marginTop: 4 }}>
                      <label className="check">
                        <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
                        <span className="check__box" aria-hidden="true">✓</span>
                        <span className="check__text">Показать пароль</span>
                      </label>
                      <div className="spacer" />
                      {mode === 'signin' && (
                        <button type="button" className="link-btn small" onClick={openForgot}>
                          Забыли пароль?
                        </button>
                      )}
                    </div>
                  </div>

                  {error && <div className="card answer-wrong small shake" style={{ marginBottom: 12 }}>{error}</div>}
                  {info && <div className="card answer-correct small" style={{ marginBottom: 12 }}>{info}</div>}

                  <button className={'btn btn--primary btn--block btn--lg' + (busy ? ' is-busy' : '')}
                          type="submit" disabled={busy}>
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
              </>
            ) : (
              /* =============== ЗАБЫЛИ ПАРОЛЬ =============== */
              <div className="auth__form">
                <div className="center" style={{ marginBottom: 14 }}>
                  <span className="big-emoji">{'\u{1F511}'}</span>
                  <h2 style={{ margin: '4px 0 6px', fontSize: '1.2rem' }}>Восстановление пароля</h2>
                  <p className="muted small" style={{ margin: 0 }}>
                    Введите email, на который зарегистрирован аккаунт. Пришлём ссылку — по ней зададите новый пароль.
                  </p>
                </div>

                <form onSubmit={handleReset}>
                  <div className="field">
                    <label className="label" htmlFor="email-reset">Email</label>
                    <input
                      id="email-reset"
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="off"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {error && <div className="card answer-wrong small shake" style={{ marginBottom: 12 }}>{error}</div>}
                  {info && <div className="card answer-correct small" style={{ marginBottom: 12 }}>{info}</div>}

                  <button className={'btn btn--primary btn--block btn--lg' + (busy ? ' is-busy' : '')}
                          type="submit" disabled={busy}>
                    {busy ? 'Отправляю…' : '📨 Отправить ссылку'}
                  </button>
                </form>

                <button className="btn btn--ghost btn--block" style={{ marginTop: 10 }} onClick={backToAuth}>
                  ← Вернуться к входу
                </button>
              </div>
            )}
          </div>

          <p className="auth__scroll-hint muted small center">↓ ниже — коротко о тренажёре</p>
        </div>
      </div>
    </div>
  )
}
