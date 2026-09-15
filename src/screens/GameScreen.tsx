import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GameLeaderboard from '../components/GameLeaderboard'
import Icon from '../components/Icon'
import { useLists } from '../lib/lists'
import { useEmployees } from '../lib/employees'
import { formatTime, makeRound, normalizeRole, quizOptions, rolesMatch, scoreTime, shuffle, type GameEmployee, type GameMode } from '../lib/gameEngine'
import { saveGameRun, type NewGameRun } from '../lib/gameRuns'

type Round = { id: string; listId: string; listName: string; people: GameEmployee[]; roles: GameEmployee[]; options: string[][]; started: number; limit: number }

export default function GameScreen({ mode }: { mode: GameMode }) {
  const { list, loading, error } = useEmployees()
  const { active, loading: listsLoading, error: listsError } = useLists()
  const [size, setSize] = useState(6)
  const [limit, setLimit] = useState(120)
  const [phase, setPhase] = useState<'ready' | 'play' | 'done' | 'timeout'>('ready')
  const [round, setRound] = useState<Round | null>(null)
  const [left, setLeft] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)
  const [matchedNames, setMatchedNames] = useState<string[]>([])
  const [matchedRoles, setMatchedRoles] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [failedOptions, setFailedOptions] = useState<string[]>([])
  const [result, setResult] = useState<NewGameRun | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving')
  const [revision, setRevision] = useState(0)
  const finished = useRef(false)
  const inputLock = useRef(false)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const available = list.filter(person => person.full_name.trim() && person.job_title.trim())
  const count = Math.min(size, available.length)
  const enoughRoles = mode !== 'quiz' || new Set(available.map(person => normalizeRole(person.job_title))).size >= 2
  const title = mode === 'match' ? 'Найди пару' : 'Быстрый ответ'

  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current) }, [])
  useEffect(() => {
    if (phase !== 'play' || !round) return
    const tick = () => {
      const value = performance.now() - round.started
      setElapsed(value)
      if (!finished.current && scoreTime(value, mistakes) >= round.limit * 1000) {
        finished.current = true
        setPhase('timeout')
      }
    }
    const timer = setInterval(tick, 100)
    return () => clearInterval(timer)
  }, [phase, round, mistakes])

  function start() {
    if (!active || count < 2 || !enoughRoles) return
    const people = makeRound(available, count)
    setRound({ id: crypto.randomUUID(), listId: active.id, listName: active.name, people, roles: shuffle(people), options: people.map(person => quizOptions(person, available)), started: performance.now(), limit })
    finished.current = false; inputLock.current = false
    setMatchedNames([]); setMatchedRoles([]); setLeft(null); setRight(null); setFailedOptions([])
    setMistakes(0); setElapsed(0); setFeedback(''); setResult(null); setPhase('play')
  }
  async function persist(run: NewGameRun) {
    setSaveState('saving')
    try { await saveGameRun(run); setSaveState('saved'); setRevision(value => value + 1) }
    catch { setSaveState('error') }
  }
  function finish(nextMistakes: number) {
    if (!round || finished.current) return
    finished.current = true
    // Called only by answer event handlers; never during rendering.
    // eslint-disable-next-line react-hooks/purity
    const duration = Math.round(performance.now() - round.started)
    setElapsed(duration)
    if (scoreTime(duration, nextMistakes) >= round.limit * 1000) { setPhase('timeout'); return }
    const run: NewGameRun = { id: round.id, list_id: round.listId, mode, item_count: round.people.length, elapsed_ms: duration, mistakes: nextMistakes, time_limit_s: round.limit }
    setResult(run); setPhase('done'); void persist(run)
  }
  function canAnswer() {
    if (!round || phase !== 'play' || finished.current || inputLock.current) return false
    // Event-time check also handles a background tab whose interval was throttled.
    // eslint-disable-next-line react-hooks/purity
    if (scoreTime(performance.now() - round.started, mistakes) >= round.limit * 1000) { finished.current = true; setPhase('timeout'); return false }
    return true
  }
  function lockBriefly() {
    inputLock.current = true
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => { inputLock.current = false }, 200)
  }
  function compare(nameId: string, roleId: string) {
    if (!round || !canAnswer() || matchedNames.includes(nameId) || matchedRoles.includes(roleId)) return
    const person = round.people.find(value => value.id === nameId)!
    const role = round.roles.find(value => value.id === roleId)!
    setLeft(null); setRight(null); lockBriefly()
    if (rolesMatch(person, role)) {
      setMatchedNames(values => [...values, nameId]); setMatchedRoles(values => [...values, roleId]); setFeedback('Верно! Пара найдена.')
      if (matchedNames.length + 1 === round.people.length) finish(mistakes)
    } else { setMistakes(value => value + 1); setFeedback('Эта пара не подходит. +3 секунды. Попробуйте ещё раз.') }
  }
  function chooseOption(value: string) {
    if (!round || !canAnswer() || failedOptions.includes(value)) return
    const person = round.people[matchedNames.length]
    lockBriefly()
    if (normalizeRole(value) === normalizeRole(person.job_title)) {
      setMatchedNames(values => [...values, person.id]); setFailedOptions([]); setFeedback('Верно! Следующий сотрудник.')
      if (matchedNames.length + 1 === round.people.length) finish(mistakes)
    } else { setMistakes(count => count + 1); setFailedOptions(values => [...values, value]); setFeedback('Другая должность. +3 секунды. Попробуйте снова.') }
  }

  return <div className={'container library-page' + (phase === 'play' ? ' game-playing' : '')}>
    <AppHeader title={title} back />
    {(error || listsError) && <p className="card answer-wrong" role="alert">{error || listsError}</p>}
    {phase === 'ready' && <>
      <section className="game-ready">
        <div className="game-art game-art--match" aria-hidden="true"><i /><i>✓</i><i /><i /><i /><i>✓</i></div>
        <h1>Готовы?</h1><p>{mode === 'match' ? 'Нажмите на имя, затем на должность — или наоборот. Найдите все пары как можно быстрее.' : 'Выберите правильную должность для каждого сотрудника. Пройдите все вопросы как можно быстрее.'}</p>
        <p className="muted small">Ошибка добавляет 3 секунды. Таймер продолжает идти, если переключить вкладку. В рекорды попадают завершённые раунды.</p>
        <div className="current-module"><Icon name="library" /><span>{active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
        <div className="game-settings"><label>Заданий<select className="input" value={size} onChange={e => setSize(Number(e.target.value))}><option value={4}>4</option><option value={6}>6</option><option value={8}>8</option></select></label><label>Лимит времени<select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))}><option value={60}>1 минута</option><option value={120}>2 минуты</option><option value={180}>3 минуты</option></select></label></div>
        {loading || listsLoading ? <p role="status">Загружаю сотрудников…</p> : count < 2 || !enoughRoles ? <p className="card">{count < 2 ? 'Добавьте хотя бы двух сотрудников в этот список.' : 'Для этой игры нужны хотя бы две разные должности.'} <Link to="/employees">Открыть список</Link></p> : <p className="muted small">В этом раунде: {count} заданий.</p>}
        <button className="btn btn--primary btn--block btn--lg" disabled={loading || listsLoading || !active || count < 2 || !enoughRoles} onClick={start}>Начать игру</button>
      </section>
      {active && count >= 2 && <GameLeaderboard listId={active.id} mode={mode} count={count} timeLimit={limit} revision={revision} />}
    </>}
    {phase === 'play' && round && <>
      <div className="game-status"><div><Icon name="clock" /><strong aria-label="Время с учётом штрафов">{formatTime(scoreTime(elapsed, mistakes))}</strong><small>из {round.limit} с</small></div><div><strong>{matchedNames.length} / {round.people.length}</strong><small>заданий</small></div><div><strong>{mistakes}</strong><small>ошибок</small></div></div>
      <div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${matchedNames.length / round.people.length * 100}%` }} /></div>
      <p className="small muted center">{round.listName}</p>
      {mode === 'match' ? <div className="match-board"><section aria-label="Сотрудники"><h2>Сотрудники</h2>{round.people.map(person => <button key={person.id} className={'match-cell' + (left === person.id ? ' is-selected' : '') + (matchedNames.includes(person.id) ? ' is-matched' : '')} disabled={matchedNames.includes(person.id)} aria-pressed={left === person.id} onClick={() => {
        if (!canAnswer()) return
        if (right) compare(person.id, right); else setLeft(left === person.id ? null : person.id)
      }}>{person.full_name}{matchedNames.includes(person.id) && <Icon name="check" />}</button>)}</section>
      <section aria-label="Должности"><h2>Должности</h2>{round.roles.map(role => <button key={role.id} className={'match-cell' + (right === role.id ? ' is-selected' : '') + (matchedRoles.includes(role.id) ? ' is-matched' : '')} disabled={matchedRoles.includes(role.id)} aria-pressed={right === role.id} onClick={() => {
        if (!canAnswer()) return
        if (left) compare(left, role.id); else setRight(right === role.id ? null : role.id)
      }}>{role.job_title}{matchedRoles.includes(role.id) && <Icon name="check" />}</button>)}</section></div> : matchedNames.length < round.people.length && <section className="quiz-board"><p className="eyebrow">КАКУЮ ДОЛЖНОСТЬ ЗАНИМАЕТ</p><h2>{round.people[matchedNames.length].full_name}</h2><div className="quiz-options">{round.options[matchedNames.length].map(value => <button key={value} className={'match-cell' + (failedOptions.includes(value) ? ' is-wrong' : '')} disabled={failedOptions.includes(value)} onClick={() => chooseOption(value)}>{value}</button>)}</div></section>}
      <p className="game-feedback" role="status">{feedback || 'Выберите подходящий ответ.'}</p>
      <button className="btn btn--ghost btn--block" onClick={() => { if (window.confirm('Завершить раунд? Незаконченный результат не сохранится.')) { finished.current = true; setPhase('ready') } }}>Завершить раунд</button>
    </>}
    {(phase === 'done' || phase === 'timeout') && round && <>
      <section className="game-result"><div className="game-result__icon"><Icon name={phase === 'done' ? 'check' : 'clock'} /></div><h1>{phase === 'done' ? 'Отличный раунд!' : 'Время вышло'}</h1>
        <p>{round.listName} · {matchedNames.length} из {round.people.length} заданий</p>
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
