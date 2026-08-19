// Путь: src/screens/NewPasswordScreen.tsx
// Экран «задайте новый пароль». Открывается, когда человек пришёл по ссылке
// из письма о восстановлении пароля.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (pass1.length < 6) {
      setError('Пароль слишком короткий: нужно минимум 6 символов.')
      return
    }
    if (pass1 !== pass2) {
      setError('Пароли не совпадают. Проверьте оба поля.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    setBusy(false)

    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('same password')) setError('Это ваш прежний пароль. Придумайте новый.')
      else if (m.includes('session') || m.includes('jwt') || m.includes('expired'))
        setError('Ссылка из письма устарела. Запросите восстановление пароля ещё раз.')
      else setError('Ошибка: ' + error.message)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="auth">
        <div className="auth__bg" aria-hidden="true">
          <span className="blob blob--1" />
          <span className="blob blob--2" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 60, maxWidth: 460 }}>
          <div className="card card--pad-lg center celebrate">
            <p className="big-emoji">{'\u{1F513}'}</p>
            <h2 style={{ margin: '4px 0' }}>Пароль изменён</h2>
            <p className="muted small">Теперь входите с новым паролем. Он уже сохранён на этом устройстве.</p>
            <button className="btn btn--primary btn--lg btn--block" onClick={onDone}>
              Продолжить →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth__bg" aria-hidden="true">
        <span className="blob blob--1" />
        <span className="blob blob--2" />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 60, maxWidth: 460 }}>
        <div className="auth__card">
          <div className="center" style={{ marginBottom: 16 }}>
            <span className="big-emoji">{'\u{1F511}'}</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: '1.2rem' }}>Новый пароль</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Придумайте пароль, который не используете больше нигде. Минимум 6 символов.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="p1">Новый пароль</label>
              <input
                id="p1"
                className="input"
                type={show ? 'text' : 'password'}
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="p2">Повторите пароль</label>
              <input
                id="p2"
                className="input"
                type={show ? 'text' : 'password'}
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <label className="check">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
                <span className="check__box" aria-hidden="true">✓</span>
                <span className="check__text">Показать пароль</span>
              </label>
            </div>

            {error && <div className="card answer-wrong small shake" style={{ marginBottom: 12 }}>{error}</div>}

            <button className={'btn btn--primary btn--block btn--lg' + (busy ? ' is-busy' : '')}
                    type="submit" disabled={busy}>
              {busy ? 'Сохраняю…' : 'Сохранить пароль'}
            </button>
          </form>

          <button className="btn btn--ghost btn--block" style={{ marginTop: 10 }} onClick={onDone}>
            Пропустить и войти как есть
          </button>
        </div>
      </div>
    </div>
  )
}
