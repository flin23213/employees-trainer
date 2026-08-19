// Путь: src/components/EmployeeForm.tsx
import { useEffect, useState } from 'react'
import { createEmployee, deleteEmployee, updateEmployee, type EmployeeInput } from '../lib/employees'
import type { EmployeeWithProgress } from '../types'

type Props = {
  employee: EmployeeWithProgress | null  // null = добавляем нового
  onClose: () => void                    // закрыть без сохранения
  onSaved: () => void                    // сохранили: обновить список и закрыть
}

/** Пустая строка -> null, чтобы в базе не появлялись «пустые, но не пустые» значения */
const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim())

export default function EmployeeForm({ employee, onClose, onSaved }: Props) {
  const isNew = employee === null

  // Все поля храним как обычный текст, в null превращаем только при сохранении
  const [fullName, setFullName]     = useState(employee?.full_name ?? '')
  const [jobTitle, setJobTitle]     = useState(employee?.job_title ?? '')
  const [department, setDepartment] = useState(employee?.department ?? '')
  const [description, setDescription] = useState(employee?.description ?? '')
  const [notes, setNotes]           = useState(employee?.notes ?? '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Пока окно открыто: блокируем прокрутку страницы под ним и слушаем Escape
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (fullName.trim() === '' || jobTitle.trim() === '') {
      setError('ФИО и должность заполнить обязательно. Остальное по желанию.')
      return
    }

    const input: EmployeeInput = {
      full_name: fullName.trim().replace(/\s+/g, ' '),   // убираем двойные пробелы
      job_title: jobTitle.trim().replace(/\s+/g, ' '),
      department: orNull(department),
      description: orNull(description),
      notes: orNull(notes),
    }

    setBusy(true)
    try {
      if (isNew) await createEmployee(input)
      else await updateEmployee(employee.id, input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!employee) return
    setBusy(true)
    setError(null)
    try {
      await deleteEmployee(employee.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    // Клик по затемнению закрывает окно, клик внутри окна — нет
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <h2 className="modal__title">{isNew ? 'Новый сотрудник' : 'Редактирование'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="f-name">ФИО *</label>
            <input
              id="f-name" className="input" value={fullName} autoFocus={isNew}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="f-title">Должность *</label>
            <input
              id="f-title" className="input" value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Старший менеджер"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="f-dept">Отдел</label>
            <input
              id="f-dept" className="input" value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Продажи"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="f-desc">Чем занимается</label>
            <textarea
              id="f-desc" className="textarea" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Работает с ключевыми клиентами и контролирует работу менеджеров"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="f-notes">Дополнительная информация</label>
            <textarea
              id="f-notes" className="textarea" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Любая заметка: где сидит, когда лучше писать"
            />
          </div>

          {error && <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Статистика по этому сотруднику, если он уже участвовал в тестах */}
          {!isNew && employee.attempts > 0 && (
            <p className="muted small" style={{ marginBottom: 12 }}>
              Статистика: ответов {employee.attempts}, точность {employee.accuracy}%
            </p>
          )}

          <div className="stack">
            <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={busy}>
              {busy ? 'Сохраняю...' : 'Сохранить'}
            </button>

            {!isNew && !confirmDelete && (
              <button type="button" className="btn btn--danger btn--block" disabled={busy}
                      onClick={() => setConfirmDelete(true)}>
                Удалить
              </button>
            )}

            {!isNew && confirmDelete && (
              <div className="card answer-wrong">
                <p className="small" style={{ marginBottom: 10 }}>
                  Удалить <strong>{employee.full_name}</strong> вместе со статистикой? Отменить будет нельзя.
                </p>
                <div className="row">
                  <button type="button" className="btn btn--danger btn--sm" onClick={handleDelete} disabled={busy}>
                    Да, удалить
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <button type="button" className="btn btn--ghost btn--block" onClick={onClose} disabled={busy}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}