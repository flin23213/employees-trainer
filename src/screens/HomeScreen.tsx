// Путь: src/screens/HomeScreen.tsx
// Главный экран = короткий пульт: как дела, одна кнопка «начать», показатели.
// Всё длинное объяснение убрано в сворачивающийся блок внизу.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import StatTile from '../components/StatTile'
import ProgressScale from '../components/ProgressScale'
import ActivityChart from '../components/ActivityChart'
import { computeStats, useEmployees } from '../lib/employees'
import { useLists } from '../lib/lists'

/* ------------------------------------------------------------------ */
/*  «Живой» смайлик: лица меняются сами                               */
/* ------------------------------------------------------------------ */
const FACES = ['🧑‍💼', '👩‍💻', '👨‍🔧', '👩‍🏫', '🧑‍🚀', '👨‍🍳', '👩‍⚕️', '🧑‍🎨', '👨‍✈️', '👩‍🔬']

function LiveAvatar({ small = false }: { small?: boolean }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setI((n) => (n + 1) % FACES.length), 2600)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className={'avatar-bubble' + (small ? ' avatar-bubble--sm' : '')} aria-hidden="true">
      <span className="avatar-bubble__face" key={i}>{FACES[i]}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Определяем, широкий ли экран (компьютер) или узкий (телефон)       */
/* ------------------------------------------------------------------ */
function useIsWide(): boolean {
  const query = '(min-width: 760px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setWide(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return wide
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

/* ------------------------------------------------------------------ */
/*  Сворачивающийся блок «Как это работает»                            */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card fold">
      <button className="fold__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="fold__icon" aria-hidden="true">💡</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="fold__title">Как это работает</span>
          <span className="fold__sub">Коротко: зачем карточки, зачем тест и откуда берётся процент</span>
        </span>
        <span className={'fold__chev' + (open ? ' is-open' : '')} aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="fold__body">
          <ol className="steps">
            <li>
              <span className="steps__num">1</span>
              <span><strong>Карточки</strong> — узнавание. Видите ФИО, вспоминаете должность, честно отмечаете «знаю» или «не знаю». Быстро, годится в перерыве.</span>
            </li>
            <li>
              <span className="steps__num">2</span>
              <span><strong>Тест</strong> — припоминание. Ответ нужно вписать или выбрать. Сложнее, но именно так знания закрепляются надолго.</span>
            </li>
            <li>
              <span className="steps__num">3</span>
              <span><strong>Тренажёр сам решает, кого показать.</strong> Кого путаете — показывает чаще, кого знаете — реже. Поэтому достаточно нажимать «Начать обучение».</span>
            </li>
            <li>
              <span className="steps__num">4</span>
              <span><strong>«Выучен»</strong> — это несколько верных ответов подряд, а не один удачный. Поэтому процент растёт не сразу, зато честно.</span>
            </li>
          </ol>
          <p className="muted small" style={{ margin: '12px 0 0' }}>
            Все разделы всегда доступны через кнопку ☰ в правом верхнем углу.
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Экран                                                             */
/* ------------------------------------------------------------------ */
export default function HomeScreen() {
  const { list, loading, error } = useEmployees()
  const { active } = useLists()          // какой профиль списка сейчас выбран
  const s = computeStats(list)
  const wide = useIsWide()
  const empty = !loading && s.total === 0

  return (
    <div className="container">
      <AppHeader title="Тренажёр сотрудников" />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>Ошибка загрузки: {error}</div>}

      <div className="stagger">
        {/* ---------- 1. Приветствие ---------- */}
        <div className="hero">
          <div className="hero__row">
            <LiveAvatar small={wide} />
            <div className="hero__texts">
              <div className="hero__hi">{greeting()}!</div>
              <h2 className="hero__title">
                {empty ? 'Начнём с самого начала' : `Вы знаете ${s.known} из ${s.total}`}
              </h2>
              <p className="hero__note">
                {empty
                  ? 'В этом профиле пока никого нет. Добавьте сотрудников — и тренажёр оживёт.'
                  : loading
                    ? 'Обновляю данные…'
                    : s.weak > 0
                      ? `Точность ${s.avgAccuracy}% · есть ${s.weak} слабых мест`
                      : `Точность ${s.avgAccuracy}% · слабых мест нет`}
              </p>

              {/* Какой список сотрудников сейчас открыт */}
              {active && (
                <Link to="/lists" className="list-chip">
                  <span aria-hidden="true">{active.emoji}</span>
                  <span className="truncate">{active.name}</span>
                  <span className="list-chip__go" aria-hidden="true">· сменить ›</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ---------- 2. Пустая база ---------- */}
        {empty && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="section__title" style={{ marginBottom: 12 }}>С чего начать</h3>
            <ol className="steps" style={{ marginBottom: 16 }}>
              <li><span className="steps__num">1</span><span>Загрузите готовый список из Excel, CSV или обычного текста — так быстрее всего.</span></li>
              <li><span className="steps__num">2</span><span>Или добавьте пару человек вручную, чтобы просто попробовать.</span></li>
              <li><span className="steps__num">3</span><span>Возвращайтесь сюда: появятся тренировки и статистика.</span></li>
            </ol>
            <div className="stack">
              <Link to="/import" className="btn btn--primary btn--block btn--lg">📂 Загрузить список из файла</Link>
              <Link to="/employees" className="btn btn--block">✍️ Добавить вручную</Link>
            </div>
          </div>
        )}

        {!empty && (
          <>
            {/* ---------- 3. Главная кнопка ---------- */}
            <Link to="/learn" className="start-btn" style={{ marginTop: 16 }}>
              <span className="start-btn__glow" aria-hidden="true" />
              <span className="start-btn__icon" aria-hidden="true">🚀</span>
              <span className="start-btn__body">
                <span className="start-btn__title">Начать обучение</span>
                <span className="start-btn__desc">Выберете вид занятия и настройки на следующем шаге</span>
              </span>
              <span className="start-btn__chev" aria-hidden="true">→</span>
            </Link>

            {s.weak > 0 && (
              <Link to="/review" className="btn btn--block" style={{ marginTop: 10 }}>
                🔁 Быстро повторить ошибки ({s.weak})
              </Link>
            )}

            {/* ---------- 4. Прогресс: шкала + график ---------- */}
            <div className={wide ? 'grid grid-2' : 'stack'} style={{ marginTop: 18 }}>
              <ProgressScale
                known={s.known}
                learning={s.learning}
                fresh={s.fresh}
                total={s.total}
                percent={s.progressPercent}
              />
              <ActivityChart days={wide ? 14 : 7} />
            </div>

            {/* ---------- 5. Показатели ---------- */}
            <div className="grid grid-4" style={{ marginTop: 12 }}>
              <StatTile to="/employees"        icon="👥" label="Сотрудников"  value={s.total}       loading={loading} />
              <StatTile to="/insight/known"    icon="✅" label="Изучено"      value={s.known}       loading={loading} color="var(--success)" />
              <StatTile to="/insight/weak"     icon="⚠️" label="Слабые места" value={s.weak}        loading={loading} color="var(--danger)" />
              <StatTile to="/insight/accuracy" icon="🎯" label="Точность"     value={s.avgAccuracy} suffix="%" loading={loading} />
            </div>

            <p className="center" style={{ marginTop: 14 }}>
              <Link to="/insight/progress" className="link-quiet">Подробный разбор прогресса →</Link>
            </p>

            {/* ---------- 6. Справка, свёрнута ---------- */}
            <div style={{ marginTop: 18 }}>
              <HowItWorks />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
