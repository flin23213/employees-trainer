// Путь: src/screens/CardsScreen.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { buildSession, recordAnswer, useEmployees, type SessionMode } from '../lib/employees'
import type { EmployeeWithProgress } from '../types'

const TITLES: Record<SessionMode, string> = {
  priority: 'Обучение',
  all: 'Карточки',
  review: 'Повторить ошибки',
}

export default function CardsScreen({ mode }: { mode: SessionMode }) {
  const { list, loading, error, reload } = useEmployees()

  const [session, setSession] = useState<EmployeeWithProgress[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Колоду собираем один раз, когда данные загрузились
  useEffect(() => {
    if (!loading && session === null) {
      setSession(buildSession(list, mode))
    }
  }, [loading, list, mode, session])

  const current = session && index < session.length ? session[index] : null
  const finished = session !== null && index >= session.length
  const total = session?.length ?? 0

  async function answer(correct: boolean) {
    if (!current) return
    // Сразу двигаемся дальше, не заставляя ждать сервер: так приятнее на телефоне
    if (correct) setKnown((n) => n + 1)
    else setUnknown((n) => n + 1)
    setRevealed(false)
    setIndex((i) => i + 1)

    try {
      await recordAnswer(current.id, correct)
    } catch (e) {
      setSaveError('Не удалось сохранить один из ответов: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  function restart() {
    setSession(null)
    setIndex(0)
    setRevealed(false)
    setKnown(0)
    setUnknown(0)
    setSaveError(null)
    reload()
  }

  // Управление с клавиатуры на компьютере
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); setRevealed(true) }
      else if (revealed && (e.key === '1' || e.key === 'ArrowLeft')) answer(false)
      else if (revealed && (e.key === '2' || e.key === 'ArrowRight')) answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const percent = useMemo(() => (total === 0 ? 0 : Math.round((index / total) * 100)), [index, total])

  return (
    <div className="container fade-in">
      <AppHeader title={TITLES[mode]} back />

      {loading && <div className="card center muted">Загружаю...</div>}
      {error && <div className="card answer-wrong">Ошибка: {error}</div>}

      {/* Нечего показывать */}
      {!loading && session !== null && total === 0 && (
        <div className="card center">
          <p style={{ fontSize: 40, margin: 0 }}>{mode === 'review' ? '🎉' : '📭'}</p>
          <p>
            <strong>
              {mode === 'review'
                ? 'Слабых мест нет!'
                : 'Пока некого учить'}
            </strong>
          </p>
          <p className="muted small">
            {mode === 'review'
              ? 'Пройдите тест или карточки, и здесь появятся те, кого вы знаете хуже всего.'
              : 'Сначала добавьте сотрудников или загрузите их из файла.'}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/employees" className="btn btn--primary btn--sm">Сотрудники</Link>
            <Link to="/" className="btn btn--ghost btn--sm">На главную</Link>
          </div>
        </div>
      )}

      {/* Занятие идёт */}
      {current && (
        <>
          <div className="row small muted" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Карточка {index + 1} из {total}</span>
            <span>✅ {known} · ❌ {unknown}</span>
          </div>
          <div className="progress" style={{ marginBottom: 16 }}>
            <div className="progress__bar" style={{ width: `${percent}%` }} />
          </div>

          <div className="card card--pad-lg" style={{ marginBottom: 16 }}>
            <div className="flashcard">
              <div className="flashcard__name">{current.full_name}</div>
              {!revealed && <div className="flashcard__hint">Кто это и чем занимается?</div>}

              {revealed && (
                <div className="flashcard__answer">
                  <div className="answer-row">
                    <span className="answer-row__label">Должность</span>
                    <span className="answer-row__value">{current.job_title}</span>
                  </div>
                  {current.department && (
                    <div className="answer-row">
                      <span className="answer-row__label">Отдел</span>
                      <span className="answer-row__value">{current.department}</span>
                    </div>
                  )}
                  {current.description && (
                    <div className="answer-row">
                      <span className="answer-row__label">Чем занимается</span>
                      <span>{current.description}</span>
                    </div>
                  )}
                  {current.notes && (
                    <div className="answer-row">
                      <span className="answer-row__label">Заметка</span>
                      <span className="muted">{current.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!revealed ? (
            <button className="btn btn--primary btn--block btn--lg" onClick={() => setRevealed(true)}>
              Показать ответ
            </button>
          ) : (
            <div className="grid grid-2">
              <button className="btn btn--danger btn--block btn--lg" onClick={() => answer(false)}>
                ❌ Не знаю
              </button>
              <button className="btn btn--success btn--block btn--lg" onClick={() => answer(true)}>
                ✅ Знаю
              </button>
            </div>
          )}

          <p className="muted small center" style={{ marginTop: 14 }}>
            На компьютере: пробел — показать ответ, ← не знаю, → знаю
          </p>
        </>
      )}

      {/* Занятие закончено */}
      {finished && total > 0 && (
        <div className="card card--pad-lg center">
          <p style={{ fontSize: 44, margin: 0 }}>{unknown === 0 ? '🏆' : known >= unknown ? '👍' : '💪'}</p>
          <h2>Занятие завершено</h2>
          <p>
            Знаю: <strong style={{ color: 'var(--success)' }}>{known}</strong> ·
            {' '}Не знаю: <strong style={{ color: 'var(--danger)' }}>{unknown}</strong>
          </p>
          <div className="progress" style={{ marginBottom: 16 }}>
            <div
              className="progress__bar progress__bar--success"
              style={{ width: `${total === 0 ? 0 : Math.round((known / total) * 100)}%` }}
            />
          </div>
          {saveError && <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{saveError}</div>}
          <div className="stack">
            <button className="btn btn--primary btn--lg" onClick={restart}>Ещё раз</button>
            {unknown > 0 && <Link to="/review" className="btn">🔁 Повторить только ошибки</Link>}
            <Link to="/" className="btn btn--ghost">На главную</Link>
          </div>
        </div>
      )}
    </div>
  )
}