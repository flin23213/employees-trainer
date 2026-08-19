// Путь: src/screens/ListsScreen.tsx
// Профили списков: переключение, создание, переименование, очистка, удаление.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import {
  LIST_EMOJI, clearList, createList, deleteList, renameList, setActiveList,
  useLists, type ListInfo,
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

export default function ListsScreen() {
  const { lists, active, loading, error, reload } = useLists()

  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📋')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('📋')

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
    setProblem(null)
    setNote(null)
  }

  return (
    <div className="container">
      <AppHeader title="Профили списков" back />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>Ошибка: {error}</div>}
      {loading && <div className="card center muted">Загружаю…</div>}

      {!loading && (
        <div className="stagger">
          {/* ---------- Пояснение ---------- */}
          <div className="card card--pad-lg brief__head">
            <span className="brief__emoji" aria-hidden="true">📚</span>
            <h2 className="brief__title">Несколько списков в одном аккаунте</h2>
            <p className="brief__what">
              Профиль — это отдельный список сотрудников со своим прогрессом. Например: «Мой отдел»,
              «Соседний филиал», «Новички». Приложение всегда работает с тем профилем, который выбран здесь.
            </p>
          </div>

          {active && (
            <div className="card active-list" style={{ marginTop: 14 }}>
              <span className="active-list__emoji">{active.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="muted small" style={{ display: 'block' }}>Сейчас активен</span>
                <strong className="truncate" style={{ display: 'block' }}>{active.name}</strong>
                <span className="muted small">{active.employee_count} чел.</span>
              </span>
              <Link to="/" className="btn btn--sm">На главную</Link>
            </div>
          )}

          {problem && <div className="card answer-wrong small shake" style={{ marginTop: 12 }}>{problem}</div>}
          {note && <div className="card answer-correct small" style={{ marginTop: 12 }}>{note}</div>}

          {/* ---------- Список профилей ---------- */}
          <div className="section">
            <h3 className="section__title">Все профили · {lists.length}</h3>
            <p className="section__sub">Нажмите на профиль, чтобы переключиться на него.</p>
          </div>

          <div className="stack" style={{ gap: 10 }}>
            {lists.map((l) => (
              <div key={l.id} className={'card list-card' + (l.is_active ? ' is-active' : '')}>
                {editId === l.id ? (
                  /* ----- режим редактирования ----- */
                  <>
                    <label className="label" htmlFor={'name-' + l.id}>Название</label>
                    <input
                      id={'name-' + l.id}
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
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
                  </>
                ) : (
                  /* ----- обычный вид ----- */
                  <>
                    <button
                      className="list-card__main"
                      disabled={busy || l.is_active}
                      onClick={() => void run(() => setActiveList(l.id), `Переключился на «${l.name}».`)}
                    >
                      <span className="list-card__emoji">{l.emoji}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="list-card__name truncate">{l.name}</span>
                        <span className="muted small" style={{ display: 'block' }}>
                          {l.employee_count} чел.
                          {l.is_active ? ' · активен' : ''}
                        </span>
                      </span>
                      {l.is_active
                        ? <span className="badge badge--known">✓</span>
                        : <span className="muted" aria-hidden="true">выбрать ›</span>}
                    </button>

                    <div className="row list-card__acts">
                      <button className="btn btn--sm" disabled={busy} onClick={() => startEdit(l)}>
                        ✏️ Переименовать
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
                            `Вместе с ним исчезнут ${l.employee_count} чел. и весь их прогресс. Отменить будет нельзя.`
                          )) return
                          void run(() => deleteList(l.id), `Профиль «${l.name}» удалён.`)
                        }}
                      >
                        🗑 Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ---------- Новый профиль ---------- */}
          <div className="section">
            <h3 className="section__title">Новый профиль</h3>
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
                  Новый профиль сразу станет активным и будет пустым — сотрудников в него можно
                  загрузить из файла или добавить вручную.
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

          <p className="muted small center" style={{ marginTop: 18 }}>
            Прогресс, статистика и график считаются отдельно для каждого профиля:
            переключение ничего не стирает.
          </p>
        </div>
      )}
    </div>
  )
}
