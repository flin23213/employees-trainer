// Путь: src/lib/share.ts
// Работа с кодами приглашения: создать, посмотреть свои, отключить, активировать.
//
// Новое в этой версии: у кода есть профиль-источник. Перед созданием кода
// человек выбирает, КАКИМ списком делится, и это видно и в карточке кода,
// и получателю до применения (функция preview_share_code из 06_share_by_profile.sql).

import { supabase } from './supabase'

export type ShareCode = {
  code: string
  title: string | null
  employee_count: number
  uses: number
  max_uses: number | null
  expires_at: string | null
  revoked: boolean
  created_at: string
  list_id: string | null
}

export type RedeemResult = {
  added: number
  total_in_code: number
  skipped: number
  list_name: string | null
}

/** Что внутри кода, ещё до его применения */
export type CodePreview = {
  found: boolean
  alive?: boolean
  reason?: string
  title?: string | null
  list_name?: string | null
  employee_count?: number
  is_mine?: boolean
  uses?: number
  max_uses?: number | null
  expires_at?: string | null
}

/** Убираем пробелы и дефисы, приводим к верхнему регистру: 'abcd-1234' -> 'ABCD1234' */
export function normalizeCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/** Показываем код как 'ABCD-1234': так его проще прочитать и продиктовать */
export function formatCode(code: string): string {
  const clean = normalizeCode(code)
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

/** Понятные сообщения вместо технических */
function humanize(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('failed to fetch')) return 'Нет связи с сервером. Проверьте интернет.'
  if (m.includes('preview_share_code') && m.includes('does not exist'))
    return 'В базе не хватает функции проверки кода. Запустите файл 06_share_by_profile.sql в Supabase.'
  if (m.includes('p_list_id') || (m.includes('create_share_code') && m.includes('does not exist')))
    return 'В базе старая версия кодов. Запустите файлы 05_progress.sql и 06_share_by_profile.sql в Supabase.'
  if (m.includes('function') && m.includes('does not exist'))
    return 'В базе не хватает функций для кодов. Запустите файл 03_share.sql в Supabase.'
  if (m.includes('relation') && m.includes('does not exist'))
    return 'В базе нет таблицы кодов. Запустите файл 03_share.sql в Supabase.'
  if (m.includes('column') && m.includes('list_id'))
    return 'В таблице кодов нет профиля-источника. Запустите файл 06_share_by_profile.sql в Supabase.'
  return message
}

/**
 * Создать новый код.
 *  days    = null означает «без срока»
 *  maxUses = null означает «без ограничений»
 *  listId  = null означает «активный профиль»
 */
export async function createShareCode(opts: {
  maxUses: number | null
  days: number | null
  title?: string | null
  listId?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_share_code', {
    p_max_uses: opts.maxUses,
    p_days: opts.days,
    p_title: opts.title ?? null,
    p_list_id: opts.listId ?? null,
  })

  if (error) throw new Error(humanize(error.message))
  return String(data)
}

/** Мои коды, свежие сверху */
export async function listShareCodes(): Promise<ShareCode[]> {
  const { data, error } = await supabase
    .from('share_codes')
    .select('code, title, employee_count, uses, max_uses, expires_at, revoked, created_at, list_id')
    .order('created_at', { ascending: false })

  if (error) throw new Error(humanize(error.message))
  return (data ?? []) as ShareCode[]
}

/** Отключить код: им больше нельзя воспользоваться */
export async function revokeShareCode(code: string): Promise<void> {
  const { error } = await supabase
    .from('share_codes')
    .update({ revoked: true })
    .eq('code', normalizeCode(code))

  if (error) throw new Error(humanize(error.message))
}

/** Удалить код совсем */
export async function deleteShareCode(code: string): Promise<void> {
  const { error } = await supabase.from('share_codes').delete().eq('code', normalizeCode(code))
  if (error) throw new Error(humanize(error.message))
}

/** Посмотреть, что внутри кода, НЕ применяя его */
export async function previewShareCode(code: string): Promise<CodePreview> {
  const { data, error } = await supabase.rpc('preview_share_code', { p_code: normalizeCode(code) })
  if (error) throw new Error(humanize(error.message))
  return data as CodePreview
}

/** Активировать чужой код: список сотрудников копируется в ваш активный профиль */
export async function redeemShareCode(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('redeem_share_code', { p_code: normalizeCode(code) })

  if (error) throw new Error(humanize(error.message))
  return data as RedeemResult
}

/** Осталось ли у кода «здоровье»: не отключён, не просрочен, не исчерпан */
export function codeState(c: ShareCode): { alive: boolean; label: string; tone: 'ok' | 'warn' | 'dead' } {
  if (c.revoked) return { alive: false, label: 'отключён', tone: 'dead' }
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { alive: false, label: 'просрочен', tone: 'dead' }
  if (c.max_uses !== null && c.uses >= c.max_uses) return { alive: false, label: 'исчерпан', tone: 'dead' }
  if (c.expires_at) {
    const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 3) return { alive: true, label: `осталось ${daysLeft} дн.`, tone: 'warn' }
    return { alive: true, label: `действует ${daysLeft} дн.`, tone: 'ok' }
  }
  return { alive: true, label: 'действует', tone: 'ok' }
}
