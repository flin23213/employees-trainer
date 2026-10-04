import { Link } from 'react-router-dom'
import { makeDailyPlan } from '../lib/dailyPlan'
import { useLearning } from '../lib/learning'
import Icon from './Icon'
import LearningArtwork from './LearningArtwork'
import '../styles/outcome.css'

export default function TodayCard() {
  const { rows, answered, loading, error, reload } = useLearning()
  const plan = makeDailyPlan(rows, answered)
  const total = plan.completed + plan.cards.length
  const cardWord = { one: 'карточка', few: 'карточки', many: 'карточек', other: 'карточек', zero: 'карточек', two: 'карточки' }[new Intl.PluralRules('ru').select(plan.cards.length)]
  if (loading) return <section className="module-card" role="status">Собираю занятие на сегодня…</section>
  if (error) return <section className="module-card" role="alert"><p>{error}</p><button className="btn" onClick={() => void reload()}>Повторить</button></section>
  if (!rows.length) return null
  return <section className="today-card home-today">
    <div className="module-card__top"><span className="eyebrow">ЗАНЯТИЕ НА СЕГОДНЯ</span><span className="today-duration"><Icon name="clock" />Около 5 минут</span></div>
    <div className="learning-hero"><div><h2>{plan.cards.length ? `${plan.cards.length} ${cardWord} на сегодня` : 'На сегодня всё готово'}</h2>
    <p className="muted">{plan.cards.length ? 'Всё уже подобрано: повторения по сроку и новые сотрудники из вашей библиотеки.' : 'Новых заданий на сегодня нет. Можно отдохнуть или потренироваться со своим списком.'}</p></div><LearningArtwork variant={plan.cards.length ? 'study' : 'complete'} /></div>
    {total > 0 && <><div className="progress" role="progressbar" aria-label="Занятие на сегодня" aria-valuemin={0} aria-valuemax={total} aria-valuenow={plan.completed}><div className="progress__bar progress__bar--success" style={{ width: `${plan.completed / total * 100}%` }} /></div><p className="small muted">Сегодня: {plan.completed} из {total} сотрудников</p></>}
    {plan.cards.length > 0 && <Link to="/today" className="btn btn--primary btn--block btn--lg">{plan.completed ? 'Продолжить занятие' : 'Начать занятие'}<Icon name="arrow" /></Link>}
    {!plan.cards.length && <Link to="/library" className="btn btn--primary btn--block">Выбрать свободное занятие<Icon name="arrow" /></Link>}
    <details className="today-details"><summary>Что входит в занятие<Icon name="chevron" /></summary><p className="small muted">До 10 сотрудников из всех списков. Сначала повторения, затем новые имена. После каждого ответа прогресс сохраняется, а дата следующего повторения обновляется.</p><Link to="/profile#reminders">Настроить напоминания</Link></details>
  </section>
}
