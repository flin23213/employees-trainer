// Путь: src/screens/ListsScreen.tsx
// Профили списков: выбор, создание, переименование, прогресс, очистка, удаление.
//
// Главная мысль экрана: человек в любой момент видит, ЧЕМ он сейчас занимается.
// Сверху — крупная плашка активного профиля, ниже — все профили с кружком
// выбора (как в настройках телефона) и полоской прогресса у каждого.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import {
  LIST_EMOJI, clearList, createList, deleteList, lastStudiedText, renameList,
  resetListProgress, resetProgressEverywhere, setActiveList, useLists, type ListInfo,
} from '../lib/lists'

/** Выбор значка профиля */
function EmojiPicker({ value, onPick }: { value: string; onPick: (e: string) => void }) {
  return (
    <div className="emoji-row">
      {LIST_EMOJI.map((e) => (
        <button
          key={e}
          type="button"
          className={'emoji-btn' + (e === value ? ' is-on' : '')}
          onClick={() => onPick(e)}
          aria-label={`Значок ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

/** Полоска «сколько выучено» */
function Bar({ percent }: { percent: number }) {
  return (
    <span className="progress" aria-hidden="true">
      <span
        className={'progress__bar' + (percent >= 80 ? ' progress__bar--success' : '')}
        style={{ width: `${Math.max(percent, percent > 0 ? 4 : 0)}%` }}
      />
    </span>
  )
}

/** Сворачивающееся объяснение «что такое профиль» */
function AboutProfiles() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card fold">
      <button className="fold__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="fold__icon" aria-hidden="true">📚</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="fold__title">Что такое профиль списка</span>
          <span className="fold__sub">Зачем их несколько и что происходит при переключении</span>
        </span>
        <span className={'fold__chev' + (open ? ' is-open' : '')} aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="fold__body">
          <ol className="steps">
            <li>
              <span className="steps__num">1</span>
              <span><strong>Профиль — это отдельный список людей.</strong> Например «Мой отдел», «Соседний филиал», «Новички». У каждого свой прогресс.</span>
            </li>
            <li>
              <span className="steps__num">2</span>
              <span><strong>Активен всегда один.</strong> Карточки, тесты, статистика и импорт работают с тем профилем, который выбран здесь.</span>
            </li>
            <li>
              <span className="steps__num">3</span>
              <span><strong>Переключение ничего не стирает.</strong> Вернётесь обратно — проценты и серии останутся на месте.</span>
            </li>
            <li>
              <span className="steps__num">4</span>
              <span><strong>Делиться можно любым профилем.</strong> Код приглашения создаётся из того списка, который вы выберете.</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default function ListsScreen() {
  const { lists, active, loading, error, reload } = useLists()

  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📋')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('📋')

  const [openActs, setOpenActs] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  /** Общая обёртка: показать ошибку, обновить список, снять блокировку кнопок */
  async function run(action: () => Promise<void>, okNote?: string) {
    setBusy(true)
    setProblem(null)
    setNote(null)
    try {
      await action()
      await reload()
      if (okNote) setNote(okNote)
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(l: ListInfo) {
    setEditId(l.id)
    setEditName(l.name)
    setEditEmoji(l.emoji)
    setOpenActs(null)
    setProblem(null)
    setNote(null)
  }

  /** Переключиться на профиль + короткая подсветка, чтобы было видно, что сменили */
  function pick(l: ListInfo) {
    if (l.is_active) return
    setFlashId(l.id)
    window.setTimeout(() => setFlashId(null), 600)
    void run(() => setActiveList(l.id), `Активный профиль: «${l.name}». Все занятия теперь по этому списку.`)
  }

  return (
    <div className="container">
      <AppHeader title="Профили списков" back />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>Ошибка: {error}</div>}
      {loading && <div className="card center muted">Загружаю…</div>}

      {!loading && (
        <div className="stagger">
          {/* ================= 1. ЧЕМ ЗАНИМАЕМСЯ СЕЙЧАС ================= */}
          {active && (
            <div className="card card--pad-lg lnow">
              <div className="lnow__row">
                <span className="lnow__emoji" aria-hidden="true">{active.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="lnow__label">Сейчас занимаетесь</span>
                  <strong className="lnow__name truncate">{active.name}</strong>
                  <span className="muted small">
                    {active.employee_count} чел. · выучено {active.known} · {lastStudiedText(active.last_studied)}
                  </span>
                </span>
              </div>

              <Bar percent={active.percent} />
              <p className="muted small" style={{ margin: 0 }}>
                Прогресс профиля: {active.percent}%
                {active.answers > 0 ? ` · точность ${active.avg_accuracy}%` : ' · занятий пока не было'}
              </p>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Link to="/learn" className="btn btn--primary btn--sm">🚀 Заниматься</Link>
                <Link to="/employees" className="btn btn--sm">👥 Сотрудники</Link>
                <Link to={`/share?list=${active.id}`} className="btn btn--sm">🤝 Поделиться</Link>
              </div>
            </div>
          )}

          {problem && <div className="card answer-wrong small shake" style={{ marginTop: 12 }}>{problem}</div>}
          {note && <div className="card answer-correct small" style={{ marginTop: 12 }}>{note}</div>}

          {/* ================= 2. ВСЕ ПРОФИЛИ ================= */}
          <div className="section">
            <h3 className="section__title">Все профили · {lists.length}</h3>
            <p className="section__sub">
              Нажмите на профиль, чтобы переключиться на него. Галочка слева показывает, какой активен.
            </p>
          </div>

          <div className="stack" style={{ gap: 10 }}>
            {lists.map((l) => (
              <div
                key={l.id}
                className={
                  'card lcard' +
                  (l.is_active ? ' is-active' : '') +
                  (flashId === l.id ? ' lflash' : '')
                }
              >
                {editId === l.id ? (
                  /* ---------- режим переименования ---------- */
                  <div style={{ padding: 14 }}>
                    <label className="label" htmlFor={'name-' + l.id}>Название</label>
                    <input
                      id={'name-' + l.id}
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      autoFocus
                    />
                    <div className="label" style={{ marginTop: 12 }}>Значок</div>
                    <EmojiPicker value={editEmoji} onPick={setEditEmoji} />
                    <div className="grid grid-2" style={{ marginTop: 14 }}>
                      <button
                        className="btn btn--primary btn--block"
                        disabled={busy || editName.trim() === ''}
                        onClick={() => void run(
                          async () => { await renameList(l.id, editName, editEmoji); setEditId(null) },
                          'Профиль переименован.'
                        )}
                      >
                        Сохранить
                      </button>
                      <button className="btn btn--ghost btn--block" onClick={() => setEditId(null)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ---------- выбор профиля ---------- */}
                    <button
                      className="lcard__pick"
                      disabled={busy || l.is_active}
                      onClick={() => pick(l)}
                      aria-pressed={l.is_active}
                    >
                      <span className="lcard__radio" aria-hidden="true" />
                      <span className="lcard__emoji" aria-hidden="true">{l.emoji}</span>

                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="lcard__name truncate">{l.name}</span>

                        <span className="lcard__meta">
                          <span>{l.employee_count} чел.</span>
                          {l.employee_count > 0 && <span>✅ выучено {l.known}</span>}
                          {l.weak > 0 && <span>⚠️ слабых {l.weak}</span>}
                          {l.answers > 0 && <span>🎯 {l.avg_accuracy}%</span>}
                        </span>

                        {l.employee_count > 0 && (
                          <span className="lcard__bar" style={{ display: 'block' }}>
                            <Bar percent={l.percent} />
                          </span>
                        )}

                        <span className="muted small" style={{ display: 'block', marginTop: 6 }}>
                          {l.employee_count === 0 ? 'профиль пустой' : lastStudiedText(l.last_studied)}
                        </span>
                      </span>

                      <span style={{ flex: 'none', alignSelf: 'center' }}>
                        {l.is_active
                          ? <span className="badge badge--known">активен</span>
                          : <span className="muted small">выбрать ›</span>}
                      </span>
                    </button>

                    {/* ---------- управление профилем ---------- */}
                    <button
                      className="lcard__more"
                      onClick={() => setOpenActs(openActs === l.id ? null : l.id)}
                      aria-expanded={openActs === l.id}
                    >
                      {openActs === l.id ? 'Скрыть управление ⌃' : '⚙️ Управление профилем ⌄'}
                    </button>

                    {openActs === l.id && (
                      <div className="lcard__acts">
                        <button className="btn btn--sm" disabled={busy} onClick={() => startEdit(l)}>
                          ✏️ Переименовать
                        </button>

                        <Link to={`/share?list=${l.id}`} className="btn btn--sm">
                          🤝 Поделиться
                        </Link>

                        <button
                          className="btn btn--sm"
                          disabled={busy || l.answers === 0}
                          title={l.answers === 0 ? 'В этом профиле ещё нет ответов' : ''}
                          onClick={() => {
                            if (!window.confirm(
                              `Обнулить прогресс профиля «${l.name}»?\n\n` +
                              `Сотрудники (${l.employee_count} чел.) останутся, но проценты, серии ` +
                              `и история ответов начнутся с нуля. Другие профили не изменятся.`
                            )) return
                            void run(async () => {
                              const n = await resetListProgress(l.id)
                              setNote(`Прогресс профиля «${l.name}» обнулён: ${n} чел. начинают заново.`)
                            })
                          }}
                        >
                          🔄 Сбросить прогресс
                        </button>

                        <button
                          className="btn btn--sm"
                          disabled={busy || l.employee_count === 0}
                          onClick={() => {
                            if (!window.confirm(
                              `Удалить всех сотрудников из профиля «${l.name}»?\n\n` +
                              `Будет удалено: ${l.employee_count} чел. вместе с их прогрессом. Сам профиль останется.`
                            )) return
                            void run(async () => {
                              const n = await clearList(l.id)
                              setNote(`Из профиля «${l.name}» удалено ${n} чел.`)
                            })
                          }}
                        >
                          🧹 Очистить
                        </button>

                        <div className="spacer" />

                        <button
                          className="btn btn--sm btn--ghost"
                          disabled={busy || lists.length <= 1}
                          title={lists.length <= 1 ? 'Единственный профиль удалить нельзя' : ''}
                          onClick={() => {
                            if (!window.confirm(
                              `Удалить профиль «${l.name}» полностью?\n\n` +
                              `Вместе с ним исчезнут ${l.employee_count} чел., весь их прогресс ` +
                              `и коды приглашения этого профиля. Отменить будет нельзя.`
                            )) return
                            void run(() => deleteList(l.id), `Профиль «${l.name}» удалён.`)
                          }}
                        >
                          🗑 Удалить
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ================= 3. НОВЫЙ ПРОФИЛЬ ================= */}
          <div className="section">
            <h3 className="section__title">Новый профиль</h3>
            <p className="section__sub">Пустой список, который сразу станет активным.</p>
          </div>

          <div className="card">
            {creating ? (
              <>
                <label className="label" htmlFor="new-name">Название</label>
                <input
                  id="new-name"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Соседний филиал"
                  maxLength={60}
                  autoFocus
                />
                <div className="label" style={{ marginTop: 12 }}>Значок</div>
                <EmojiPicker value={newEmoji} onPick={setNewEmoji} />

                <p className="muted small" style={{ marginTop: 12 }}>
                  Сотрудников в него можно загрузить из файла, добавить вручную или получить по коду от коллеги.
                </p>

                <div className="grid grid-2">
                  <button
                    className="btn btn--primary btn--block"
                    disabled={busy || newName.trim() === ''}
                    onClick={() => void run(
                      async () => {
                        await createList(newName, newEmoji)
                        setNewName('')
                        setNewEmoji('📋')
                        setCreating(false)
                      },
                      'Профиль создан и выбран активным.'
                    )}
                  >
                    Создать
                  </button>
                  <button className="btn btn--ghost btn--block" onClick={() => setCreating(false)}>
                    Отмена
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn--primary btn--block btn--lg" onClick={() => setCreating(true)}>
                ➕ Добавить профиль
              </button>
            )}
          </div>

          {/* ================= 4. СПРАВКА И ОБЩИЙ СБРОС ================= */}
          <div style={{ marginTop: 18 }}>
            <AboutProfiles />
          </div>

          {lists.some((l) => l.answers > 0) && (
            <p className="center" style={{ marginTop: 16 }}>
              <button
                className="btn btn--sm btn--ghost"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(
                    'Обнулить прогресс СРАЗУ ВО ВСЕХ профилях?\n\n' +
                    'Сотрудники останутся, но вся история ответов исчезнет. Отменить будет нельзя.'
                  )) return
                  void run(async () => {
                    const n = await resetProgressEverywhere()
                    setNote(`Прогресс обнулён во всех профилях: ${n} чел.`)
                  })
                }}
              >
                Сбросить прогресс во всех профилях
              </button>
            </p>
          )}

          <p className="muted small center" style={{ marginTop: 14 }}>
            Прогресс, статистика и график считаются отдельно для каждого профиля:
            переключение ничего не стирает.
          </p>
        </div>
      )}
    </div>
  )
}
