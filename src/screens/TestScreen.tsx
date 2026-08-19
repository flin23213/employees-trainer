// Путь: src/screens/TestScreen.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { recordAnswer, useEmployees } from '../lib/employees'
import { buildQuiz, type Question, type QuizMode } from '../lib/quiz'
import { checkAnswer, type CheckResult } from '../lib/answerCheck'

type Phase = 'setup' | 'answering' | 'feedback' | 'done'

export default function TestScreen() {
  const { list, loading, error, reload } = useEmployees()

  const [phase, setPhase] = useState<Phase>('setup')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult>({ verdict: 'wrong' })
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongList, setWrongList] = useState<Question[]>([])

  const current = questions[index]
  const total = questions.length

  function start(mode: QuizMode) {
    const q = buildQuiz(list, mode, 10)
    setQuestions(q)
    setIndex(0)
    setInput('')
    setChosen(null)
    setCorrectCount(0)
    setWrongList([])
    setPhase(q.length === 0 ? 'done' : 'answering')
  }

  /** Собираем «чужие» значения: защита от засчитывания ответа про другого человека */
  function otherValues(question: Question): string[] {
    if (question.field === 'name') {
      return list.filter((e) => !question.acceptable.includes(e.full_name)).map((e) => e.full_name)
    }
    if (question.field === 'title') {
      return list.map((e) => e.job_title).filter((t) => !question.acceptable.includes(t))
    }
    return list
      .map((e) => e.department ?? '')
      .filter((d) => d !== '' && !question.acceptable.includes(d))
  }

  /** Записываем результат в базу и запоминаем для итогов */
  async function commit(question: Question, isCorrect: boolean) {
    if (isCorrect) setCorrectCount((n) => n + 1)
    else setWrongList((prev) => (prev.includes(question) ? prev : [...prev, question]))
    try {
      await recordAnswer(question.employee.id, isCorrect)
    } catch {
      /* не мешаем занятию: статистика догонит при следующем ответе */
    }
  }

  function submit(rawAnswer: string) {
    if (!current || phase !== 'answering') return

    const checked = checkAnswer(rawAnswer, current.acceptable, current.field, otherValues(current))
    setResult(checked)
    setPhase('feedback')

    // «Почти» не записываем сразу: сначала решение пользователя
    if (checked.verdict === 'correct') commit(current, true)
    else if (checked.verdict === 'wrong') commit(current, false)
  }

  /** Решение пользователя по вердикту «почти правильно» */
  function resolveAlmost(asCorrect: boolean) {
    if (!current) return
    commit(current, asCorrect)
    setResult({ verdict: asCorrect ? 'correct' : 'wrong', hint: result.hint })
  }

  function next() {
    setInput('')
    setChosen(null)
    if (index + 1 >= total) { setPhase('done'); reload() }
    else { setIndex(index + 1); setPhase('answering') }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && phase === 'feedback' && result.verdict !== 'almost') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------------------------- ВЫБОР РЕЖИМА --------------------------- */
  if (phase === 'setup') {
    return (
      <div className="container fade-in">
        <AppHeader title="Тест" back />
        {loading && <div className="card center muted">Загружаю...</div>}
        {error && <div className="card answer-wrong">Ошибка: {error}</div>}

        {!loading && list.length === 0 && (
          <div className="card center">
            <p style={{ fontSize: 40, margin: 0 }}>📭</p>
            <p><strong>Сначала добавьте сотрудников</strong></p>
            <Link to="/employees" className="btn btn--primary">К сотрудникам</Link>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="stack">
            <p className="muted small">10 вопросов. Первыми пойдут те, кого вы знаете хуже.</p>

            <button className="card card--clickable" onClick={() => start('mixed')} style={{ textAlign: 'left' }}>
              <strong>🎲 Все типы вопросов</strong>
              <div className="muted small">И ввод текста, и выбор из вариантов. Рекомендую</div>
            </button>

            <button className="card card--clickable" onClick={() => start('choice')} style={{ textAlign: 'left' }}>
              <strong>👉 Только выбор из 4 вариантов</strong>
              <div className="muted small">Проще: для первого знакомства</div>
            </button>

            <button className="card card--clickable" onClick={() => start('input')} style={{ textAlign: 'left' }}>
              <strong>⌨️ Только ввод текста</strong>
              <div className="muted small">Сложнее и полезнее: вспоминаете сами</div>
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------- ИТОГИ ------------------------------- */
  if (phase === 'done') {
    const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100)
    return (
      <div className="container fade-in">
        <AppHeader title="Тест завершён" back />

        {total === 0 ? (
          <div className="card center">
            <p><strong>Не удалось собрать вопросы</strong></p>
            <p className="muted small">
              Для выбора из четырёх вариантов нужно минимум 4 сотрудника с разными должностями.
              Добавьте людей или выберите режим «только ввод текста».
            </p>
            <button className="btn btn--primary" onClick={() => setPhase('setup')}>Назад к выбору</button>
          </div>
        ) : (
          <div className="card card--pad-lg center">
            <p style={{ fontSize: 44, margin: 0 }}>{percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</p>
            <h2>{correctCount} из {total}</h2>
            <p className="muted">Правильных ответов: {percent}%</p>
            <div className="progress" style={{ marginBottom: 16 }}>
              <div className={`progress__bar${percent >= 80 ? ' progress__bar--success' : ''}`} style={{ width: `${percent}%` }} />
            </div>

            {wrongList.length > 0 && (
              <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
                <strong className="small">Ошибки этого теста:</strong>
                <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>
                  {wrongList.map((q, i) => (
                    <li key={i}>{q.employee.full_name} — {q.employee.job_title}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="stack">
              <button className="btn btn--primary btn--lg" onClick={() => setPhase('setup')}>Пройти ещё раз</button>
              {wrongList.length > 0 && <Link to="/review" className="btn">🔁 Повторить ошибки карточками</Link>}
              <Link to="/" className="btn btn--ghost">На главную</Link>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------ ВОПРОС ------------------------------- */
  if (!current) return null
  const percent = Math.round((index / total) * 100)

  const inputStateClass =
    phase !== 'feedback' ? '' :
    result.verdict === 'correct' ? ' answer-correct' :
    result.verdict === 'almost' ? ' answer-almost' : ' answer-wrong'

  return (
    <div className="container fade-in">
      <AppHeader title={`Вопрос ${index + 1} из ${total}`} back />

      <div className="progress" style={{ marginBottom: 16 }}>
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>

      <div className="card card--pad-lg">
        <div className="quiz-prompt">
          <div className="quiz-prompt__label">{current.promptLabel}</div>
          <div className="quiz-prompt__value">{current.promptValue}</div>
        </div>

        <p><strong>{current.question}</strong></p>

        {current.kind === 'input' && (
          <form onSubmit={(e) => { e.preventDefault(); if (phase === 'answering') submit(input) }}>
            <input
              className={`input${inputStateClass}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ваш ответ"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              disabled={phase === 'feedback'}
              style={{ marginBottom: 12 }}
            />
            {phase === 'answering' && (
              <div className="grid grid-2">
                <button className="btn btn--primary btn--block" type="submit" disabled={input.trim() === ''}>
                  Проверить
                </button>
                <button className="btn btn--ghost btn--block" type="button" onClick={() => submit('')}>
                  Не помню
                </button>
              </div>
            )}
          </form>
        )}

        {current.kind === 'choice' && (
          <div className="stack">
            {current.options?.map((option, i) => {
              let extra = ''
              if (phase === 'feedback') {
                if (option === current.answer) extra = ' option--correct'
                else if (option === chosen) extra = ' option--wrong'
                else extra = ' option--muted'
              }
              return (
                <button
                  key={option}
                  className={`btn option${extra}`}
                  disabled={phase === 'feedback'}
                  onClick={() => { setChosen(option); submit(option) }}
                >
                  <span className="option__key">{i + 1}</span>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ------------------------- РАЗБОР ОТВЕТА ------------------------ */}
        {phase === 'feedback' && (
          <div
            className={`card ${
              result.verdict === 'correct' ? 'answer-correct'
              : result.verdict === 'almost' ? 'answer-almost'
              : 'answer-wrong'
            }`}
            style={{ marginTop: 16 }}
          >
            {result.verdict === 'correct' && (
              <p style={{ margin: 0 }}><strong>✅ Правильно</strong></p>
            )}

            {result.verdict === 'almost' && (
              <>
                <p style={{ marginBottom: 6 }}><strong>🤏 Почти правильно</strong></p>
                {result.hint && <p className="small" style={{ marginBottom: 6 }}>{result.hint}</p>}
                <p className="small" style={{ marginBottom: 4 }}>
                  Вы написали: <strong>{input || chosen}</strong>
                </p>
                <p className="small" style={{ marginBottom: 12 }}>
                  Правильно: <strong>{current.answer}</strong>
                </p>
                <div className="grid grid-2">
                  <button className="btn btn--success btn--block" onClick={() => resolveAlmost(true)}>
                    Засчитать
                  </button>
                  <button className="btn btn--danger btn--block" onClick={() => resolveAlmost(false)}>
                    Считать ошибкой
                  </button>
                </div>
              </>
            )}

            {result.verdict === 'wrong' && (
              <>
                <p style={{ marginBottom: 6 }}><strong>❌ Неправильно</strong></p>
                {result.hint && <p className="small" style={{ marginBottom: 6 }}>{result.hint}</p>}
                <p className="small" style={{ marginBottom: 6 }}>
                  Правильный ответ: <strong>{current.answer}</strong>
                </p>
                <p className="small muted" style={{ marginBottom: 10 }}>
                  {current.employee.full_name} — {current.employee.job_title}
                  {current.employee.department ? `, ${current.employee.department}` : ''}
                </p>
              </>
            )}

            {result.verdict !== 'almost' && (
              <button className="btn btn--primary btn--block" onClick={next} autoFocus>
                Понятно
              </button>
            )}
          </div>
        )}
      </div>

      <p className="muted small center" style={{ marginTop: 14 }}>
        Enter — дальше. Ошибки автоматически попадут в «Повторить ошибки».
      </p>
    </div>
  )
}