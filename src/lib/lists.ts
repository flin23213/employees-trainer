// Путь: src/lib/lists.ts
// Профили: независимые списки сотрудников внутри одного аккаунта.
// Приложение всегда работает с ОДНИМ активным профилем — так устроено
// представление в базе, поэтому остальным экранам ничего знать не нужно.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type ListInfo = {
  id: string
  name: string
  emoji: string
  created_at: string
  employee_count: number
  is_active: boolean
}

/** Понятные сообщения вместо технических */
function humanize(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('failed to fetch')) return 'Нет связи с сервером. Проверьте интернет.'
  if (m.includes('does not exist'))
    return 'В базе не хватает таблиц для профилей. Запустите файл 04_lists.sql в Supabase.'
  return message
}

/** Все профили с числом сотрудников и отметкой активного */
export async function fetchLists(): Promise<ListInfo[]> {
  const { data, error } = await supabase.rpc('list_overview')
  if (error) throw new Error(humanize(error.message))

  return (data ?? []).map((row: ListInfo) => ({
    ...row,
    employee_count: Number(row.employee_count),
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
