import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useLearning } from '../lib/learning'
import { makeDailyPlan, nextReviewText, type LearningEmployee } from '../lib/dailyPlan'
import { recordAnswer } from '../lib/employees'
import { logAnswer } from '../lib/activity'

export default function DailyScreen() {
  const { rows, answered, loading, error, reload } = useLearning()
  const [deck, setDeck] = useState<LearningEmployee[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [failedAnswer, setFailedAnswer] = useState<boolean|null>(null)
  const lock = useRef(false)
  const events = useRef(new Map<string,string>())
  const current = deck?.[index]
  const plan = makeDailyPlan(rows, answered)
  async function answer(correct: boolean) {
    if (!current || lock.current) return
    lock.current=true; setBusy(true); setProblem('')
    const eventId=events.current.get(current.id) ?? crypto.randomUUID(); events.current.set(current.id,eventId)
    try {
      await recordAnswer(current.id,correct,eventId)
      logAnswer(correct); if(correct) setCorrectCount(n=>n+1)
      setIndex(n=>n+1); setRevealed(false); setFailedAnswer(null)
      if(index+1===(deck?.length ?? 0)) await reload()
    } catch { setFailedAnswer(correct); setProblem('Не удалось подтвердить сохранение. Проверьте соединение и нажмите ту же кнопку ещё раз.') }
    finally { lock.current=false; setBusy(false) }
  }
  return <main className="container daily-page"><AppHeader title="Занятие на сегодня" back />
    {!deck ? <section className="today-card">
      <span className="eyebrow">ВАША БИБЛИОТЕКА · КОРОТКОЕ ЗАНЯТИЕ</span>
      <h1>{loading ? 'Собираю карточки…' : plan.cards.length ? `${plan.cards.length} карточек на сегодня` : 'Всё на сегодня'}</h1>
      {error ? <><p role="alert">{error}</p><button className="btn" onClick={()=>void reload()}>Повторить</button></> : <>
        <p className="muted">Сначала вспомните должность, затем откройте ответ и честно отметьте, знаете ли сотрудника. Ответы сохраняются после каждой карточки.</p>
        {!loading && plan.cards.length>0 && <button className="btn btn--primary btn--block" onClick={()=>setDeck(plan.cards)}>Начать · около 5 минут</button>}
        {!loading && !plan.cards.length && <Link to="/library" className="btn btn--primary">Открыть библиотеку</Link>}
        <p className="small muted">После успешного повторения интервалы растут: 1, 3, 7, 14 и 30 дней. После ошибки вернём карточку через час. Дневной план — до 10 сотрудников.</p>
      </>}
    </section> : current ? <>
      <p className="muted">{index+1} из {deck.length} · {current.list_name}</p>
      <div className="progress"><div className="progress__bar" style={{width:`${index/deck.length*100}%`}} /></div>
      <button className="daily-flashcard" onClick={()=>setRevealed(true)} aria-expanded={revealed}>
        <span className="eyebrow">{current.attempts ? 'ПОВТОРЕНИЕ' : 'НОВЫЙ СОТРУДНИК'}</span>
        <h2>{current.full_name}</h2>
        {revealed ? <><strong>{current.job_title}</strong>{current.department && <p className="muted">{current.department}</p>}{current.description && <p>{current.description}</p>}</> : <p className="muted">Вспомните должность и нажмите, чтобы открыть ответ</p>}
      </button>
      {problem && <p role="alert" className="answer-wrong">{problem}</p>}
      {revealed && <div className="daily-actions"><button className="btn btn--ghost" disabled={busy||failedAnswer===true} onClick={()=>void answer(false)}>Не знаю</button><button className="btn btn--primary" disabled={busy||failedAnswer===false} onClick={()=>void answer(true)}>{busy ? 'Сохраняю…' : 'Знаю'}</button></div>}
    </> : <section className="today-card"><span className="eyebrow">ЗАНЯТИЕ ЗАВЕРШЕНО</span><h1>{correctCount} из {deck.length} — знаете</h1>
      <p className="muted">Ответы сохранены. Следующее повторение уже запланировано.</p>
      {error ? <p role="alert">Ответы сохранены, но не удалось обновить расписание. <button className="btn btn--sm" onClick={()=>void reload()}>Обновить</button></p> : <ul className="review-schedule">{deck.map(e=><li key={e.id}><strong>{e.full_name}</strong><span>{nextReviewText(rows.find(r=>r.id===e.id)?.review_due_at ?? null)}</span></li>)}</ul>}
      <Link to="/" className="btn btn--primary btn--block">Готово — на главную</Link><Link to="/profile#reminders" className="link-quiet">Напомнить о следующем занятии</Link>
    </section>}
  </main>
}
