import { supabase } from './supabase'
import type { GameMode } from './gameEngine'

export type NewGameRun = { id: string; list_id: string; mode: GameMode; item_count: number; elapsed_ms: number; mistakes: number; time_limit_s: number }
export type GameRun = NewGameRun & { score_ms: number; created_at: string }
export async function saveGameRun(run: NewGameRun) {
  const { error } = await supabase.from('game_runs').insert(run)
  // A retry after a lost response uses the same id and must not create another run.
  if (!error) return
  if (error.code === '23505') {
    const { data } = await supabase.from('game_runs').select('id').eq('id', run.id).maybeSingle()
    if (data) return
  }
  throw new Error('Не удалось сохранить результат. Проверьте соединение и нажмите «Повторить сохранение».')
}
export async function fetchGameRuns(listId: string, mode: GameMode, count: number, timeLimit: number, sort: 'best' | 'recent' = 'best'): Promise<GameRun[]> {
  const { data, error } = await supabase.from('game_runs').select('id,list_id,mode,item_count,elapsed_ms,mistakes,time_limit_s,score_ms,created_at')
    .eq('list_id', listId).eq('mode', mode).eq('item_count', count).eq('time_limit_s', timeLimit)
    .order(sort === 'best' ? 'score_ms' : 'created_at', { ascending: sort === 'best' }).order('created_at', { ascending: false }).limit(20)
  if (error) throw new Error('Не удалось загрузить личные результаты.')
  return (data ?? []) as GameRun[]
}
