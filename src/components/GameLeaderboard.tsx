import { useEffect, useState } from 'react'
import { fetchGameRuns, type GameRun } from '../lib/gameRuns'
import { formatTime, type GameMode } from '../lib/gameEngine'

export default function GameLeaderboard({ listId, mode, count, timeLimit, revision = 0 }: { listId: string; mode: GameMode; count: number; timeLimit: number; revision?: number }) {
  const [sort, setSort] = useState<'best' | 'recent'>('best')
  const [data, setData] = useState<{ key: string; rows: GameRun[]; error: string } | null>(null)
  const key = [listId, mode, count, timeLimit, revision, sort].join(':')
  useEffect(() => {
    let alive = true
    fetchGameRuns(listId, mode, count, timeLimit, sort).then(rows => { if (alive) setData({ key, rows, error: '' }) })
      .catch(() => { if (alive) setData({ key, rows: [], error: 'Не удалось загрузить результаты. Попробуйте позже.' }) })
    return () => { alive = false }
  }, [listId, mode, count, timeLimit, revision, sort, key])
  return <section className="leaderboard"><div className="section-heading"><h2>Личные результаты</h2></div>
    <div className="library-tabs" role="group" aria-label="Порядок результатов"><button className={sort === 'best' ? 'is-active' : ''} aria-pressed={sort === 'best'} onClick={() => setSort('best')}>Лучшие</button><button className={sort === 'recent' ? 'is-active' : ''} aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Последние</button></div>
    <p className="small muted">Этот список · заданий: {count} · лимит {timeLimit} с. Итог включает +3 с за каждую ошибку.</p>
    {data?.key !== key ? <p role="status">Загружаю…</p> : data.error ? <p role="alert">{data.error}</p> : !data.rows.length ? <div className="empty-records">Здесь будет ваш первый результат. Завершите игру!</div> : <>
      <div className="record-summary"><span>{sort === 'best' ? 'Лучшее время' : 'Последняя игра'}</span><strong>{formatTime(data.rows[0].score_ms)}</strong></div>
      <ol className="record-list">{data.rows.map(run => <li key={run.id}><span><strong>{formatTime(run.score_ms)}</strong><small>{new Date(run.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span><span className="record-detail">{formatTime(run.elapsed_ms)} · ошибок: {run.mistakes}</span></li>)}</ol>
    </>}
  </section>
}
