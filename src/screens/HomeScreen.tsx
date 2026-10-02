import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import AuthorLinks from '../components/AuthorLinks'
import TodayCard from '../components/TodayCard'
import LoadError from '../components/LoadError'
import { useLists, setActiveList } from '../lib/lists'
import '../styles/journey.css'
import '../styles/demo.css'

export default function HomeScreen() {
  const { lists, loading, error, reload } = useLists()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const lock = useRef(false)
  const navigate = useNavigate()
  const hasPeople = lists.some(list => list.employee_count > 0)
  const recent = [...lists].sort((a, b) => Number(b.is_active) - Number(a.is_active) || (b.last_studied ?? b.created_at).localeCompare(a.last_studied ?? a.created_at)).slice(0, 3)
  const starter = recent[0]

  async function addPeople() {
    if (!starter || lock.current) return
    lock.current = true; setBusy(true); setProblem('')
    try { await setActiveList(starter.id); navigate('/import') }
    catch { setProblem('Не удалось открыть список. Попробуйте ещё раз.'); lock.current = false; setBusy(false) }
  }

  return <div className="container library-page home-library journey-page">
    <AppHeader title="Главная" />
    <p className="journey-intro">Запоминайте коллег по несколько минут в день.</p>
    {error && <LoadError message={error} onRetry={() => void reload()} />}
    {problem && <p className="card answer-wrong" role="alert">{problem}</p>}
    {loading ? <section className="module-card" role="status">Загружаю вашу библиотеку…</section> : hasPeople ? <TodayCard /> : !error && <section className="today-card home-welcome">
      <span className="module-icon module-icon--welcome"><Icon name="library" /></span>
      <span className="eyebrow">НАЧНИТЕ С ВАШЕЙ КОМАНДЫ</span>
      <h2>{starter ? 'Список готов. Добавим коллег?' : 'Все коллеги — по именам'}</h2>
      <p className="muted">{starter ? `В списке «${starter.name}» пока нет сотрудников. Загрузите файл или фото либо добавьте их вручную.` : 'Соберите имена и должности в список. Тренажёр подберёт короткие занятия и время для повторения.'}</p>
      <ol className="journey-steps" aria-label="Как начать"><li className={starter ? 'is-complete' : ''}><span>1</span>Создать список</li><li><span>2</span>Добавить коллег</li><li><span>3</span>Начать занятие</li></ol>
      {starter ? <button className="btn btn--primary btn--block btn--lg" disabled={busy} onClick={() => void addPeople()}>{busy ? 'Открываю…' : 'Добавить сотрудников'}<Icon name="arrow" /></button> : <Link className="btn btn--primary btn--block btn--lg" to="/create">Создать первый список<Icon name="plus" /></Link>}
    </section>}

    {!loading && lists.length > 0 && <section className="home-lists">
      <div className="section-heading"><h2>Ваши списки</h2><Link to="/library">Все списки<Icon name="arrow" /></Link></div>
      <div className="recent-list">{recent.map(list => <Link key={list.id} className="recent-item" to={`/library/${list.id}`}>
        <span className="module-icon" aria-hidden="true"><Icon name="library" /></span><span><strong>{list.name}</strong><small>{list.employee_count} сотрудников · {list.percent}% изучено{list.is_active ? ' · Текущий' : ''}</small></span><Icon name="chevron" />
      </Link>)}</div>
    </section>}

    {!loading && hasPeople && <details className="journey-help"><summary>Как устроено обучение<Icon name="chevron" /></summary><div>
      <p><strong>Занятие на сегодня</strong> собирает до 10 сотрудников из всей библиотеки: новые имена и повторения по сроку.</p>
      <p><strong>Внутри списка</strong> можно учиться свободно: карточки, тесты и четыре игры.</p>
      <p><strong>Прогресс</strong> показывает, кого вы уже знаете и с кем стоит потренироваться ещё. Игровые рекорды остаются в разделе игр.</p>
    </div></details>}
    {!loading && !hasPeople && !error && <Link className="home-example" to="/demo">Попробовать на примере<Icon name="arrow" /></Link>}
    <AuthorLinks />
  </div>
}
