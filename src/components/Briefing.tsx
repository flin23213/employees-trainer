// Путь: src/components/Briefing.tsx
// Экран-брифинг: что это за тренировка, как она проходит и настройки перед началом.
// Используется и карточками, и тестом — поэтому лежит в components, а не в screens.

import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Переключатель из нескольких вариантов (как в настройках iPhone)    */
/* ------------------------------------------------------------------ */

export type SegOption<T> = { value: T; label: string }

type SegProps<T extends string | number> = {
  value: T
  options: SegOption<T>[]
  onChange: (value: T) => void
}

export function Segmented<T extends string | number>({ value, options, onChange }: SegProps<T>) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={'seg__btn' + (o.value === value ? ' is-on' : '')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Тумблер «включено / выключено»                                    */
/* ------------------------------------------------------------------ */

type SwitchProps = {
  on: boolean
  title: string
  hint?: string
  onToggle: () => void
}

export function SwitchRow({ on, title, hint, onToggle }: SwitchProps) {
  return (
    <button type="button" className="switch-row" aria-pressed={on} onClick={onToggle}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="setting__title">{title}</span>
        {hint && <span className="setting__hint" style={{ display: 'block', margin: '2px 0 0' }}>{hint}</span>}
      </span>
      <span className={'switch' + (on ? ' is-on' : '')} aria-hidden="true" />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Сам брифинг                                                       */
/* ------------------------------------------------------------------ */

type Props = {
  emoji: string
  title: string
  what: string
  steps: string[]
  /** Блок настроек: сюда экран передаёт свои переключатели */
  settings?: ReactNode
  startLabel: string
  onStart: () => void
  disabled?: boolean
  /** Например: «В колоде 18 карточек» */
  summary?: string
  children?: ReactNode
}

export default function Briefing({
  emoji, title, what, steps, settings, startLabel, onStart, disabled = false, summary, children,
}: Props) {
  return (
    <div className="stagger">
      <div className="card card--pad-lg brief__head">
        <span className="brief__emoji" aria-hidden="true">{emoji}</span>
        <h2 className="brief__title">{title}</h2>
        <p className="brief__what">{what}</p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section" style={{ margin: '0 0 12px' }}>
          <h3 className="section__title">Как это работает</h3>
        </div>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="steps__num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {settings && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="section" style={{ margin: '0 0 14px' }}>
            <h3 className="section__title">Настройки</h3>
          </div>
          {settings}
        </div>
      )}

      {children}

      <div style={{ marginTop: 18 }}>
        {summary && <p className="muted small center" style={{ marginBottom: 10 }}>{summary}</p>}
        <button className="btn btn--primary btn--lg btn--block" onClick={onStart} disabled={disabled}>
          {startLabel}
        </button>
      </div>
    </div>
  )
}
