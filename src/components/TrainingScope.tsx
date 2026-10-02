import { useState } from 'react'
import Icon from './Icon'
import { ALL_TRAINING_EMPLOYEES, filterTrainingEmployees, hasTrainingFilter, trainingDepartments, type TrainingScopeValue } from '../lib/trainingScope'
import type { EmployeeWithProgress } from '../types'
import '../styles/training.css'

type Props = { employees: EmployeeWithProgress[]; value: TrainingScopeValue; onChange: (value: TrainingScopeValue) => void; disabled?: boolean }

export default function TrainingScope({ employees, value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState('')
  const selected = filterTrainingEmployees(employees, value)
  const candidates = filterTrainingEmployees(employees, { ...value, employeeIds: null })
  const departments = trainingDepartments(employees)
  const search = query.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
  const visible = candidates.filter(person => `${person.full_name} ${person.job_title}`.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').includes(search))
  const selectedIds = new Set(value.employeeIds ?? [])
  function reset() { onChange(ALL_TRAINING_EMPLOYEES); setQuery('') }

  return <details className="training-scope">
    <summary><span><strong>Кого учить</strong><span className="training-scope__count">{selected.length} из {employees.length} сотрудников{hasTrainingFilter(value) ? ' · выбран состав' : ' · весь список'}</span></span><span className="training-scope__chevron"><Icon name="chevron" /></span></summary>
    <fieldset className="training-scope__body" disabled={disabled}>
      <label className="training-scope__field">Отдел<select className="input" value={value.department === null ? 'all' : `dept:${value.department}`} onChange={event => onChange({ ...value, department: event.target.value === 'all' ? null : event.target.value.slice(5) })}>
        <option value="all">Все отделы</option>{departments.map(department => <option key={department.key} value={`dept:${department.key}`}>{department.label} · {department.count}</option>)}
      </select></label>
      <label className="training-scope__check"><input type="checkbox" checked={value.onlyNew} onChange={event => onChange({ ...value, onlyNew: event.target.checked })} /><span>Только новые сотрудники<small>Те, кого вы ещё не повторяли</small></span></label>
      <label className="training-scope__check"><input type="checkbox" checked={value.employeeIds !== null} onChange={event => onChange({ ...value, employeeIds: event.target.checked ? candidates.map(person => person.id) : null })} /><span>Выбрать конкретных сотрудников</span></label>
      {value.employeeIds !== null && <div className="training-scope__people">
        <label className="training-scope__field">Поиск по имени или должности<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="training-scope__actions"><button type="button" className="btn btn--ghost" onClick={() => onChange({ ...value, employeeIds: candidates.map(person => person.id) })}>Выбрать всех подходящих</button><button type="button" className="btn btn--ghost" onClick={() => onChange({ ...value, employeeIds: [] })}>Очистить выбор</button></div>
        <div className="training-scope__list" role="group" aria-label="Сотрудники для тренировки">{visible.length ? visible.map(person => <label className="training-scope__person" key={person.id}><input type="checkbox" checked={selectedIds.has(person.id)} onChange={event => onChange({ ...value, employeeIds: event.target.checked ? [...selectedIds, person.id] : [...selectedIds].filter(id => id !== person.id) })} /><span><strong>{person.full_name}</strong><small>{person.job_title || 'Должность не указана'}</small></span></label>) : <p className="small muted">{candidates.length ? 'По поиску никто не найден.' : 'По этим фильтрам сотрудников нет.'}</p>}</div>
      </div>}
      {hasTrainingFilter(value) && <button type="button" className="btn btn--ghost training-scope__reset" onClick={reset}>Сбросить выбор сотрудников</button>}
      {selected.length === 0 && <p className="small answer-wrong" role="status">Никто не выбран. Измените фильтры или сбросьте выбор.</p>}
    </fieldset>
  </details>
}
