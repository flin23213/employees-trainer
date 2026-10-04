import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GameLeaderboard from '../components/GameLeaderboard'
import GameArtwork from '../components/GameArtwork'
import SessionOutcome from '../components/SessionOutcome'
import TrainingScope from '../components/TrainingScope'
import Icon from '../components/Icon'
import { useLists } from '../lib/lists'
import { useEmployees } from '../lib/employees'
import { GAME_META, formatTime, makeRound, makeMatchTiles, makeStatements, normalizeRole, quizOptions, rolesMatch, scoreTime, type MatchTile, type GameEmployee, type GameMode, type GameStatement } from '../lib/gameEngine'
import { gameSetting, MIN_GAME_ITEMS, MAX_GAME_ITEMS, MIN_GAME_SECONDS, MAX_GAME_SECONDS } from '../lib/gameSettings'
import { saveGameRun, type NewGameRun } from '../lib/gameRuns'
import { ALL_TRAINING_EMPLOYEES, filterTrainingEmployees, gameTrainingScopeKey, hasTrainingFilter, scopeForList, trainingDepartments, trainingPoolSignature, type ListTrainingScope } from '../lib/trainingScope'

type Round = { id: string; listId: string; listName: string; scopeKey: string; scopeLabel: string; scopePeople: string[]; people: GameEmployee[]; tiles: MatchTile[]; options: string[][]; statements: GameStatement[]; started: number; limit: number }
type Feedback = { text: string; tone: 'correct' | 'wrong' | ''; tiles: string[] }
const PRESETS = [{ label: 'Разминка', size: 4, limit: 60 }, { label: 'Обычный', size: 6, limit: 120 }, { label: 'Марафон', size: 8, limit: 180 }]

export default function GameScreen({ mode }: { mode: GameMode }) {
  const { list, loading, error } = useEmployees()
  const { active, loading: listsLoading, error: listsError } = useLists()
  const [selection, setSelection] = useState<ListTrainingScope | null>(null)
  const scope = scopeForList(selection, active?.id)
  const fullAvailable = useMemo(() => list.filter(person => person.full_name.trim() && person.job_title.trim()), [list])
  const selectedPool = useMemo(() => filterTrainingEmployees(list, scope), [list, scope])
  const available = useMemo(() => filterTrainingEmployees(fullAvailable, scope), [fullAvailable, scope])
  const scopeSignature = `${active?.id ?? ''}:${trainingPoolSignature(fullAvailable)}:${trainingPoolSignature(available)}`
  const [fingerprint, setFingerprint] = useState<{ signature: string; key: string | null; error: string } | null>(null)
  const [scopeRetry, setScopeRetry] = useState(0)
  const scopeKey = fingerprint?.signature === scopeSignature ? fingerprint.key : null
  const scopeError = fingerprint?.signature === scopeSignature ? fingerprint.error : ''
  const departmentLabel = trainingDepartments(list).find(department => department.key === scope.department)?.label
  const scopeLabel = scopeKey === 'all' ? 'Весь список' : [departmentLabel ? `Отдел «${departmentLabel}»` : 'Выбранный состав', scope.onlyNew ? 'новые сотрудники' : '', `${available.length} сотрудников`].filter(Boolean).join(' · ')
  const [sizeInput, setSizeInput] = useState('6')
  const [limitInput, setLimitInput] = useState('120')
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
  const [revealed, setRevealed] = useState<string[]>([])
  const [truthChoice, setTruthChoice] = useState<boolean | null>(null)
  const [result, setResult] = useState<NewGameRun | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving')
  const [revision, setRevision] = useState(0)
  const page = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const inputLock = useRef(false)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timing = useRef<{ pausedAt: number | null; pausedTotal: number; pauseDuration: number }>({ pausedAt: null, pausedTotal: 0, pauseDuration: 0 })
  const size = gameSetting(sizeInput, MIN_GAME_ITEMS, MAX_GAME_ITEMS)
  const limit = gameSetting(limitInput, MIN_GAME_SECONDS, MAX_GAME_SECONDS)
  const validSettings = size !== null && limit !== null
  const count = Math.min(size ?? 0, available.length)
  const enoughRoles = !['quiz', 'truth'].includes(mode) || new Set(available.map(person => normalizeRole(person.job_title))).size >= 2
  const { title, description, pairMode } = GAME_META[mode]

  useEffect(() => {
    let alive = true
    gameTrainingScopeKey(fullAvailable, available)
      .then(key => { if (alive) setFingerprint({ signature: scopeSignature, key, error: '' }) })
      .catch(() => { if (alive) setFingerprint({ signature: scopeSignature, key: null, error: 'Не удалось подготовить выбранный состав. Попробуйте ещё раз.' }) })
    return () => { alive = false }
  }, [fullAvailable, available, scopeSignature, scopeRetry])

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
    if (!active || loading || listsLoading || !scopeKey || !validSettings || count < 2 || !enoughRoles) return
    if (lockTimer.current) clearTimeout(lockTimer.current)
    const people = makeRound(available, count)
    setRound({ id: crypto.randomUUID(), listId: active.id, listName: active.name, scopeKey, scopeLabel, scopePeople: available.map(person => person.full_name), people, tiles: makeMatchTiles(people), options: people.map(person => quizOptions(person, available)), statements: makeStatements(people, available), started: performance.now(), limit })
    finished.current = false; inputLock.current = false; timing.current = { pausedAt: null, pausedTotal: 0, pauseDuration: 0 }
    setMatchedNames([]); setMatchedRoles([]); setLeft(null); setRight(null); setFailedOptions([]); setCorrectOption(null); setBusy(false)
    setRevealed([]); setTruthChoice(null)
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
    const run: NewGameRun = { id: round.id, list_id: round.listId, mode, item_count: round.people.length, elapsed_ms: Math.round(duration), mistakes: nextMistakes, time_limit_s: round.limit, scope_key: round.scopeKey }
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
        setRevealed([])
        if (completed) setPhase('done')
      }, completed)
    } else {
      setMistakes(value => value + 1)
      showFeedback({ text: 'Эта пара не подходит. +3 секунды. Попробуйте ещё раз.', tone: 'wrong', tiles: [`name-${nameId}`, `role-${roleId}`] }, () => setRevealed([]))
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

  function answerTruth(answer: boolean) {
    if (!round || !canAnswer()) return
    const statement = round.statements[matchedNames.length]
    if (!statement) return
    const correct = answer === statement.correct
    const nextMistakes = mistakes + (correct ? 0 : 1)
    const duration = elapsedTime(round.started)
    setTruthChoice(answer); setMistakes(nextMistakes)
    const completed = matchedNames.length + 1 === round.people.length && finish(nextMistakes, duration)
    const association = `${statement.person.full_name} — ${statement.person.job_title}.`
    showFeedback({ text: `${correct ? 'Правильно!' : 'Неверно. +3 секунды.'} ${association}`, tone: correct ? 'correct' : 'wrong', tiles: [] }, () => {
      setMatchedNames(values => [...values, statement.person.id]); setTruthChoice(null)
      if (completed) setPhase('done')
    }, completed)
  }

  function revealTile(tile: MatchTile) {
    if (!round || !canAnswer() || revealed.includes(tile.key)) return
    if ((tile.kind === 'name' ? matchedNames : matchedRoles).includes(tile.employee.id)) return
    if (revealed.length === 0) { setRevealed([tile.key]); return }
    const first = round.tiles.find(value => value.key === revealed[0])!
    setRevealed([first.key, tile.key])
    if (first.kind !== tile.kind) {
      compare(first.kind === 'name' ? first.employee.id : tile.employee.id, first.kind === 'role' ? first.employee.id : tile.employee.id)
    } else {
      setMistakes(value => value + 1)
      showFeedback({ text: 'Нужны имя и должность. +3 секунды. Запомните карточки и попробуйте ещё раз.', tone: 'wrong', tiles: [first.key, tile.key] }, () => setRevealed([]))
    }
  }

  return <div ref={page} className={`container library-page game-page game-density--${density}${phase === 'play' ? ' game-playing' : ''}`}>
    <AppHeader title={title} back />
    {(error || listsError) && <p className="card answer-wrong" role="alert">{error || listsError}</p>}
    {phase === 'ready' && <>
      <section className="game-ready">
        <GameArtwork mode={mode} />
        <h1>Готовы?</h1><p>{description}</p>
        {mode === 'truth' && <p className="muted small">Один ответ на утверждение. После ответа покажем настоящую должность сотрудника.</p>}
        <p className="muted small">За ошибку +3 секунды. Время на подсветку ответов не учитывается. Завершённый раунд сохранится в личных результатах.</p>
        <div className="current-module"><Icon name="library" /><span>{active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
        <TrainingScope key={active?.id} employees={list} value={scope} disabled={loading || listsLoading || !active} onChange={value => { if (active) setSelection({ listId: active.id, value }) }} />
        <div className="game-presets" role="group" aria-label="Готовые настройки раунда">{PRESETS.map(preset => <button key={preset.label} className={'btn' + (size === preset.size && limit === preset.limit ? ' is-selected' : '')} aria-pressed={size === preset.size && limit === preset.limit} onClick={() => { setSizeInput(String(preset.size)); setLimitInput(String(preset.limit)) }}>{preset.label}<small>{preset.size} заданий · {preset.limit / 60} мин</small></button>)}</div>
        <div className="game-settings">
          <label>Заданий<input className="input" type="number" inputMode="numeric" min={MIN_GAME_ITEMS} max={MAX_GAME_ITEMS} step={1} value={sizeInput} aria-invalid={size === null} aria-describedby="game-size-help" onChange={e => setSizeInput(e.target.value)} /><small id="game-size-help">От {MIN_GAME_ITEMS} до {MAX_GAME_ITEMS}{pairMode ? ' пар' : ' заданий'}</small></label>
          <label>Лимит времени, с<input className="input" type="number" inputMode="numeric" min={MIN_GAME_SECONDS} max={MAX_GAME_SECONDS} step={1} value={limitInput} aria-invalid={limit === null} aria-describedby="game-limit-help" onChange={e => setLimitInput(e.target.value)} /><small id="game-limit-help">Любое число от 1 до 300 секунд</small></label>
          <label className="game-settings__wide">Размер карточек<select className="input" value={density} onChange={e => setDensity(e.target.value as 'comfortable' | 'compact')}><option value="comfortable">Обычные — текст крупнее</option><option value="compact">Компактные — больше на экране</option></select></label>
        </div>
        {loading || listsLoading ? <p role="status">Загружаю сотрудников…</p> : !validSettings ? <p className="game-ready__count answer-wrong" role="status">Укажите целое количество от 2 до 8 и время от 1 до 300 секунд.</p> : count < 2 || !enoughRoles ? <div className="card training-scope__alert" role="status"><p>{count < 2 ? hasTrainingFilter(scope) ? 'В выбранном составе нужны хотя бы два сотрудника с именем и должностью.' : 'Добавьте хотя бы двух сотрудников с именем и должностью в этот список.' : 'Для этой игры в выбранном составе нужны хотя бы две разные должности.'}</p>{hasTrainingFilter(scope) ? <button type="button" className="btn btn--ghost" onClick={() => { if (active) setSelection({ listId: active.id, value: ALL_TRAINING_EMPLOYEES }) }}>Сбросить выбор сотрудников</button> : <Link to="/employees">Открыть список</Link>}</div> : <p className="muted small game-ready__count">В этом раунде: {count} {pairMode ? count < 5 ? 'пары' : 'пар' : count < 5 ? 'задания' : 'заданий'}{pairMode ? ` · ${count * 2} карточек` : ''} · {limit} с.</p>}
        {selectedPool.length > available.length && <p className="muted small">{selectedPool.length - available.length} сотрудников без имени или должности не участвуют в играх.</p>}
        {!loading && !listsLoading && count >= 2 && (scopeError ? <div className="training-scope__alert"><p className="answer-wrong" role="alert">{scopeError}</p><button type="button" className="btn btn--ghost" onClick={() => setScopeRetry(value => value + 1)}>Повторить подготовку состава</button></div> : !scopeKey && <p className="small muted" role="status">Подготавливаю выбранный состав…</p>)}
        <button className="btn btn--primary btn--block btn--lg" disabled={loading || listsLoading || !active || !scopeKey || !validSettings || count < 2 || !enoughRoles} onClick={start}>Начать игру</button>
      </section>
      {active && count >= 2 && limit !== null && scopeKey && <GameLeaderboard listId={active.id} mode={mode} count={count} timeLimit={limit} scopeKey={scopeKey} scopeLabel={scopeLabel} revision={revision} />}
    </>}
    {phase === 'play' && round && <>
      <div className="game-status"><div><Icon name="clock" /><strong aria-label="Время с учётом штрафов">{formatTime(scoreTime(elapsed, mistakes))}</strong><small>из {round.limit} с</small></div><div><strong>{matchedNames.length} / {round.people.length}</strong><small>{pairMode ? 'пар' : 'заданий'}</small></div><div><strong>{mistakes}</strong><small>ошибок</small></div></div>
      <div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${matchedNames.length / round.people.length * 100}%` }} /></div>
      <p className="small muted center game-list-name">{round.listName}{round.scopeKey !== 'all' ? ` · ${round.scopeLabel}` : ''}</p>
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
      </> : mode === 'memory' ? <>
        <p className="game-board-hint">Откройте две карточки: <strong>имя</strong> и <strong>должность</strong>. Запоминайте, где они находятся.</p>
        <div className="match-board memory-board" aria-label="Закрытые имена и должности">{round.tiles.map((tile, index) => {
          const { employee, kind, key } = tile
          const matched = (kind === 'name' ? matchedNames : matchedRoles).includes(employee.id)
          const open = matched || revealed.includes(key)
          const wrong = feedback.tone === 'wrong' && feedback.tiles.includes(key)
          return <button key={key} data-kind={kind} data-employee-id={employee.id} className={`match-cell memory-cell match-cell--${kind}${open ? ' is-flipped' : ''}${matched ? ' is-matched' : ''}${wrong ? ' is-wrong' : ''}`} disabled={matched || busy} aria-pressed={open} aria-label={open ? `${kind === 'name' ? 'Сотрудник' : 'Должность'}: ${kind === 'name' ? employee.full_name : employee.job_title}` : `Открыть карточку ${index + 1}: ${kind === 'name' ? 'сотрудник' : 'должность'}`} onClick={() => revealTile(tile)}><span className="match-cell__kind">{kind === 'name' ? 'Сотрудник' : 'Должность'}</span>{open ? <span className="match-cell__text">{kind === 'name' ? employee.full_name : employee.job_title}</span> : <span className="memory-cell__back"><Icon name="cards" /><span>{index + 1}</span></span>}{matched && <Icon name="check" />}</button>
        })}</div>
      </> : mode === 'truth' && matchedNames.length < round.people.length ? <section className="quiz-board truth-board"><p className="eyebrow">ВЕРНА ЛИ ЭТА ПАРА?</p><h2 className="truth-person">{round.statements[matchedNames.length].person.full_name}</h2><div className="truth-role"><Icon name="briefcase" /><span>{round.statements[matchedNames.length].role}</span></div><div className="truth-options">{[true, false].map(value => <button key={String(value)} className={`match-cell${truthChoice === value ? feedback.tone === 'correct' ? ' is-correct' : ' is-wrong' : ''}`} disabled={busy} aria-pressed={truthChoice === value} onClick={() => answerTruth(value)}><Icon name={value ? 'check' : 'close'} /><span>{value ? 'Верно' : 'Неверно'}</span></button>)}</div></section> : mode === 'quiz' && matchedNames.length < round.people.length && <section className="quiz-board"><p className="eyebrow">КАКУЮ ДОЛЖНОСТЬ ЗАНИМАЕТ</p><h2>{round.people[matchedNames.length].full_name}</h2><div className="quiz-options">{round.options[matchedNames.length].map(value => <button key={`${matchedNames.length}-${value}`} className={`match-cell${failedOptions.includes(value) ? ' is-wrong' : ''}${correctOption === value ? ' is-correct' : ''}`} disabled={busy || failedOptions.includes(value)} onClick={() => chooseOption(value)}><span>{value}</span>{correctOption === value && <Icon name="check" />}</button>)}</div></section>}
      <p className={`game-feedback${feedback.tone ? ` is-${feedback.tone}` : ''}`} role="status">{feedback.text || 'Выберите подходящий ответ.'}</p>
      <button className="btn btn--ghost btn--block" disabled={busy} onClick={() => { if (window.confirm('Завершить раунд? Незаконченный результат не сохранится.')) { finished.current = true; if (lockTimer.current) clearTimeout(lockTimer.current); setPhase('ready') } }}>Завершить раунд</button>
    </>}
    {(phase === 'done' || phase === 'timeout') && round && <>
      <SessionOutcome className="game-result" tone={phase === 'timeout' ? 'timeout' : mistakes ? 'practice' : 'complete'} eyebrow={phase === 'timeout' ? 'ПОПРОБУЕМ В ДРУГОМ ТЕМПЕ' : 'ЛИЧНЫЙ РЕЗУЛЬТАТ'} title={phase === 'done' ? 'Раунд завершён' : 'Время вышло'} description={round.listName} metrics={[
        { label: pairMode ? 'Пары' : 'Задания', value: `${matchedNames.length} / ${round.people.length}`, note: pairMode ? 'найдено' : 'пройдено' },
        { label: 'Ошибки', value: mistakes },
        { label: 'Штраф', value: `${mistakes * 3} с`, note: 'включён во время' },
      ]}>
        {round.scopeKey !== 'all' && <details className="training-scope__composition"><summary>{round.scopeLabel}</summary><p>{round.scopePeople.join(', ')}</p></details>}
        <strong className="game-result__time">{formatTime(scoreTime(elapsed, mistakes))}</strong><p className="muted">{formatTime(elapsed)} на ответы + {mistakes * 3} с за ошибки</p>
        {phase === 'done' && <p className="session-outcome__status" role={saveState === 'error' ? 'alert' : 'status'}>{saveState === 'saving' ? 'Сохраняю личный результат…' : saveState === 'saved' ? 'Результат сохранён в вашем аккаунте.' : 'Результат пока не сохранён. Проверьте соединение.'}</p>}
        {phase === 'done' && saveState === 'error' && result && <button className="btn btn--primary" onClick={() => void persist(result)}>Повторить сохранение</button>}
        {phase === 'timeout' && <p className="session-outcome__note">Этот раунд не попал в рекорды. Уменьшите число заданий или увеличьте время перед следующим стартом.</p>}
        <div className="stack"><button className="btn btn--primary btn--block" disabled={phase === 'done' && saveState !== 'saved'} onClick={() => setPhase('ready')}>Ещё раз</button><Link to="/games" className="btn btn--ghost">Все игры</Link></div>
      </SessionOutcome>
      <GameLeaderboard listId={round.listId} mode={mode} count={round.people.length} timeLimit={round.limit} scopeKey={round.scopeKey} scopeLabel={round.scopeLabel} revision={revision} />
    </>}
  </div>
}
