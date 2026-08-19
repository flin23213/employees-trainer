// Путь: src/screens/StatsScreen.tsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import {
  computeDepartmentStats,
  computeStats,
  resetAllProgress,
  STATUS_META,
  useEmployees,
} from '../lib/employees'

export default function StatsScreen() {
  const { list, loading, error, reload } = useEmployees()
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const s = computeStats(list)
  const depts = useMemo(() => computeDepartmentStats(list), [list])

  // Пятеро, которых знаете хуже всех (из тех, кого уже спрашивали)
  const weakest = useMemo(
    () => list.filter((e) => e.attempts > 0).sort((a, b) => a.accuracy - b.accuracy || b.priority - a.priority).slice(0, 5),
    [list]
  )

  async function handleReset() {
    setBusy(true)
    setResetError(null)
    try {
      await resetAllProgress()
      setConfirmReset(false)
      reload()
    } catch (e) {
      setResetError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container container--wide fade-in">
      <AppHeader title="Статистика" back />

      {loading && <div className="card center muted">Загружаю...</div>}
      {error && <div className="card answer-wrong">Ошибка: {error}</div>}

      {!loading && list.length === 0 && (
        <div className="card center">
          <p style={{ fontSize: 40, margin: 0 }}>📭</p>
          <p><strong>Пока нет данных</strong></p>
          <Link to="/employees" className="btn btn--primary">Добавить сотрудников</Link>
        </div>
      )}

      {!loading && list.length > 0 && (
        <>
          {/* --- Общая сводка --- */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Всего сотрудников: {s.total}</h3>

            <div className="progress" style={{ marginBottom: 14 }}>
              <div
                className={`progress__bar${s.progressPercent >= 100 ? ' progress__bar--success' : ''}`}
                style={{ width: `${s.progressPercent}%` }}
              />
            </div>

            <div className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span><span className={STATUS_META.known.className}>Изучено хорошо</span></span>
                <strong>{s.known}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span><span className={STATUS_META.learning.className}>В процессе</span></span>
                <strong>{s.learning}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span><span className={STATUS_META.weak.className}>Нужно повторить</span></span>
                <strong>{s.weak}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span><span className={STATUS_META.new.className}>Не изучено</span></span>
                <strong>{s.fresh}</strong>
              </div>
              <hr className="hr" style={{ margin: '6px 0' }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Средний процент правильных ответов</span>
                <strong>{s.avgAccuracy}%</strong>
              </div>
            </div>
          </div>

          {/* --- Слабые места --- */}
          {weakest.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Знаю хуже всего</h3>
              <div className="stack" style={{ gap: 10 }}>
                {weakest.map((e) => (
                  <div key={e.id}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="truncate"><strong>{e.full_name}</strong> <span className="muted small">{e.job_title}</span></span>
                      <span className="small" style={{ color: e.accuracy < 60 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {e.accuracy}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6, marginTop: 4 }}>
                      <div
                        className={`progress__bar${e.accuracy >= 80 ? ' progress__bar--success' : ''}`}
                        style={{ width: `${e.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <Link to="/review" className="btn btn--primary btn--sm">🔁 Повторить ошибки</Link>
              </div>
            </div>
          )}

          {/* --- По отделам --- */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Прогресс по отделам</h3>
            <p className="muted small">Сначала те отделы, где выучено меньше всего.</p>

            <div className="stack" style={{ gap: 14 }}>
              {depts.map((d) => (
                <div key={d.department}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong className="truncate">{d.department}</strong>
                    <span className="small muted">{d.known} из {d.total}</span>
                  </div>
                  <div className="progress" style={{ height: 8, marginTop: 6 }}>
                    <div
                      className={`progress__bar${d.percent >= 80 ? ' progress__bar--success' : ''}`}
                      style={{ width: `${d.percent}%` }}
                    />
                  </div>
                  <div className="row small muted" style={{ gap: 12, marginTop: 5 }}>
                    <span>Выучено: {d.percent}%</span>
                    {d.weak > 0 && <span style={{ color: 'var(--danger)' }}>Слабых: {d.weak}</span>}
                    {d.fresh > 0 && <span>Не изучено: {d.fresh}</span>}
                    {d.avgAccuracy > 0 && <span>Точность: {d.avgAccuracy}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- Сброс --- */}
          <div className="card">
            <h3>Сброс прогресса</h3>
            <p className="muted small">
              Обнуляет всю статистику обучения. Сами сотрудники, должности и описания останутся на месте.
            </p>

            {resetError && <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{resetError}</div>}

            {!confirmReset ? (
              <button className="btn btn--danger" onClick={() => setConfirmReset(true)}>
                Сбросить прогресс
              </button>
            ) : (
              <div className="card answer-wrong">
                <p className="small" style={{ marginBottom: 10 }}>
                  Обнулить статистику по всем {s.total} сотрудникам? Отменить будет нельзя.
                </p>
                <div className="row">
                  <button className="btn btn--danger btn--sm" onClick={handleReset} disabled={busy}>
                    {busy ? 'Сбрасываю...' : 'Да, сбросить'}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(false)} disabled={busy}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}