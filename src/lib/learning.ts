import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { LearningEmployee } from './dailyPlan'

export async function fetchLearning() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const [queue, answers] = await Promise.all([
    supabase.from('learning_queue').select('*').order('full_name'),
    supabase.from('study_answers').select('employee_id').gte('answered_at', start.toISOString()),
  ])
  if (queue.error || answers.error) throw new Error('Не удалось загрузить план. Проверьте соединение и попробуйте снова.')
  return { rows: (queue.data ?? []) as LearningEmployee[], answered: (answers.data ?? []).map(a => String(a.employee_id)) }
}

export function useLearning() {
  const [data, setData] = useState<{rows: LearningEmployee[]; answered: string[]}>({ rows: [], answered: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await fetchLearning()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить план') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let alive=true
    void fetchLearning().then(value=>{if(alive)setData(value)}).catch(()=>{if(alive)setError('Не удалось загрузить план. Попробуйте ещё раз.')}).finally(()=>{if(alive)setLoading(false)})
    return ()=>{alive=false}
  }, [])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void reload() }
    document.addEventListener('visibilitychange', onVisible)
    let day=new Date().toDateString()
    const timer=setInterval(()=>{const next=new Date().toDateString();if(next!==day){day=next;void reload()}},60000)
    return () => { document.removeEventListener('visibilitychange', onVisible);clearInterval(timer) }
  }, [reload])
  return { ...data, loading, error, reload }
}
