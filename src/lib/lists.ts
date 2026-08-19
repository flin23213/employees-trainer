// Путь: src/lib/lists.ts
// Профили: независимые списки сотрудников внутри одного аккаунта.
// Приложение всегда работает с ОДНИМ активным профилем — так устроено
// представление в базе, поэтому остальным экранам ничего знать не нужно.
//
// Новое в этой версии: список профилей приходит сразу с прогрессом каждого
// (функция list_overview из файла 05_progress.sql), поэтому на экране профилей
// видно, где сколько выучено, и можно сбросить прогресс одного профиля.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type ListInfo = {
  id: string
  name: string
  emoji: string
  created_at: string
  employee_count: number
  is_active: boolean
  /* прогресс именно этого профиля */
  known: number         // выучено
  learning: number      // в процессе
  weak: number          // слабые места
  fresh: number         // ещё не спрашивали
  answers: number       // всего ответов
  correct: number       // из них верных
  avg_accuracy: number  // средняя точность, %
  percent: number       // доля выученных, %
  last_studied: string | null
}

/** Понятные сообщения вместо технических */
function humanize(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('failed to fetch')) return 'Нет связи с сервером. Проверьте интернет.'
  if (m.includes('reset_list_progress') && m.includes('does not exist'))
    return 'В базе не хватает функций прогресса. Запустите файл 05_progress.sql в Supabase.'
  if (m.includes('does not exist'))
    return 'В базе не хватает таблиц для профилей. Запустите файлы 04_lists.sql и 05_progress.sql в Supabase.'
  return message
}

/** Числа из базы приходят строками (bigint), поэтому приводим их сами */
function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Все профили: сотрудники, прогресс, отметка активного */
export async function fetchLists(): Promise<ListInfo[]> {
  const { data, error } = await supabase.rpc('list_overview')
  if (error) throw new Error(humanize(error.message))

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji ?? '📋'),
    created_at: String(row.created_at),
    is_active: Boolean(row.is_active),
    employee_count: toNumber(row.employee_count),
    known: toNumber(row.known),
    learning: toNumber(row.learning),
    weak: toNumber(row.weak),
    fresh: toNumber(row.fresh),
    answers: toNumber(row.answers),
    correct: toNumber(row.correct),
    avg_accuracy: toNumber(row.avg_accuracy),
    percent: toNumber(row.percent),
    last_studied: row.last_studied ? String(row.last_studied) : null,
  }))
}

export async function createList(name: string, emoji: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_list', { p_name: name, p_emoji: emoji })
  if (error) throw new Error(humanize(error.message))
  return String(data)
}

export async function setActiveList(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_active_list', { p_list_id: id })
  if (error) throw new Error(humanize(error.message))
}

export async function renameList(id: string, name: string, emoji: string): Promise<void> {
  const { error } = await supabase.rpc('rename_list', { p_list_id: id, p_name: name, p_emoji: emoji })
  if (error) throw new Error(humanize(error.message))
}

/** Удалить всех сотрудников профиля. Возвращает, сколько удалено */
export async function clearList(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('clear_list', { p_list_id: id })
  if (error) throw new Error(humanize(error.message))
  return Number(data ?? 0)
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_list', { p_list_id: id })
  if (error) throw new Error(humanize(error.message))
}

/**
 * Обнулить прогресс ОДНОГО профиля: сотрудники остаются, ответы и проценты
 * начинаются с нуля. Возвращает, сколько сотрудников затронуто.
 */
export async function resetListProgress(id: string): Promise<number> {
  const { data, error } = await supabase.rpc('reset_list_progress', { p_list_id: id })
  if (error) throw new Error(humanize(error.message))
  return Number(data ?? 0)
}

/** Обнулить прогресс сразу во всех профилях аккаунта */
export async function resetProgressEverywhere(): Promise<number> {
  const { data, error } = await supabase.rpc('reset_progress_everywhere')
  if (error) throw new Error(humanize(error.message))
  return Number(data ?? 0)
}

/** «Занимались вчера», «3 дня назад», «ещё не занимались» */
export function lastStudiedText(iso: string | null): string {
  if (!iso) return 'занятий ещё не было'

  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)
  const sameDay = then.toDateString() === new Date().toDateString()

  if (sameDay) return 'занимались сегодня'
  if (days <= 1) return 'занимались вчера'
  if (days < 7) return `занимались ${days} дн. назад`
  if (days < 30) return `занимались ${Math.floor(days / 7)} нед. назад`
  return 'занимались давно'
}

/** Хук со списком профилей: const { lists, active, loading, error, reload } = useLists() */
export function useLists() {
  const [lists, setLists] = useState<ListInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLists(await fetchLists())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const active = lists.find((l) => l.is_active) ?? null

  return { lists, active, loading, error, reload }
}

/** Значки, которые можно выбрать профилю */
export const LIST_EMOJI = ['📋', '🏢', '🏭', '🏥', '🏫', '🍽', '🛠', '💼', '🚀', '⭐', '📚', '🎬']
