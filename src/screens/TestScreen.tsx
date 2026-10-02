// Путь: src/screens/TestScreen.tsx
// Тест: брифинг с настройками → вопросы → разбор → итоги.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Briefing, { Segmented } from '../components/Briefing'
import TrainingScope from '../components/TrainingScope'
import Icon from '../components/Icon'
import { recordAnswer, useEmployees } from '../lib/employees'
import { useLists } from '../lib/lists'
import { filterTrainingEmployees, scopeForList, type ListTrainingScope } from '../lib/trainingScope'
import { logAnswer } from '../lib/activity'
import { buildQuiz, type Question, type QuizMode, type QuizTopic } from '../lib/quiz'
import { checkAnswer, type CheckResult } from '../lib/answerCheck'
import type { EmployeeWithProgress } from '../types'

type Phase = 'brief' | 'answering' | 'feedback' | 'done'
type Pool = 'all' | 'weak'
type Settings = { size: number; mode: QuizMode; pool: Pool; topic: QuizTopic }

const DEFAULTS: Settings = { size: 10, mode: 'mixed', pool: 'all', topic: 'roles' }

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('test-settings')
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw) as Partial<Settings> | null
    if (!saved || typeof saved !== 'object') return DEFAULTS
    return {
      size: [0, 5, 10, 20].includes(saved.size ?? -1) ? saved.size! : DEFAULTS.size,
      mode: saved.mode === 'choice' || saved.mode === 'input' ? saved.mode : DEFAULTS.mode,
      pool: saved.pool === 'weak' ? saved.pool : DEFAULTS.pool,
      topic: saved.topic === 'departments' || saved.topic === 'all' ? saved.topic : DEFAULTS.topic,
    }
  } catch {
    return DEFAULTS
  }
}

/** Кого считаем слабым местом */
function isWeak(e: EmployeeWithProgress): boolean {
  return e.status === 'new' || e.status === 'weak' || e.accuracy < 60 || e.last_result === false
}

export default function TestScreen() {
  const { list, loading, error, reload } = useEmployees()
  const { active, loading: listsLoading, error: listsError } = useLists()
  const [selection, setSelection] = useState<ListTrainingScope | null>(null)
  const scope = scopeForList(selection, active?.id)
  const selectedPool = filterTrainingEmployees(list, scope)

  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [phase, setPhase] = useState<Phase>('brief')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult>({ verdict: 'wrong' })
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongList, setWrongList] = useState<Question[]>([])
  const submitted = useRef(false)
  const almostResolved = useRef(false)
  const page = useRef<HTMLDivElement>(null)

  const current = questions[index]
  const total = questions.length

  useLayoutEffect(() => {
    if (phase !== 'feedback') page.current?.closest('.app-content')?.scrollTo(0, 0)
  }, [phase, index])

  useEffect(() => {
    localStorage.setItem('test-settings', JSON.stringify(settings))
  }, [settings])

  /** Список, из которого берём вопросы (с защитой: слишком узкий пул не годится) */
  function pickPool(st: Settings): EmployeeWithProgress[] {
    if (st.pool === 'all') return selectedPool
    const weak = selectedPool.filter(isWeak)
    return weak.length >= 4 ? weak : selectedPool
  }

  function makeQuestions(st: Settings): Question[] {
    const pool = pickPool(st)
    const size = st.size === 0 ? pool.length : st.size
    return buildQuiz(pool, st.mode, size, st.topic)
  }

  function start() {
    if (loading || listsLoading || !active) return
    const q = makeQuestions(settings)
    if (!q.length) return
    setQuestions(q)
    setIndex(0)
    setInput('')
    setChosen(null)
    setCorrectCount(0)
    setWrongList([])
    submitted.current = false
    almostResolved.current = false
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

    logAnswer(isCorrect)   // отмечаем ответ в дневнике занятий (для графика по дням)
    try {
      await recordAnswer(question.employee.id, isCorrect)
    } catch {
      /* не мешаем занятию: статистика догонит при следующем ответе */
    }
  }

  function submit(rawAnswer: string) {
    if (!current || phase !== 'answering' || submitted.current) return
    submitted.current = true

    const checked = checkAnswer(rawAnswer, current.acceptable, current.field, otherValues(current))
    setResult(checked)
    setPhase('feedback')

    if (checked.verdict === 'correct') void commit(current, true)
    else if (checked.verdict === 'wrong') void commit(current, false)
  }

  /** Решение пользователя по вердикту «почти правильно» */
  function resolveAlmost(asCorrect: boolean) {
    if (!current || phase !== 'feedback' || result.verdict !== 'almost' || almostResolved.current) return
    almostResolved.current = true
    void commit(current, asCorrect)
    setResult({ verdict: asCorrect ? 'correct' : 'wrong', hint: result.hint })
  }

  function next() {
    if (phase !== 'feedback' || result.verdict === 'almost' || !submitted.current) return
    submitted.current = false
    almostResolved.current = false
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

  /* ============================ БРИФИНГ =========================== */
  if (phase === 'brief') {
    const preview = loading ? [] : makeQuestions(settings)
    const weakCount = selectedPool.filter(isWeak).length

    return (
      <div className="container" ref={page}>
        <AppHeader title="Тест" back />

        {loading && <div className="card center muted">Загружаю…</div>}
        {(error || listsError) && <div className="card answer-wrong">Ошибка: {error || listsError}</div>}

        {!loading && list.length === 0 && (
          <div className="card card--pad-lg center">
            <p className="empty-state__icon"><Icon name="library" /></p>
            <p><strong>Сначала добавьте сотрудников</strong></p>
            <p className="muted small">Тест собирается из вашего списка, поэтому без него вопросов не будет.</p>
            <div className="stack">
              <Link to="/import" className="btn btn--primary"><Icon name="library" /> Загрузить из файла</Link>
              <Link to="/employees" className="btn"><Icon name="plus" /> Добавить вручную</Link>
            </div>
          </div>
        )}

        {!loading && list.length > 0 && (
          <Briefing
            icon={<Icon name="check" />}
            title="Проверка знаний"
            what="Проверьте, как хорошо вы запомнили имена и должности коллег. Выберите ответы из вариантов или вспоминайте их самостоятельно."
            steps={[
              'Вопросы бывают двух видов: вписать ответ своими словами или выбрать один из четырёх вариантов.',
              'Опечатки прощаются: «Федорова» вместо «Фёдорова» пройдёт. Спорные случаи я помечу как «почти правильно», и вы сами решите, зачесть ли.',
              'Не помните — жмите «Не помню». Это не стыдно, зато человек вернётся в повторение.',
              'После каждого ответа показываю правильный вариант и краткую справку о сотруднике.',
            ]}
            settings={
              <>
                <TrainingScope key={active?.id} employees={list} value={scope} disabled={listsLoading || !active} onChange={value => { if (active) setSelection({ listId: active.id, value }) }} />
                <div className="setting">
                  <div className="setting__title">Что проверять</div>
                  <p className="setting__hint">
                    Имена и должности — основной режим. Отделы и описания включаются отдельно.
                  </p>
                  <Segmented
                    value={settings.topic}
                    options={[
                      { value: 'roles' as QuizTopic, label: 'Имена и должности' },
                      { value: 'departments' as QuizTopic, label: 'Отделы' },
                      { value: 'all' as QuizTopic, label: 'Всё' },
                    ]}
                    onChange={(topic) => setSettings({ ...settings, topic })}
                  />
                </div>

                <div className="setting">
                  <div className="setting__title">Сколько вопросов</div>
                  <p className="setting__hint">10 вопросов — это примерно 3-4 минуты.</p>
                  <Segmented
                    value={settings.size}
                    options={[
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                      { value: 20, label: '20' },
                      { value: 0, label: 'Макс.' },
                    ]}
                    onChange={(size) => setSettings({ ...settings, size })}
                  />
                </div>

                <div className="setting">
                  <div className="setting__title">Тип вопросов</div>
                  <p className="setting__hint">
                    Выбор из вариантов — проще, ввод текста — сложнее и полезнее. «Всё вперемешку» рекомендую.
                  </p>
                  <Segmented
                    value={settings.mode}
                    options={[
                      { value: 'mixed' as QuizMode, label: 'Вперемешку' },
                      { value: 'choice' as QuizMode, label: 'Выбор' },
                      { value: 'input' as QuizMode, label: 'Ввод' },
                    ]}
                    onChange={(mode) => setSettings({ ...settings, mode })}
                  />
                </div>

                <div className="setting">
                  <div className="setting__title">Кого спрашивать</div>
                  <p className="setting__hint">
                    {weakCount >= 4
                      ? `Слабых мест сейчас ${weakCount}. Можно погонять только их.`
                      : 'Слабых мест пока меньше четырёх, поэтому вопросы будут из всего выбранного состава.'}
                  </p>
                  <Segmented
                    value={settings.pool}
                    options={[
                      { value: 'all' as Pool, label: 'Всех' },
                      { value: 'weak' as Pool, label: 'Слабые места' },
                    ]}
                    onChange={(pool) => setSettings({ ...settings, pool })}
                  />
                </div>
              </>
            }
            summary={
              preview.length === 0
                ? selectedPool.length === 0
                  ? 'Никто не выбран. Измените фильтры или сбросьте выбор сотрудников.'
                  : settings.topic === 'departments'
                  ? 'Добавьте отделы сотрудникам. Для режима «Выбор» нужно минимум 4 разных отдела; для ввода ответа достаточно одного.'
                  : 'По этим настройкам вопросы не собрались. Для режима «Выбор» нужно минимум 4 человека с разными должностями.'
                : `Готово ${preview.length} ${preview.length === 1 ? 'вопрос' : preview.length < 5 ? 'вопроса' : 'вопросов'}`
            }
            startLabel={preview.length === 0 ? 'Вопросы не собрались' : 'Начать тест'}
            disabled={preview.length === 0 || listsLoading || !active}
            onStart={start}
          />
        )}
      </div>
    )
  }

  /* ------------------------------- ИТОГИ ------------------------------- */
  if (phase === 'done') {
    const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100)
    return (
      <div className="container fade-in" ref={page}>
        <AppHeader title="Тест завершён" back />

        {total === 0 ? (
          <div className="card center">
            <p><strong>Не удалось собрать вопросы</strong></p>
            <p className="muted small">
              Добавьте данные для выбранной темы или выберите режим «Ввод».
              Для выбора из вариантов нужны четыре разных должности или отдела.
            </p>
            <button className="btn btn--primary" onClick={() => setPhase('brief')}>Назад к настройкам</button>
          </div>
        ) : (
          <div className="card card--pad-lg center">
            <p className="result-icon"><Icon name={percent >= 80 ? 'check' : 'chart'} /></p>
            <h2 style={{ margin: '4px 0' }}>{correctCount} из {total}</h2>
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
              <button className="btn btn--primary btn--lg" onClick={() => setPhase('brief')}><Icon name="repeat" /> Пройти ещё раз</button>
              {wrongList.length > 0 && <Link to="/review" className="btn"><Icon name="cards" /> Повторить ошибки карточками</Link>}
              <Link to="/insight/weak" className="btn btn--ghost"><Icon name="chart" /> Мои слабые места</Link>
              <Link to="/" className="btn btn--ghost"><Icon name="home" /> На главную</Link>
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
    <div className="container fade-in" ref={page}>
      <AppHeader title={`Вопрос ${index + 1} из ${total}`} back />

      <div className="progress" style={{ marginBottom: 16 }}>
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>

      <div className="card card--pad-lg" key={index}>
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
                if (current.acceptable.includes(option)) extra = ' option--correct'
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
            className={`card answer-feedback ${
              result.verdict === 'correct' ? 'answer-correct is-correct'
              : result.verdict === 'almost' ? 'answer-almost'
              : 'answer-wrong is-wrong'
            }`}
            role="status"
            style={{ marginTop: 16 }}
          >
            {result.verdict === 'correct' && (
              <p className="answer-feedback__title" style={{ margin: 0 }}><Icon name="check" /><strong>Правильно</strong></p>
            )}

            {result.verdict === 'almost' && (
              <>
                <p style={{ marginBottom: 6 }}><strong>Почти правильно</strong></p>
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
                <p className="answer-feedback__title" style={{ marginBottom: 6 }}><Icon name="close" /><strong>Неправильно</strong></p>
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
