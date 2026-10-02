import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { activityHistoryStore } from '../lib/activityHistory'
import type { WeeklyHistory } from '../lib/activityHistory'
import Icon from './Icon'
import '../styles/history.css'

function period(history: WeeklyHistory): string {
  const format = (date: Date) => date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${format(history.current.days[0].date)} — ${format(history.current.days[6].date)}`
}
function answerComparison(delta: number): string {
  if (!delta) return 'Столько же ответов, сколько за предыдущие 7 дней.'
  const count = Math.abs(delta)
  const last = count % 10
  const lastTwo = count % 100
  const word = last === 1 && lastTwo !== 11 ? 'ответ' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'ответа' : 'ответов'
  return `На ${count} ${word} ${delta > 0 ? 'больше' : 'меньше'}, чем за предыдущие 7 дней.`
}
function signed(value: number): string { return value > 0 ? `+${value}` : String(value) }

export default function WeeklySummary() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const snapshot = useSyncExternalStore(activityHistoryStore.subscribe, activityHistoryStore.getSnapshot, activityHistoryStore.getSnapshot)
  const headingId = useId()
  const [picked, setPicked] = useState<string | null>(null)
  // Do not render another account's data while the account effect is pending.
  const data = snapshot.userId === userId && snapshot.status === 'ready' ? snapshot.data : null
  const error = snapshot.userId === userId && snapshot.status === 'error' ? snapshot.error : null
  useEffect(() => {
    activityHistoryStore.setUser(userId)
    void activityHistoryStore.ensureLoaded()
    const onVisible = () => { if (document.visibilityState === 'visible') void activityHistoryStore.reload() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => { void activityHistoryStore.ensureLoaded() }, 60000)
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(timer) }
  }, [userId])
  const chosen = data?.current.days.find(day => day.key === picked)
  const maximum = Math.max(1, ...(data?.current.days.map(day => day.answers) ?? []))
  return <section className="weekly-history" aria-labelledby={headingId}>
    <div className="weekly-history__heading"><Icon name="chart" /><h2 id={headingId}>Итог за 7 дней</h2></div>
    <p className="weekly-history__scope">По всей библиотеке · история доступна на всех устройствах</p>
    {!userId && <p className="weekly-history__message">Войдите в аккаунт, чтобы увидеть историю занятий.</p>}
    {userId && !data && !error && <p className="weekly-history__message" role="status">Загружаю историю занятий…</p>}
    {error && <div className="weekly-history__error" role="alert"><p>{error}</p><button type="button" className="btn btn--ghost btn--sm" onClick={() => void activityHistoryStore.reload()}>Повторить загрузку истории</button></div>}
    {data && <>
      <p className="weekly-history__period">{period(data)}</p>
      <dl className="weekly-history__metrics">
        <div><dt>Ответов</dt><dd>{data.current.answers}</dd></div>
        <div><dt>Точность</dt><dd>{data.current.accuracy === null ? '—' : `${data.current.accuracy}%`}</dd></div>
        <div><dt>Активных дней</dt><dd>{data.current.activeDays}<small> / 7</small></dd></div>
      </dl>
      {data.current.answers === 0 && <p className="weekly-history__empty">За последние 7 дней занятий ещё не было. Сохранённые ответы появятся здесь после занятия.</p>}
      {(data.current.answers > 0 || data.previous.answers > 0) && <p className="weekly-history__comparison">{answerComparison(data.comparison.answers)}<span>{data.comparison.accuracy !== null && <>Точность {signed(data.comparison.accuracy)} п.п. · </>}Активных дней {signed(data.comparison.activeDays)}</span></p>}
      <details className="weekly-history__details">
        <summary><span>Занятия по дням</span><Icon name="chevron" /></summary>
        <div className="weekly-history__chart" role="group" aria-label="Ответы по дням за последние 7 дней">
          {data.current.days.map(day => <button key={day.key} type="button" className={`weekly-history__day${day.isToday ? ' is-today' : ''}${picked === day.key ? ' is-picked' : ''}`}
            aria-pressed={picked === day.key} aria-label={`${day.date.toLocaleDateString('ru-RU')}: ответов ${day.answers}, верно ${day.correct}`}
            onClick={() => setPicked(picked === day.key ? null : day.key)}>
            <span className="weekly-history__count">{day.answers}</span>
            <span className="weekly-history__bar-area"><span className={`weekly-history__bar${day.answers === 0 ? ' is-empty' : ''}`} style={{ height: `${Math.max(4, day.answers / maximum * 100)}%` }} /></span>
            <span className="weekly-history__weekday">{day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
            <span className="weekly-history__date">{day.date.getDate()}</span>
          </button>)}
        </div>
        <p className="weekly-history__caption" aria-live="polite">{chosen ? `${chosen.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: ответов — ${chosen.answers}, верно ${chosen.correct}${chosen.answers ? ` (${Math.round(chosen.correct / chosen.answers * 100)}%)` : ''}.` : 'Нажмите на день, чтобы посмотреть результат.'}</p>
        <p className="weekly-history__previous">Предыдущие 7 дней: ответов — {data.previous.answers}, точность — {data.previous.accuracy === null ? '—' : `${data.previous.accuracy}%`}, активных дней — {data.previous.activeDays} / 7.</p>
      </details>
    </>}
  </section>
}
