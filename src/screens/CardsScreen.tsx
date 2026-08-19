// Путь: src/screens/CardsScreen.tsx
// Карточки: брифинг с настройками → колода со свайпами → итоги.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Briefing, { Segmented, SwitchRow } from '../components/Briefing'
import { recordAnswer, useEmployees, type SessionMode } from '../lib/employees'
import { logAnswer } from '../lib/activity'
import type { EmployeeWithProgress } from '../types'

/* ------------------------------------------------------------------ */
/*  Настройки тренировки                                              */
/* ------------------------------------------------------------------ */

type Order = 'priority' | 'random' | 'weak'
type Face = 'name' | 'job'
type Phase = 'brief' | 'play' | 'done'

type Settings = { size: number; order: Order; face: Face; swipe: boolean }

const TITLES: Record<SessionMode, string> = {
  priority: 'Обучение',
  all: 'Карточки',
  review: 'Повторить ошибки',
}

/** Настройки помним между запусками: второй раз ничего не надо трогать */
function loadSettings(mode: SessionMode): Settings {
  const fallback: Settings = {
    size: mode === 'all' ? 0 : 20,
    order: mode === 'review' ? 'weak' : 'priority',
    face: 'name',
    swipe: true,
  }
  try {
    const raw = localStorage.getItem('cards-settings-' + mode)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return fallback
  }
}

/* ------------------------------------------------------------------ */
/*  Сбор колоды                                                       */
/* ------------------------------------------------------------------ */

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isWeak(e: EmployeeWithProgress): boolean {
  return e.attempts > 0 && (e.status === 'weak' || e.accuracy < 60 || e.last_result === false)
}

function buildDeck(list: EmployeeWithProgress[], st: Settings): EmployeeWithProgress[] {
  const pool = st.order === 'weak' ? list.filter(isWeak) : list
  const limit = st.size === 0 ? pool.length : st.size

  if (st.order === 'random') return shuffle(pool).slice(0, limit)

  // priority и weak: сначала самые «срочные»
  const sorted = [...pool].sort((a, b) => b.priority - a.priority).slice(0, limit)
  // в умном режиме внутри порции перемешиваем, чтобы порядок не был одинаковым
  return st.order === 'priority' ? shuffle(sorted) : sorted
}

/* ------------------------------------------------------------------ */
/*  Экран                                                             */
/* ------------------------------------------------------------------ */

export default function CardsScreen({ mode }: { mode: SessionMode }) {
  const { list, loading, error, reload } = useEmployees()

  const [settings, setSettings] = useState<Settings>(() => loadSettings(mode))
  const [phase, setPhase] = useState<Phase>('brief')
  const [deck, setDeck] = useState<EmployeeWithProgress[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  /* --- перетаскивание карточки --- */
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState(false)
  const [flipKey, setFlipKey] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<'none' | 'x' | 'y'>('none')

  const current: EmployeeWithProgress | null =
    phase === 'play' && index < deck.length ? deck[index] : null
  const total = deck.length

  useEffect(() => {
    localStorage.setItem('cards-settings-' + mode, JSON.stringify(settings))
  }, [settings, mode])

  /* ---------------------------- начало ---------------------------- */
  function start() {
    const built = buildDeck(list, settings)
    setDeck(built)
    setIndex(0)
    setRevealed(false)
    setKnown(0)
    setUnknown(0)
    setSaveError(null)
    setDx(0)
    setPhase(built.length === 0 ? 'done' : 'play')
  }

  function backToBrief() {
    setPhase('brief')
    setDeck([])
    reload()
  }

  /* ---------------------------- ответ ----------------------------- */
  function answer(correct: boolean) {
    const employee = deck[index]
    if (!employee) return

    if (correct) setKnown((n) => n + 1)
    else setUnknown((n) => n + 1)

    logAnswer(correct)   // отмечаем ответ в дневнике занятий (для графика по дням)

    setRevealed(false)
    setDx(0)

    if (index + 1 >= deck.length) {
      setPhase('done')
      reload()
    } else {
      setIndex((i) => i + 1)
    }

    // Пишем в базу «в фоне»: пользователь не ждёт сервер
    void recordAnswer(employee.id, correct).catch((e: unknown) =>
      setSaveError('Не удалось сохранить один из ответов: ' + (e instanceof Error ? e.message : String(e)))
    )
  }

  /** Карточка улетает в сторону, и только потом записывается ответ */
  function fly(dir: 'left' | 'right') {
    if (flying || !current) return
    setFlying(true)
    setDragging(false)
    setDx(dir === 'right' ? 700 : -700)
    window.setTimeout(() => {
      answer(dir === 'right')
      setFlying(false)
    }, 220)
  }

  function reveal() {
    if (revealed) return
    setRevealed(true)
    setFlipKey((k) => k + 1)   // перезапускаем анимацию переворота
  }

  /* -------------------------- жесты мыши/пальца -------------------- */
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!settings.swipe || flying || !current) return
    startX.current = e.clientX
    startY.current = e.clientY
    axis.current = 'none'
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const moveX = e.clientX - startX.current
    const moveY = e.clientY - startY.current

    // Решаем один раз: человек ведёт в сторону (свайп) или вниз (прокрутка)
    if (axis.current === 'none' && (Math.abs(moveX) > 8 || Math.abs(moveY) > 8)) {
      axis.current = Math.abs(moveX) > Math.abs(moveY) ? 'x' : 'y'
    }
    if (axis.current === 'x') setDx(moveX)
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    if (axis.current === 'x' && Math.abs(dx) > 100) fly(dx > 0 ? 'right' : 'left')
    else setDx(0)
  }

  /* -------------------------- клавиатура --------------------------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); reveal() }
      else if (e.key === '1' || e.key === 'ArrowLeft') fly('left')
      else if (e.key === '2' || e.key === 'ArrowRight') fly('right')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ============================ БРИФИНГ =========================== */
  if (phase === 'brief') {
    const preview = buildDeck(list, settings)

    const orderOptions =
      mode === 'review'
        ? [{ value: 'weak' as Order, label: 'Только слабые' }]
        : [
            { value: 'priority' as Order, label: 'Умный' },
            { value: 'random' as Order, label: 'Случайный' },
            { value: 'weak' as Order, label: 'Слабые' },
          ]

    return (
      <div className="container">
        <AppHeader title={TITLES[mode]} back />

        {loading && <div className="card center muted">Загружаю…</div>}
        {error && <div className="card answer-wrong">Ошибка: {error}</div>}

        {!loading && list.length === 0 && (
          <div className="card card--pad-lg center">
            <p className="big-emoji">📭</p>
            <p><strong>Пока некого учить</strong></p>
            <p className="muted small">Сначала добавьте сотрудников или загрузите список из файла.</p>
            <div className="stack">
              <Link to="/import" className="btn btn--primary">📂 Загрузить из файла</Link>
              <Link to="/employees" className="btn">👥 Добавить вручную</Link>
            </div>
          </div>
        )}

        {!loading && list.length > 0 && (
          <Briefing
            emoji={mode === 'review' ? '🔁' : mode === 'all' ? '🗂' : '🎯'}
            title={
              mode === 'review' ? 'Повторение ошибок'
              : mode === 'all' ? 'Все карточки'
              : 'Обучение карточками'
            }
            what={
              mode === 'review'
                ? 'Короткий заход по тем, кого вы не вспомнили или путаете. Самый быстрый способ убрать красные цифры.'
                : mode === 'all'
                  ? 'Весь список подряд, в случайном порядке. Подходит, чтобы освежить память целиком.'
                  : 'Тренажёр сам выбирает, кого показать: сначала незнакомые и давно не повторявшиеся. 5-10 минут в день дают лучший результат.'
            }
            steps={[
              'На карточке видно только одну сторону, например ФИО. Попробуйте вспомнить остальное сами.',
              'Нажмите «Показать ответ» (или пробел на компьютере) — карточка перевернётся.',
              settings.swipe
                ? 'Свайп вправо — «знаю», влево — «не знаю». Можно и просто нажать кнопку внизу.'
                : 'Отметьте кнопкой внизу: «Знаю» или «Не знаю».',
              'Честное «не знаю» полезнее: такие люди вернутся к вам чаще, пока не запомнятся.',
            ]}
            settings={
              <>
                <div className="setting">
                  <div className="setting__title">Сколько карточек</div>
                  <p className="setting__hint">Короткие частые заходы работают лучше долгих редких.</p>
                  <Segmented
                    value={settings.size}
                    options={[
                      { value: 10, label: '10' },
                      { value: 20, label: '20' },
                      { value: 40, label: '40' },
                      { value: 0, label: 'Все' },
                    ]}
                    onChange={(size) => setSettings({ ...settings, size })}
                  />
                </div>

                {mode !== 'review' && (
                  <div className="setting">
                    <div className="setting__title">Порядок</div>
                    <p className="setting__hint">
                      Умный — сначала те, кого знаете хуже. Случайный — вперемешку. Слабые — только проблемные.
                    </p>
                    <Segmented
                      value={settings.order}
                      options={orderOptions}
                      onChange={(order) => setSettings({ ...settings, order })}
                    />
                  </div>
                )}

                <div className="setting">
                  <div className="setting__title">Что на лицевой стороне</div>
                  <p className="setting__hint">
                    ФИО → вспоминаете должность. Должность → вспоминаете человека (сложнее).
                  </p>
                  <Segmented
                    value={settings.face}
                    options={[
                      { value: 'name' as Face, label: 'ФИО' },
                      { value: 'job' as Face, label: 'Должность' },
                    ]}
                    onChange={(face) => setSettings({ ...settings, face })}
                  />
                </div>

                <hr className="hr" />

                <SwitchRow
                  on={settings.swipe}
                  title="Свайпы"
                  hint="Тянуть карточку пальцем: вправо «знаю», влево «не знаю»."
                  onToggle={() => setSettings({ ...settings, swipe: !settings.swipe })}
                />
              </>
            }
            summary={
              preview.length === 0
                ? mode === 'review'
                  ? 'Слабых мест нет — повторять нечего. Отличная новость!'
                  : 'По этим настройкам колода получилась пустой. Смените порядок.'
                : `В колоде ${preview.length} ${preview.length === 1 ? 'карточка' : preview.length < 5 ? 'карточки' : 'карточек'}`
            }
            startLabel={preview.length === 0 ? 'Нечего показывать' : '▶ Начать'}
            disabled={preview.length === 0}
            onStart={start}
          />
        )}
      </div>
    )
  }

  /* ============================= ИТОГИ ============================ */
  if (phase === 'done') {
    const percent = total === 0 ? 0 : Math.round((known / total) * 100)

    if (total === 0) {
      return (
        <div className="container fade-in">
          <AppHeader title={TITLES[mode]} back />
          <div className="card card--pad-lg center">
            <p className="big-emoji">🎉</p>
            <p><strong>Повторять нечего</strong></p>
            <p className="muted small">Слабых мест нет. Загляните позже или пройдите тест.</p>
            <div className="stack">
              <Link to="/test" className="btn btn--primary">✍️ Пройти тест</Link>
              <Link to="/" className="btn btn--ghost">На главную</Link>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container fade-in">
        <AppHeader title="Занятие завершено" back />

        <div className="card card--pad-lg center celebrate">
          {/* Салют из эмодзи: 12 штук с разным разлётом */}
          {percent >= 70 && Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                '--dx': `${(i - 6) * 26}px`,
                animationDelay: `${i * 0.05}s`,
              } as CSSProperties}
              aria-hidden="true"
            >
              {['🎉', '✨', '⭐', '🎊'][i % 4]}
            </span>
          ))}

          <p className="big-emoji">{percent >= 90 ? '🏆' : percent >= 60 ? '👍' : '💪'}</p>
          <h2 style={{ margin: '4px 0' }}>{known} из {total}</h2>
          <p className="muted">Узнали {percent}% колоды</p>

          <div className="progress" style={{ marginBottom: 16 }}>
            <div
              className={'progress__bar' + (percent >= 80 ? ' progress__bar--success' : '')}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="grid grid-2" style={{ marginBottom: 16 }}>
            <div className="card stat">
              <div className="stat__value" style={{ color: 'var(--success)' }}>{known}</div>
              <div className="stat__label">знаю</div>
            </div>
            <div className="card stat">
              <div className="stat__value" style={{ color: 'var(--danger)' }}>{unknown}</div>
              <div className="stat__label">не знаю</div>
            </div>
          </div>

          {saveError && <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{saveError}</div>}

          <div className="stack">
            <button className="btn btn--primary btn--lg" onClick={backToBrief}>↻ Ещё заход</button>
            {unknown > 0 && mode !== 'review' && (
              <Link to="/review" className="btn">🔁 Повторить только ошибки</Link>
            )}
            <Link to="/test" className="btn btn--ghost">✍️ Проверить себя тестом</Link>
            <Link to="/" className="btn btn--ghost">🏠 На главную</Link>
          </div>
        </div>
      </div>
    )
  }

  /* ============================ КОЛОДА ============================ */
  if (!current) return null

  const percentDone = total === 0 ? 0 : Math.round((index / total) * 100)
  const tilt = dx * 0.05
  const yesOpacity = Math.min(1, Math.max(0, dx) / 110)
  const noOpacity = Math.min(1, Math.max(0, -dx) / 110)

  const frontLabel = settings.face === 'name' ? 'Сотрудник' : 'Должность'
  const frontValue = settings.face === 'name' ? current.full_name : current.job_title
  const frontHint =
    settings.face === 'name' ? 'Кто это и чем занимается?' : 'Кто занимает эту должность?'

  return (
    <div className="container fade-in">
      <AppHeader title={TITLES[mode]} back />

      <div className="row small muted" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span>Карточка {index + 1} из {total}</span>
        <span>✅ {known} · ❌ {unknown}</span>
      </div>
      <div className="progress" style={{ marginBottom: 20 }}>
        <div className="progress__bar" style={{ width: `${percentDone}%` }} />
      </div>

      <div className="swipe-area deck-stack">
        <div
          className={
            'swipe-card' +
            (dragging ? ' is-dragging' : ' is-settling') +
            (revealed ? ' is-flipping' : '')
          }
          key={`card-${index}-${flipKey}`}
          style={{ transform: `translateX(${dx}px) rotate(${tilt}deg)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {settings.swipe && (
            <>
              <span className="stamp stamp--yes" style={{ opacity: yesOpacity }}>ЗНАЮ</span>
              <span className="stamp stamp--no" style={{ opacity: noOpacity }}>НЕ ЗНАЮ</span>
            </>
          )}

          <div className="muted small center" style={{ marginBottom: 6 }}>{frontLabel}</div>
          <div className="flash-name">{frontValue}</div>

          {!revealed && <div className="flash-sub">{frontHint}</div>}

          {revealed && (
            <div className="flashcard__answer" style={{ marginTop: 16 }}>
              {settings.face === 'name' ? (
                <div className="answer-row">
                  <span className="answer-row__label">Должность</span>
                  <span className="answer-row__value">{current.job_title}</span>
                </div>
              ) : (
                <div className="answer-row">
                  <span className="answer-row__label">Это</span>
                  <span className="answer-row__value">{current.full_name}</span>
                </div>
              )}
              {current.department && (
                <div className="answer-row">
                  <span className="answer-row__label">Отдел</span>
                  <span className="answer-row__value">{current.department}</span>
                </div>
              )}
              {current.description && (
                <div className="answer-row">
                  <span className="answer-row__label">Чем занимается</span>
                  <span>{current.description}</span>
                </div>
              )}
              {current.notes && (
                <div className="answer-row">
                  <span className="answer-row__label">Заметка</span>
                  <span className="muted">{current.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {settings.swipe && (
        <div className="swipe-hints">
          <span>← тяните влево: не знаю</span>
          <span>тяните вправо: знаю →</span>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {!revealed ? (
          <button className="btn btn--primary btn--block btn--lg" onClick={reveal}>
            Показать ответ
          </button>
        ) : (
          <div className="grid grid-2">
            <button className="btn btn--danger btn--block btn--lg" onClick={() => fly('left')}>
              ❌ Не знаю
            </button>
            <button className="btn btn--success btn--block btn--lg" onClick={() => fly('right')}>
              ✅ Знаю
            </button>
          </div>
        )}
      </div>

      <p className="muted small center" style={{ marginTop: 14 }}>
        На компьютере: пробел — показать ответ, ← не знаю, → знаю. Карточку можно тянуть мышью.
      </p>
    </div>
  )
}
