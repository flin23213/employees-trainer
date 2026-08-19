// Путь: src/screens/EmployeesScreen.tsx
import { useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import EmployeeForm from '../components/EmployeeForm'
import { STATUS_META, useEmployees } from '../lib/employees'
import type { EmployeeWithProgress } from '../types'
import { Link } from 'react-router-dom'

type SortKey = 'name-asc' | 'name-desc' | 'title' | 'accuracy' | 'priority'

/** Что сейчас открыто в форме: ничего, новый сотрудник, или конкретный сотрудник */
type Editing = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; employee: EmployeeWithProgress }

export default function EmployeesScreen() {
  const { list, loading, error, reload } = useEmployees()
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('all')
  const [sort, setSort] = useState<SortKey>('name-asc')
  const [editing, setEditing] = useState<Editing>({ mode: 'closed' })

  const departments = useMemo(() => {
    const set = new Set<string>()
    list.forEach((e) => { if (e.department) set.add(e.department) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [list])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = list.filter((e) => {
      const matchesQuery =
        q === '' ||
        e.full_name.toLowerCase().includes(q) ||
        e.job_title.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)

      const matchesDept =
        dept === 'all' || (dept === 'none' ? !e.department : e.department === dept)

      return matchesQuery && matchesDept
    })

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name-desc': return b.full_name.localeCompare(a.full_name, 'ru')
        case 'title':     return a.job_title.localeCompare(b.job_title, 'ru')
        case 'accuracy':  return a.accuracy - b.accuracy
        case 'priority':  return b.priority - a.priority
        default:          return a.full_name.localeCompare(b.full_name, 'ru')
      }
    })
  }, [list, query, dept, sort])

  /** Сохранили или удалили: обновляем список и закрываем окно */
  function handleSaved() {
    setEditing({ mode: 'closed' })
    reload()
  }

  return (
    <div className="container container--wide fade-in">
      <AppHeader title="Сотрудники" back />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 10 }}>
          <input
            className="input"
            type="search"
            placeholder="Поиск по ФИО, должности или отделу"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="label" htmlFor="dept">Отдел</label>
            <select id="dept" className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">Все отделы</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              <option value="none">Без отдела</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sort">Сортировка</label>
            <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="name-asc">ФИО: А → Я</option>
              <option value="name-desc">ФИО: Я → А</option>
              <option value="title">По должности</option>
              <option value="accuracy">Хуже всего знаю</option>
              <option value="priority">Пора повторить</option>
            </select>
          </div>
        </div>

        <div className="grid grid-2">
          <button className="btn btn--primary btn--block" onClick={() => setEditing({ mode: 'new' })}>
            + Добавить
          </button>
          <Link to="/import" className="btn btn--block">📂 Импорт из файла</Link>
        </div>
      </div>

      {loading && <div className="card center muted">Загружаю...</div>}
      {error && <div className="card answer-wrong">Ошибка: {error}</div>}

      {!loading && !error && (
        <>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Показано: {visible.length} из {list.length}. Нажмите на карточку, чтобы изменить.
          </p>

          {visible.length === 0 ? (
            <div className="card center muted">
              {list.length === 0
                ? 'Список пуст. Добавьте первого сотрудника кнопкой выше.'
                : 'Ничего не найдено. Попробуйте изменить поиск или фильтр.'}
            </div>
          ) : (
            <div className="stack">
              {visible.map((e) => {
                const meta = STATUS_META[e.status] ?? STATUS_META.new
                return (
                  <div
                    className="card card--clickable"
                    key={e.id}
                    onClick={() => setEditing({ mode: 'edit', employee: e })}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: '1.05rem' }}>{e.full_name}</strong>
                        <div className="muted">{e.job_title}</div>
                      </div>
                      <span className={meta.className}>{meta.label}</span>
                    </div>

                    {e.department && <div className="small muted" style={{ marginTop: 6 }}>🏢 {e.department}</div>}
                    {e.description && <div className="small" style={{ marginTop: 8 }}>{e.description}</div>}
                    {e.notes && <div className="small muted" style={{ marginTop: 6 }}>📝 {e.notes}</div>}

                    {e.attempts > 0 && (
                      <div className="small muted" style={{ marginTop: 10 }}>
                        Ответов: {e.attempts} · верно {e.correct_count} · точность {e.accuracy}%
                        {e.streak > 0 && ` · подряд ${e.streak}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Плавающая круглая кнопка «добавить» — удобно, когда список и вы внизу */}
      <button
        className="btn btn--primary fab"
        onClick={() => setEditing({ mode: 'new' })}
        aria-label="Добавить сотрудника"
      >
        <span className="fab__icon" aria-hidden="true">+</span>
      </button>

      {/* Форма показывается только когда что-то редактируем */}
      {editing.mode !== 'closed' && (
        <EmployeeForm
          employee={editing.mode === 'edit' ? editing.employee : null}
          onClose={() => setEditing({ mode: 'closed' })}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}