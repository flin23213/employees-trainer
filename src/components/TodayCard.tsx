import { Link } from 'react-router-dom'
import { makeDailyPlan, DAILY_GOAL } from '../lib/dailyPlan'
import { useLearning } from '../lib/learning'
import Icon from './Icon'

export default function TodayCard() {
  const { rows, answered, loading, error, reload } = useLearning()
  const plan = makeDailyPlan(rows, answered)
  if (loading) return <section className="module-card" role="status">Собираю занятие на сегодня…</section>
  if (error) return <section className="module-card" role="alert"><p>{error}</p><button className="btn" onClick={() => void reload()}>Повторить</button></section>
  if (!rows.length) return null
  return <section className="today-card">
    <div className="module-card__top"><span className="eyebrow">НА СЕГОДНЯ · ОКОЛО 5 МИНУТ</span><Icon name="clock" /></div>
    <h2>{plan.cards.length ? 'Маленький шаг к знакомой команде' : 'На сегодня всё готово'}</h2>
    <p className="muted">{plan.cards.length ? `${plan.cards.length} карточек из вашей библиотеки: повторение по сроку и новые сотрудники.` : 'Можно отдохнуть или выбрать свободную тренировку в библиотеке.'}</p>
    <div className="progress" aria-label={`Сегодня изучено ${plan.completed} из ${DAILY_GOAL}`}><div className="progress__bar progress__bar--success" style={{ width: `${plan.completed / DAILY_GOAL * 100}%` }} /></div>
    <p className="small muted">Сегодня: {plan.completed} из {DAILY_GOAL} сотрудников</p>
    {plan.cards.length > 0 && <Link to="/today" className="btn btn--primary btn--block btn--lg">{plan.completed ? 'Продолжить занятие' : 'Начать занятие'}<Icon name="arrow" /></Link>}
    <Link className="link-quiet" to="/profile#reminders">Настроить напоминания</Link>
  </section>
}
