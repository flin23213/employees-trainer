// Путь: src/lib/employees.ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { EmployeeWithProgress, Stats } from '../types'

/** Забираем всех сотрудников с прогрессом, по алфавиту */
export async function fetchEmployees(): Promise<EmployeeWithProgress[]> {
  const { data, error } = await supabase
    .from('employee_queue')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as EmployeeWithProgress[]
}

/** Считаем сводку для главного экрана прямо в браузере: строк мало, это быстро */
export function computeStats(list: EmployeeWithProgress[]): Stats {
  const total = list.length
  const known = list.filter((e) => e.status === 'known').length
  const weak = list.filter((e) => e.status === 'weak').length
  const fresh = list.filter((e) => e.status === 'new').length
  const learning = total - known - weak - fresh

  const answered = list.filter((e) => e.attempts > 0)
  const avgAccuracy =
    answered.length === 0
      ? 0
      : Math.round(answered.reduce((sum, e) => sum + e.accuracy, 0) / answered.length)

  return {
    total,
    known,
    learning,
    weak,
    fresh,
    avgAccuracy,
    progressPercent: total === 0 ? 0 : Math.round((known / total) * 100),
  }
}

/**
 * Хук: загружает список сотрудников и следит за состоянием загрузки.
 * Использование:  const { list, loading, error, reload } = useEmployees()
 */
export function useEmployees() {
  const [list, setList] = useState<EmployeeWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setList(await fetchEmployees())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { list, loading, error, reload }
}

/** Подписи статусов на русском + класс для цветного значка */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  new:      { label: 'Не изучен',    className: 'badge badge--new' },
  weak:     { label: 'Слабое место', className: 'badge badge--weak' },
  learning: { label: 'В процессе',   className: 'badge badge--learn' },
  known:    { label: 'Выучен',       className: 'badge badge--known' },
}/* ---------- Добавление, изменение, удаление ---------- */

/** Данные для записи. Пустые необязательные поля превращаем в null */
export type EmployeeInput = {
  full_name: string
  job_title: string
  department: string | null
  description: string | null
  notes: string | null
}

/** Переводим технические ошибки базы на человеческий язык */
function friendlyDbError(message: string, code?: string): string {
  if (code === '23505' || message.includes('duplicate key')) {
    return 'Сотрудник с таким ФИО уже есть в списке.'
  }
  if (message.includes('violates check constraint')) {
    return 'ФИО и должность не могут быть пустыми.'
  }
  if (message.includes('Failed to fetch')) {
    return 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
  }
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'Нет прав на это действие. Попробуйте выйти и войти заново.'
  }
  return message
}

/** Добавить нового сотрудника. Столбец user_id база подставит сама */
export async function createEmployee(input: EmployeeInput): Promise<void> {
  const { error } = await supabase.from('employees').insert(input)
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}

/** Изменить существующего. Чужую строку изменить невозможно: не даст RLS */
export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  const { error } = await supabase.from('employees').update(input).eq('id', id)
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}

/** Удалить сотрудника. Его прогресс удалится автоматически (on delete cascade) */
export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}/* ---------- Импорт: запись пачкой ---------- */

export type ImportResult = {
  inserted: number
  failures: { name: string; reason: string }[]
}

/**
 * Пишем сотрудников порциями по 50. Если порция не прошла целиком,
 * пробуем построчно, чтобы одна плохая строка не срывала весь импорт.
 */
export async function insertEmployees(rows: EmployeeInput[]): Promise<ImportResult> {
  const failures: ImportResult['failures'] = []
  let inserted = 0
  const CHUNK = 50

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('employees').insert(chunk)

    if (!error) {
      inserted += chunk.length
      continue
    }

    for (const row of chunk) {
      const { error: single } = await supabase.from('employees').insert(row)
      if (single) failures.push({ name: row.full_name, reason: friendlyDbError(single.message, single.code) })
      else inserted++
    }
  }

  return { inserted, failures }
}
/* ---------- Обучение ---------- */

/**
 * Записываем ответ. Всю арифметику (попытки, серия, дата) делает функция
 * record_answer внутри базы, поэтому испортить статистику из браузера нельзя.
 */
export async function recordAnswer(employeeId: string, correct: boolean): Promise<void> {
  const { error } = await supabase.rpc('record_answer', {
    p_employee_id: employeeId,
    p_correct: correct,
  })
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}

/** Перемешать массив (алгоритм Фишера-Йетса) */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export type SessionMode = 'priority' | 'all' | 'review'

/**
 * Собираем «колоду» на одно занятие.
 *  priority — умный порядок: сначала незнакомые и забытые (кнопка «Начать обучение»)
 *  all      — все подряд в случайном порядке (кнопка «Карточки»)
 *  review   — только слабые места (кнопка «Повторить ошибки»)
 */
export function buildSession(
  list: EmployeeWithProgress[],
  mode: SessionMode,
  size = 20
): EmployeeWithProgress[] {
  if (mode === 'all') return shuffle(list)

  if (mode === 'review') {
    const weak = list.filter(
      (e) => e.attempts > 0 && (e.status === 'weak' || e.accuracy < 60 || e.last_result === false)
    )
    return [...weak].sort((a, b) => b.priority - a.priority).slice(0, size)
  }

  // priority: берём самых «срочных», но внутри порции перемешиваем,
  // чтобы порядок не был каждый раз одинаковым
  const sorted = [...list].sort((a, b) => b.priority - a.priority).slice(0, size)
  return shuffle(sorted)
}
/* ---------- Статистика по отделам ---------- */

export type DeptStats = {
  department: string
  total: number
  known: number
  weak: number
  fresh: number
  avgAccuracy: number
  percent: number        // доля выученных
}

export function computeDepartmentStats(list: EmployeeWithProgress[]): DeptStats[] {
  const groups = new Map<string, EmployeeWithProgress[]>()

  for (const e of list) {
    const key = e.department?.trim() || 'Без отдела'
    const bucket = groups.get(key)
    if (bucket) bucket.push(e)
    else groups.set(key, [e])
  }

  const result: DeptStats[] = []

  groups.forEach((members, department) => {
    const known = members.filter((e) => e.status === 'known').length
    const weak = members.filter((e) => e.status === 'weak').length
    const fresh = members.filter((e) => e.status === 'new').length
    const answered = members.filter((e) => e.attempts > 0)

    result.push({
      department,
      total: members.length,
      known,
      weak,
      fresh,
      avgAccuracy: answered.length === 0
        ? 0
        : Math.round(answered.reduce((s, e) => s + e.accuracy, 0) / answered.length),
      percent: Math.round((known / members.length) * 100),
    })
  })

  // Слабые отделы наверх: так видно, на что налечь
  return result.sort((a, b) => a.percent - b.percent || a.department.localeCompare(b.department, 'ru'))
}

/* ---------- Сброс прогресса ---------- */

const EMPTY_PROGRESS = {
  attempts: 0,
  correct_count: 0,
  incorrect_count: 0,
  streak: 0,
  last_result: null,
  last_reviewed_at: null,
}

/**
 * Сбросить статистику по всем сотрудникам. Сами сотрудники остаются.
 * Фильтр .gte('attempts', 0) выглядит бессмысленным (он всегда верен),
 * но Supabase из осторожности не выполняет обновление вообще без условия,
 * чтобы никто случайно не переписал всю таблицу.
 */
export async function resetAllProgress(): Promise<void> {
  const { error } = await supabase.from('employee_progress').update(EMPTY_PROGRESS).gte('attempts', 0)
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}

/** Сбросить статистику одного сотрудника */
export async function resetEmployeeProgress(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_progress')
    .update(EMPTY_PROGRESS)
    .eq('employee_id', employeeId)
  if (error) throw new Error(friendlyDbError(error.message, error.code))
}