// Путь: src/screens/InsightScreen.tsx
// «Разбор показателя»: сюда ведут плитки с главного экрана.
// Один экран обслуживает несколько групп: /insight/weak, /insight/known и т.д.

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { STATUS_META, computeStats, useEmployees } from '../lib/employees'
import type { EmployeeWithProgress } from '../types'

type Group = 'known' | 'weak' | 'learning' | 'new' | 'accuracy' | 'progress'

const GROUPS: Record<Group, { title: string; emoji: string; note: string }> = {
  known:    { title: 'Изучено',            emoji: '✅', note: 'Этих людей вы отвечаете уверенно: точность высокая, серия верных ответов набрана.' },
  weak:     { title: 'Слабые места',       emoji: '⚠️', note: 'Здесь вы чаще ошибаетесь. Худшие — сверху. Именно с них быстрее всего растёт общий процент.' },
  learning: { title: 'В процессе',         emoji: '📖', note: 'Уже знакомы, но результат ещё не стабильный. Нужно ещё несколько повторов.' },
  new:      { title: 'Ещё не изучено',     emoji: '🆕', note: 'Этих людей вы ни разу не отвечали. С них удобно начинать новое занятие.' },
  accuracy: { title: 'Точность ответов',   emoji: '🎯', note: 'Доля верных ответов по каждому сотруднику. Слабые — в начале списка.' },
  progress: { title: 'Общий прогресс',     emoji: '📈', note: 'Из чего складывается ваш процент и где вы теряете больше всего.' },
}

function formatDate(iso: string | null): string {
  if (!iso) return 'ни разу'
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function barColor(accuracy: number, attempts: number): string {
  if (attempts === 0) return 'var(--text-muted)'
  if (accuracy >= 80) return 'var(--success)'
  if (accuracy >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

/** Одна строка списка: нажали — раскрылись подробности */
function Row({ e }: { e: EmployeeWithProgress }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[e.status]

  return (
    <div
      className="irow"
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      onKeyDown={(ev) => {
        // Клавиатура: пробел и Enter работают как нажатие
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen(!open) }
      }}
    >
      <div className="irow__top">
        <span className="irow__name truncate" style={{ flex: 1 }}>{e.full_name}</span>
        <span className="irow__pct" style={{ color: barColor(e.accuracy, e.attempts) }}>
          {e.attempts === 0 ? '—' : `${e.accuracy}%`}
        </span>
        <span className="muted small" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </div>

      <div className="muted small truncate" style={{ marginTop: 2 }}>
        {e.job_title}{e.department ? ` · ${e.department}` : ''}
      </div>

      <div className="bar-mini">
        <div
          className="bar-mini__fill"
          style={{
            width: `${e.attempts === 0 ? 3 : Math.max(3, e.accuracy)}%`,
            background: barColor(e.accuracy, e.attempts),
          }}
        />
      </div>

      {open && (
        <div className="irow__more small">
          <div className="row" style={{ marginBottom: 8 }}>
            <span className={meta.className}>{meta.label}</span>
            <div className="spacer" />
            <span className="muted">Последний ответ: {formatDate(e.last_reviewed_at)}</span>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <span>Ответов: <strong>{e.attempts}</strong></span>
            <span style={{ color: 'var(--success)' }}>верно: <strong>{e.correct_count}</strong></span>
            <span style={{ color: 'var(--danger)' }}>ошибок: <strong>{e.incorrect_count}</strong></span>
            <span>подряд: <strong>{e.streak}</strong></span>
          </div>
          {e.description && <p className="muted" style={{ margin: '8px 0 0' }}>{e.description}</p>}
          {e.notes && <p className="muted" style={{ margin: '4px 0 0' }}>Заметка: {e.notes}</p>}
        </div>
      )}
    </div>
  )
}

export default function InsightScreen() {
  const params = useParams<{ group: string }>()
  const group = (params.group ?? 'progress') as Group
  const info = GROUPS[group] ?? GROUPS.progress

  const { list, loading, error } = useEmployees()
  const s = computeStats(list)

  /* Кого показываем и в каком порядке */
  const rows = useMemo(() => {
    const byWorst = (a: EmployeeWithProgress, b: EmployeeWithProgress) =>
      a.accuracy - b.accuracy || b.attempts - a.attempts
    const byName = (a: EmployeeWithProgress, b: EmployeeWithProgress) =>
      a.full_name.localeCompare(b.full_name, 'ru')

    switch (group) {
      case 'known':    return list.filter((e) => e.status === 'known').sort(byName)
      case 'weak':     return list.filter((e) => e.status === 'weak').sort(byWorst)
      case 'learning': return list.filter((e) => e.status === 'learning').sort(byWorst)
      case 'new':      return list.filter((e) => e.status === 'new').sort(byName)
      case 'accuracy': return list.filter((e) => e.attempts > 0).sort(byWorst)
      default:         return []
    }
  }, [list, group])

  /* Разрез по отделам — только для экрана прогресса */
  const byDept = useMemo(() => {
    if (group !== 'progress') return []
    const map = new Map<string, { total: number; known: number }>()
    list.forEach((e) => {
      const key = e.department ?? 'Без отдела'
      const cur = map.get(key) ?? { total: 0, known: 0 }
      cur.total += 1
      if (e.status === 'known') cur.known += 1
      map.set(key, cur)
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, percent: Math.round((v.known / v.total) * 100) }))
      .sort((a, b) => b.percent - a.percent || b.total - a.total)
  }, [list, group])

  const totals = useMemo(() => {
    const attempts = list.reduce((n, e) => n + e.attempts, 0)
    const correct = list.reduce((n, e) => n + e.correct_count, 0)
    const bestStreak = list.reduce((m, e) => Math.max(m, e.streak), 0)
    return { attempts, correct, wrong: attempts - correct, bestStreak }
  }, [list])

  const share = s.total === 0 ? 0 : Math.round((rows.length / s.total) * 100)

  return (
    <div className="container">
      <AppHeader title={info.title} back />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>Ошибка: {error}</div>}
      {loading && <div className="card center muted">Загружаю…</div>}

      {!loading && (
        <div className="stagger">
          {/* ---------- Шапка ---------- */}
          <div className="card card--pad-lg brief__head">
            <span className="brief__emoji" aria-hidden="true">{info.emoji}</span>
            <h2 className="brief__title">
              {group === 'progress' ? `${s.progressPercent}%`
                : group === 'accuracy' ? `${s.avgAccuracy}%`
                : `${rows.length} чел.`}
            </h2>
            <p className="brief__what">{info.note}</p>
          </div>

          {/* ---------- Экран общего прогресса ---------- */}
          {group === 'progress' && (
            <>
              <div className="card" style={{ marginTop: 14 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <strong>Выучено {s.known} из {s.total}</strong>
                  <div className="spacer" />
                  <span className="badge badge--known">{s.progressPercent}%</span>
                </div>
                <div className="progress">
                  <div
                    className={'progress__bar' + (s.progressPercent >= 80 ? ' progress__bar--success' : '')}
                    style={{ width: `${s.progressPercent}%` }}
                  />
                </div>
                <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
                  «Выучен» — это несколько верных ответов подряд, а не один удачный. Поэтому процент растёт не сразу.
                </p>
              </div>

              <div className="section"><h3 className="section__title">Состав списка</h3></div>
              <div className="stack">
                <Link to="/insight/known" className="action">
                  <span className="action__icon">✅</span>
                  <span className="action__body">
                    <span className="action__title">Выучено <span className="pill pill--soft">{s.known}</span></span>
                    <span className="action__desc">Отвечаете уверенно</span>
                  </span>
                  <span className="action__chev">→</span>
                </Link>
                <Link to="/insight/learning" className="action">
                  <span className="action__icon">📖</span>
                  <span className="action__body">
                    <span className="action__title">В процессе <span className="pill pill--soft">{s.learning}</span></span>
                    <span className="action__desc">Результат ещё не стабильный</span>
                  </span>
                  <span className="action__chev">→</span>
                </Link>
                <Link to="/insight/weak" className="action">
                  <span className="action__icon">⚠️</span>
                  <span className="action__body">
                    <span className="action__title">Слабые места <span className="pill">{s.weak}</span></span>
                    <span className="action__desc">Чаще ошибаетесь</span>
                  </span>
                  <span className="action__chev">→</span>
                </Link>
                <Link to="/insight/new" className="action">
                  <span className="action__icon">🆕</span>
                  <span className="action__body">
                    <span className="action__title">Не изучено <span className="pill pill--soft">{s.fresh}</span></span>
                    <span className="action__desc">Ни одного ответа</span>
                  </span>
                  <span className="action__chev">→</span>
                </Link>
              </div>

              <div className="section"><h3 className="section__title">Мои ответы за всё время</h3></div>
              <div className="grid grid-4">
                <div className="card stat">
                  <div className="stat__value">{totals.attempts}</div>
                  <div className="stat__label">всего ответов</div>
                </div>
                <div className="card stat">
                  <div className="stat__value" style={{ color: 'var(--success)' }}>{totals.correct}</div>
                  <div className="stat__label">верных</div>
                </div>
                <div className="card stat">
                  <div className="stat__value" style={{ color: 'var(--danger)' }}>{totals.wrong}</div>
                  <div className="stat__label">ошибок</div>
                </div>
                <div className="card stat">
                  <div className="stat__value">{totals.bestStreak}</div>
                  <div className="stat__label">лучшая серия</div>
                </div>
              </div>

              {byDept.length > 0 && (
                <>
                  <div className="section">
                    <h3 className="section__title">По отделам</h3>
                    <p className="section__sub">Видно, какой отдел стоит подтянуть.</p>
                  </div>
                  <div className="card stack" style={{ gap: 14 }}>
                    {byDept.map((d) => (
                      <div key={d.name}>
                        <div className="row small" style={{ marginBottom: 4 }}>
                          <span className="truncate" style={{ flex: 1 }}>{d.name}</span>
                          <span className="muted">{d.known} из {d.total}</span>
                          <strong>{d.percent}%</strong>
                        </div>
                        <div className="bar-mini">
                          <div
                            className="bar-mini__fill"
                            style={{
                              width: `${Math.max(2, d.percent)}%`,
                              background: d.percent >= 80 ? 'var(--success)' : d.percent >= 40 ? 'var(--warning)' : 'var(--danger)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="stack" style={{ marginTop: 18 }}>
                <Link to="/learn" className="btn btn--primary btn--lg btn--block">🎯 Продолжить обучение</Link>
                <Link to="/stats" className="btn btn--block">📊 Полная статистика</Link>
              </div>
            </>
          )}

          {/* ---------- Списочные группы ---------- */}
          {group !== 'progress' && (
            <>
              {group !== 'accuracy' && s.total > 0 && (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="row small" style={{ marginBottom: 6 }}>
                    <span>Доля от всего списка</span>
                    <div className="spacer" />
                    <strong>{share}%</strong>
                  </div>
                  <div className="bar-mini">
                    <div
                      className="bar-mini__fill"
                      style={{
                        width: `${Math.max(2, share)}%`,
                        background: group === 'weak' ? 'var(--danger)' : group === 'known' ? 'var(--success)' : 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="card card--pad-lg center" style={{ marginTop: 14 }}>
                  <p className="big-emoji">{group === 'weak' ? '🎉' : '🙂'}</p>
                  <p><strong>
                    {group === 'weak' ? 'Слабых мест нет' :
                     group === 'known' ? 'Пока никто не выучен' :
                     group === 'new' ? 'Все уже хотя бы раз отвечены' :
                     group === 'accuracy' ? 'Ещё нет ни одного ответа' :
                     'Список пуст'}
                  </strong></p>
                  <p className="muted small">
                    {group === 'weak'
                      ? 'Ошибок нет — повторять нечего. Так держать!'
                      : 'Пройдите карточки или тест, и здесь появятся цифры.'}
                  </p>
                  <div className="stack">
                    <Link to="/learn" className="btn btn--primary">🎯 Начать обучение</Link>
                    <Link to="/" className="btn btn--ghost">🏠 На главную</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="section">
                    <h3 className="section__title">Список · {rows.length}</h3>
                    <p className="section__sub">Нажмите на строку, чтобы увидеть подробности.</p>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    {rows.map((e) => <Row key={e.id} e={e} />)}
                  </div>

                  <div className="stack" style={{ marginTop: 18 }}>
                    {(group === 'weak' || group === 'accuracy') && (
                      <Link to="/review" className="btn btn--primary btn--lg btn--block">
                        🔁 Повторить эти карточками
                      </Link>
                    )}
                    {group === 'new' && (
                      <Link to="/learn" className="btn btn--primary btn--lg btn--block">
                        🎯 Начать с них обучение
                      </Link>
                    )}
                    {group === 'known' && (
                      <Link to="/test" className="btn btn--primary btn--lg btn--block">
                        ✍️ Проверить тестом, держится ли результат
                      </Link>
                    )}
                    <Link to="/employees" className="btn btn--block">👥 Открыть полный список</Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
