// Путь: src/components/ActivityChart.tsx
// График занятий по дням: столбик = сколько ответов вы дали в этот день.

import { useMemo, useState } from 'react'
import { getLastDays, getStreak, getSummary } from '../lib/activity'

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export default function ActivityChart({ days }: { days: number }) {
  // useMemo, чтобы не перечитывать хранилище на каждую перерисовку
  const list = useMemo(() => getLastDays(days), [days])
  const streak = useMemo(() => getStreak(), [])
  const summary = useMemo(() => getSummary(days), [days])

  const [picked, setPicked] = useState<string | null>(null)
  const max = Math.max(1, ...list.map((d) => d.answers))
  const chosen = list.find((d) => d.key === picked) ?? null

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 4 }}>
        <strong>Занятия по дням</strong>
        <div className="spacer" />
        {streak > 0 && (
          <span className="flame">
            🔥 {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд
          </span>
        )}
      </div>

      <p className="muted small" style={{ marginBottom: 14 }}>
        {summary.answers === 0
          ? 'Пока пусто. После первого занятия здесь появятся столбики.'
          : `За ${days} дней: ${summary.answers} ответов, занимались ${summary.activeDays} ${summary.activeDays === 1 ? 'день' : 'дн.'}`}
      </p>

      <div className="chart">
        {list.map((d, i) => {
          const height = d.answers === 0 ? 4 : Math.max(10, Math.round((d.answers / max) * 100))
          const accuracy = d.answers === 0 ? 0 : Math.round((d.correct / d.answers) * 100)
          return (
            <button
              key={d.key}
              type="button"
              className={
                'chart__col' +
                (d.isToday ? ' is-today' : '') +
                (picked === d.key ? ' is-picked' : '')
              }
              onClick={() => setPicked(picked === d.key ? null : d.key)}
              aria-label={`${d.date.toLocaleDateString('ru-RU')}: ${d.answers} ответов, точность ${accuracy}%`}
            >
              <span className="chart__value">{d.answers > 0 ? d.answers : ''}</span>
              <span
                className={'chart__bar' + (d.answers === 0 ? ' is-empty' : '')}
                style={{ height: `${height}%`, animationDelay: `${i * 0.03}s` }}
              />
              <span className="chart__day">{WEEKDAYS[d.date.getDay()]}</span>
            </button>
          )
        })}
      </div>

      {/* Подпись под графиком меняется при нажатии на столбик */}
      <p className="chart__caption small">
        {chosen
          ? chosen.answers === 0
            ? `${chosen.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: занятий не было`
            : `${chosen.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: ${chosen.answers} ответов, верно ${chosen.correct} (${Math.round((chosen.correct / chosen.answers) * 100)}%)`
          : 'Нажмите на столбик, чтобы посмотреть день подробнее.'}
      </p>
    </div>
  )
}
