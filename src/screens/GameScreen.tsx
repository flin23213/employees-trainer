import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GameLeaderboard from '../components/GameLeaderboard'
import GameArtwork from '../components/GameArtwork'
import Icon from '../components/Icon'
import { useLists } from '../lib/lists'
import { useEmployees } from '../lib/employees'
import { formatTime, makeRound, makeMatchTiles, normalizeRole, quizOptions, rolesMatch, scoreTime, type MatchTile, type GameEmployee, type GameMode } from '../lib/gameEngine'
import { saveGameRun, type NewGameRun } from '../lib/gameRuns'

type Round = { id: string; listId: string; listName: string; people: GameEmployee[]; tiles: MatchTile[]; options: string[][]; started: number; limit: number }
type Feedback = { text: string; tone: 'correct' | 'wrong' | ''; tiles: string[] }
const PRESETS = [{ label: 'Разминка', size: 4, limit: 60 }, { label: 'Обычный', size: 6, limit: 120 }, { label: 'Марафон', size: 8, limit: 180 }]

export default function GameScreen({ mode }: { mode: GameMode }) {
  const { list, loading, error } = useEmployees()
  const { active, loading: listsLoading, error: listsError } = useLists()
  const [size, setSize] = useState(6)
  const [limit, setLimit] = useState(120)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [phase, setPhase] = useState<'ready' | 'play' | 'done' | 'timeout'>('ready')
  const [round, setRound] = useState<Round | null>(null)
  const [left, setLeft] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)
  const [matchedNames, setMatchedNames] = useState<string[]>([])
  const [matchedRoles, setMatchedRoles] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ text: '', tone: '', tiles: [] })
  const [busy, setBusy] = useState(false)
  const [correctOption, setCorrectOption] = useState<string | null>(null)
  const [failedOptions, setFailedOptions] = useState<string[]>([])
  const [result, setResult] = useState<NewGameRun | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving')
  const [revision, setRevision] = useState(0)
  const page = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const inputLock = useRef(false)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timing = useRef<{ pausedAt: number | null; pausedTotal: number; pauseDuration: number }>({ pausedAt: null, pausedTotal: 0, pauseDuration: 0 })
  const available = list.filter(person => person.full_name.trim() && person.job_title.trim())
  const count = Math.min(size, available.length)
  const enoughRoles = mode !== 'quiz' || new Set(available.map(person => normalizeRole(person.job_title))).size >= 2
  const title = mode === 'match' ? 'Найди пару' : 'Быстрый ответ'

  useLayoutEffect(() => { page.current?.closest('.app-content')?.scrollTo(0, 0) }, [phase])

  // Mandatory feedback pauses do not add time to a player's result.
  const elapsedTime = useCallback((started: number) => {
    const { pausedAt, pausedTotal, pauseDuration } = timing.current
    const now = performance.now()
    // A throttled background callback cannot pause the clock indefinitely.
    const pendingPause = pausedAt === null ? 0 : Math.min(now - pausedAt, pauseDuration)
    return Math.max(0, now - started - pausedTotal - pendingPause)
  }, [])
  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current) }, [])
  useEffect(() => {
    if (phase !== 'play' || !round) return
    const tick = () => {
      if (finished.current) return
      const value = elapsedTime(round.started)
      setElapsed(value)
      if (scoreTime(value, mistakes) >= round.limit * 1000) {
        finished.current = true
        setPhase('timeout')
      }
    }
    const timer = setInterval(tick, 100)
    return () => clearInterval(timer)
  }, [phase, round, mistakes, elapsedTime])

  function start() {
    if (!active || count < 2 || !enoughRoles) return
    if (lockTimer.current) clearTimeout(lockTimer.current)
    const people = makeRound(available, count)
    setRound({ id: crypto.randomUUID(), listId: active.id, listName: active.name, people, tiles: makeMatchTiles(people), options: people.map(person => quizOptions(person, available)), started: performance.now(), limit })
    finished.current = false; inputLock.current = false; timing.current = { pausedAt: null, pausedTotal: 0, pauseDuration: 0 }
    setMatchedNames([]); setMatchedRoles([]); setLeft(null); setRight(null); setFailedOptions([]); setCorrectOption(null); setBusy(false)
    setMistakes(0); setElapsed(0); setFeedback({ text: '', tone: '', tiles: [] }); setResult(null); setPhase('play')
  }
  async function persist(run: NewGameRun) {
    setSaveState('saving')
    try { await saveGameRun(run); setSaveState('saved'); setRevision(value => value + 1) }
    catch { setSaveState('error') }
  }
  function finish(nextMistakes: number, duration: number) {
    if (!round || finished.current) return false
    finished.current = true
    setElapsed(duration)
    if (scoreTime(duration, nextMistakes) >= round.limit * 1000) { setPhase('timeout'); return false }
    const run: NewGameRun = { id: round.id, list_id: round.listId, mode, item_count: round.people.length, elapsed_ms: Math.round(duration), mistakes: nextMistakes, time_limit_s: round.limit }
    // Latch and save the final answer before the visual pause. A suspended
    // background tab must not turn an already completed round into a timeout.
    setResult(run); void persist(run)
    return true
  }
  function canAnswer() {
    if (!round || phase !== 'play' || finished.current || inputLock.current) return false
    // Event-time check also handles a background tab whose interval was throttled.
    if (scoreTime(elapsedTime(round.started), mistakes) >= round.limit * 1000) { finished.current = true; setPhase('timeout'); return false }
    return true
  }
  function showFeedback(value: Feedback, after?: () => void, completed = false) {
    inputLock.current = true; setBusy(true); setFeedback(value)
    const pauseDuration = value.tone === 'correct' ? 520 : 420
    // Called by answer event handlers, never during rendering.
    // eslint-disable-next-line react-hooks/purity
    timing.current.pausedAt = performance.now()
    timing.current.pauseDuration = pauseDuration
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => {
      timing.current.pausedTotal += Math.min(performance.now() - timing.current.pausedAt!, pauseDuration)
      timing.current.pausedAt = null
      if (!finished.current || completed) after?.()
      inputLock.current = false; setBusy(false)
      setFeedback(previous => ({ ...previous, tiles: [] }))
    }, pauseDuration)
  }
  function compare(nameId: string, roleId: string) {
    if (!round || !canAnswer() || matchedNames.includes(nameId) || matchedRoles.includes(roleId)) return
    const person = round.people.find(value => value.id === nameId)!
    const role = round.people.find(value => value.id === roleId)!
    const duration = elapsedTime(round.started)
    setLeft(null); setRight(null)
    if (rolesMatch(person, role)) {
      setMatchedNames(values => [...values, nameId]); setMatchedRoles(values => [...values, roleId])
      const completed = matchedNames.length + 1 === round.people.length && finish(mistakes, duration)
      showFeedback({ text: 'Верно! Пара найдена.', tone: 'correct', tiles: [`name-${nameId}`, `role-${roleId}`] }, () => {
        if (completed) setPhase('done')
      }, completed)
    } else {
      setMistakes(value => value + 1)
      showFeedback({ text: 'Эта пара не подходит. +3 секунды. Попробуйте ещё раз.', tone: 'wrong', tiles: [`name-${nameId}`, `role-${roleId}`] })
    }
  }
  function chooseOption(value: string) {
    if (!round || !canAnswer() || failedOptions.includes(value)) return
    const person = round.people[matchedNames.length]
    const duration = elapsedTime(round.started)
    if (normalizeRole(value) === normalizeRole(person.job_title)) {
      setCorrectOption(value)
      const completed = matchedNames.length + 1 === round.people.length && finish(mistakes, duration)
      showFeedback({ text: 'Правильно!', tone: 'correct', tiles: [] }, () => {
        setMatchedNames(values => [...values, person.id]); setFailedOptions([]); setCorrectOption(null)
        if (completed) setPhase('done')
        else setFeedback({ text: 'Следующий сотрудник. Выберите его должность.', tone: '', tiles: [] })
      }, completed)
    } else {
      setMistakes(count => count + 1); setFailedOptions(values => [...values, value])
      showFeedback({ text: 'Другая должность. +3 секунды. Попробуйте снова.', tone: 'wrong', tiles: [value] })
    }
  }

  return <div ref={page} className={`container library-page game-page game-density--${density}${phase === 'play' ? ' game-playing' : ''}`}>
    <AppHeader title={title} back />
    {(error || listsError) && <p className="card answer-wrong" role="alert">{error || listsError}</p>}
    {phase === 'ready' && <>
      <section className="game-ready">
        <GameArtwork mode={mode} />
        <h1>Готовы?</h1><p>{mode === 'match' ? 'Имена и должности перемешаны на одном поле. Выберите имя и его должность в любом порядке.' : 'Выберите правильную должность для каждого сотрудника. Пройдите все вопросы как можно быстрее.'}</p>
        <p className="muted small">За ошибку +3 секунды. Время на подсветку ответов не учитывается. Завершённый раунд сохранится в личных результатах.</p>
        <div className="current-module"><Icon name="library" /><span>{active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
        <div className="game-presets" role="group" aria-label="Готовые настройки раунда">{PRESETS.map(preset => <button key={preset.label} className={'btn' + (size === preset.size && limit === preset.limit ? ' is-selected' : '')} aria-pressed={size === preset.size && limit === preset.limit} onClick={() => { setSize(preset.size); setLimit(preset.limit) }}>{preset.label}<small>{preset.size} заданий · {preset.limit / 60} мин</small></button>)}</div>
        <div className="game-settings">
          <label>Заданий<select className="input" value={size} onChange={e => setSize(Number(e.target.value))}>{[2, 3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Лимит времени<select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))}><option value={60}>1 минута</option><option value={120}>2 минуты</option><option value={180}>3 минуты</option></select></label>
          <label className="game-settings__wide">Размер карточек<select className="input" value={density} onChange={e => setDensity(e.target.value as 'comfortable' | 'compact')}><option value="comfortable">Обычные — текст крупнее</option><option value="compact">Компактные — больше на экране</option></select></label>
        </div>
        {loading || listsLoading ? <p role="status">Загружаю сотрудников…</p> : count < 2 || !enoughRoles ? <p className="card">{count < 2 ? 'Добавьте хотя бы двух сотрудников в этот список.' : 'Для этой игры нужны хотя бы две разные должности.'} <Link to="/employees">Открыть список</Link></p> : <p className="muted small game-ready__count">В этом раунде: {count} {mode === 'match' ? count < 5 ? 'пары' : 'пар' : count < 5 ? 'задания' : 'заданий'}{mode === 'match' ? ` · ${count * 2} карточек` : ''}.</p>}
        <button className="btn btn--primary btn--block btn--lg" disabled={loading || listsLoading || !active || count < 2 || !enoughRoles} onClick={start}>Начать игру</button>
      </section>
      {active && count >= 2 && <GameLeaderboard listId={active.id} mode={mode} count={count} timeLimit={limit} revision={revision} />}
    </>}
    {phase === 'play' && round && <>
      <div className="game-status"><div><Icon name="clock" /><strong aria-label="Время с учётом штрафов">{formatTime(scoreTime(elapsed, mistakes))}</strong><small>из {round.limit} с</small></div><div><strong>{matchedNames.length} / {round.people.length}</strong><small>{mode === 'match' ? 'пар' : 'заданий'}</small></div><div><strong>{mistakes}</strong><small>ошибок</small></div></div>
      <div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${matchedNames.length / round.people.length * 100}%` }} /></div>
      <p className="small muted center game-list-name">{round.listName}</p>
      {mode === 'match' ? <>
        <p className="game-board-hint">Выберите <strong>имя</strong> и <strong>должность</strong>. Карточки можно нажимать в любом порядке.</p>
        <div className="match-board" aria-label="Имена и должности">{round.tiles.map(tile => {
          const { employee, kind, key } = tile
          const matched = (kind === 'name' ? matchedNames : matchedRoles).includes(employee.id)
          const selected = (kind === 'name' ? left : right) === employee.id
          const wrong = feedback.tone === 'wrong' && feedback.tiles.includes(key)
          return <button key={key} data-kind={kind} data-employee-id={employee.id} className={`match-cell match-cell--${kind}${selected ? ' is-selected' : ''}${matched ? ' is-matched' : ''}${wrong ? ' is-wrong' : ''}`} disabled={matched || busy} aria-pressed={selected} onClick={() => {
            if (!canAnswer()) return
            if (kind === 'name') { if (right) compare(employee.id, right); else setLeft(left === employee.id ? null : employee.id) }
            else { if (left) compare(left, employee.id); else setRight(right === employee.id ? null : employee.id) }
          }}><span className="match-cell__kind">{kind === 'name' ? 'Сотрудник' : 'Должность'}</span><span className="match-cell__text">{kind === 'name' ? employee.full_name : employee.job_title}</span>{matched && <Icon name="check" />}</button>
        })}</div>
      </> : matchedNames.length < round.people.length && <section className="quiz-board"><p className="eyebrow">КАКУЮ ДОЛЖНОСТЬ ЗАНИМАЕТ</p><h2>{round.people[matchedNames.length].full_name}</h2><div className="quiz-options">{round.options[matchedNames.length].map(value => <button key={`${matchedNames.length}-${value}`} className={`match-cell${failedOptions.includes(value) ? ' is-wrong' : ''}${correctOption === value ? ' is-correct' : ''}`} disabled={busy || failedOptions.includes(value)} onClick={() => chooseOption(value)}><span>{value}</span>{correctOption === value && <Icon name="check" />}</button>)}</div></section>}
      <p className={`game-feedback${feedback.tone ? ` is-${feedback.tone}` : ''}`} role="status">{feedback.text || 'Выберите подходящий ответ.'}</p>
      <button className="btn btn--ghost btn--block" disabled={busy} onClick={() => { if (window.confirm('Завершить раунд? Незаконченный результат не сохранится.')) { finished.current = true; if (lockTimer.current) clearTimeout(lockTimer.current); setPhase('ready') } }}>Завершить раунд</button>
    </>}
    {(phase === 'done' || phase === 'timeout') && round && <>
      <section className="game-result"><div className="game-result__icon"><Icon name={phase === 'done' ? 'check' : 'clock'} /></div><h1>{phase === 'done' ? 'Отличный раунд!' : 'Время вышло'}</h1>
        <p>{round.listName} · {matchedNames.length} из {round.people.length} {mode === 'match' ? 'пар' : 'заданий'}</p>
        <strong className="game-result__time">{formatTime(scoreTime(elapsed, mistakes))}</strong><p className="muted">{formatTime(elapsed)} на ответы + {mistakes * 3} с за ошибки</p>
        {phase === 'done' && <p role="status">{saveState === 'saving' ? 'Сохраняю личный результат…' : saveState === 'saved' ? 'Результат сохранён в вашем аккаунте.' : 'Результат пока не сохранён. Проверьте соединение.'}</p>}
        {phase === 'done' && saveState === 'error' && result && <button className="btn btn--primary" onClick={() => void persist(result)}>Повторить сохранение</button>}
        {phase === 'timeout' && <p className="muted small">Этот раунд не попал в рекорды. Попробуйте меньше заданий или больше времени.</p>}
        <div className="stack"><button className="btn btn--primary btn--block" disabled={phase === 'done' && saveState !== 'saved'} onClick={() => setPhase('ready')}>Ещё раз</button><Link to="/games" className="btn btn--ghost">Все игры</Link></div>
      </section>
      <GameLeaderboard listId={round.listId} mode={mode} count={round.people.length} timeLimit={round.limit} revision={revision} />
    </>}
  </div>
}
