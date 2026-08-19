// Путь: src/screens/ProfileScreen.tsx
// Профиль: данные аккаунта и личная статистика обучения.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../auth/AuthProvider'
import { computeStats, resetAllProgress, useEmployees } from '../lib/employees'
import { clearActivity } from '../lib/activity'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const { list, loading, error, reload } = useEmployees()
  const s = computeStats(list)

  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  // Складываем ответы по всем сотрудникам. useMemo = «пересчитывай только
  // когда список изменился», чтобы не считать заново при каждой перерисовке.
  const totals = useMemo(() => {
    const attempts = list.reduce((n, e) => n + e.attempts, 0)
    const correct = list.reduce((n, e) => n + e.correct_count, 0)
    const bestStreak = list.reduce((m, e) => Math.max(m, e.streak), 0)
    return { attempts, correct, wrong: attempts - correct, bestStreak }
  }, [list])

  const email = session?.user.email ?? '—'

  async function handleReset() {
    const ok = window.confirm(
      'Обнулить статистику по ВСЕМ сотрудникам?\n\n' +
      'Сами сотрудники останутся на месте, сбросятся только ответы, проценты и серии.'
    )
    if (!ok) return

    setBusy(true)
    setInfo(null)
    try {
      await resetAllProgress()
      clearActivity()   // заодно очищаем дневник занятий, чтобы график тоже обнулился
      reload()
      setInfo('Прогресс обнулён — можно учиться с чистого листа.')
    } catch (e) {
      setInfo(e instanceof Error ? e.message : 'Не удалось сбросить прогресс')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container fade-in">
      <AppHeader title="Профиль" back />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Аккаунт */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 14 }}>
          <div className="drawer__avatar" style={{ width: 54, height: 54, fontSize: '1.3rem' }}>
            {email.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }} className="truncate">{email}</div>
            <div className="muted small">Аккаунт создан: {formatDate(session?.user.created_at)}</div>
            <div className="muted small">Способ входа: email и пароль</div>
          </div>
        </div>
      </div>

      {/* Общий прогресс */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <strong>Общий прогресс</strong>
          <div className="spacer" />
          <span className="badge badge--known">{s.progressPercent}%</span>
        </div>
        <div className="progress">
          <div
            className={'progress__bar' + (s.progressPercent >= 80 ? ' progress__bar--success' : '')}
            style={{ width: `${s.progressPercent}%` }}
          />
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          Выучено {s.known} из {s.total} сотрудников
        </div>
      </div>

      {/* Плитки */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat__value">{s.total}</div>
          <div className="stat__label">сотрудников</div>
        </div>
        <div className="card stat">
          <div className="stat__value" style={{ color: 'var(--success)' }}>{s.known}</div>
          <div className="stat__label">выучено</div>
        </div>
        <div className="card stat">
          <div className="stat__value" style={{ color: 'var(--danger)' }}>{s.weak}</div>
          <div className="stat__label">слабые места</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{s.avgAccuracy}%</div>
          <div className="stat__label">точность</div>
        </div>
      </div>

      {/* Мои ответы */}
      <div className="card" style={{ marginBottom: 16 }}>
        <strong>Мои ответы</strong>
        <hr className="hr" />
        <div className="stack" style={{ gap: 8 }}>
          <div className="row"><span>Всего ответов</span><div className="spacer" /><strong>{totals.attempts}</strong></div>
          <div className="row"><span>Правильных</span><div className="spacer" /><strong style={{ color: 'var(--success)' }}>{totals.correct}</strong></div>
          <div className="row"><span>Неправильных</span><div className="spacer" /><strong style={{ color: 'var(--danger)' }}>{totals.wrong}</strong></div>
          <div className="row"><span>Лучшая серия без ошибок</span><div className="spacer" /><strong>{totals.bestStreak}</strong></div>
        </div>
        {loading && <div className="muted small" style={{ marginTop: 10 }}>Обновляем данные...</div>}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Link to="/stats" className="btn btn--block">📊 Подробная статистика</Link>
        <Link to="/employees" className="btn btn--block">👥 Сотрудники</Link>
      </div>

      {info && <div className="card answer-correct small" style={{ marginBottom: 16 }}>{info}</div>}

      {/* Опасные действия — отдельно, чтобы не нажать случайно */}
      <div className="card">
        <strong>Управление данными</strong>
        <p className="muted small" style={{ marginTop: 6 }}>
          Сброс прогресса удаляет только статистику обучения. Список сотрудников не тронется.
        </p>
        <div className="stack">
          <button className="btn btn--danger btn--block" onClick={handleReset} disabled={busy}>
            {busy ? 'Сбрасываю...' : '↺ Обнулить весь прогресс'}
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => void signOut()}>
            🚪 Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}