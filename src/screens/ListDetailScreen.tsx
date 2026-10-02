import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import LoadError from '../components/LoadError'
import { useLists, setActiveList } from '../lib/lists'
import { useLearning } from '../lib/learning'
import { nextReviewText } from '../lib/dailyPlan'
import { STATUS_META } from '../lib/employees'
import '../styles/journey.css'

export default function ListDetailScreen() {
  const { id } = useParams()
  const { lists, loading, error, reload } = useLists()
  const learning = useLearning()
  const list = lists.find(item => item.id === id)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [query, setQuery] = useState('')
  const lock = useRef(false)
  const employees = learning.rows.filter(person => person.list_id === id)
  const visible = employees.filter(person => `${person.full_name} ${person.job_title} ${person.department ?? ''}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))

  async function open(path: string) {
    if (!list || lock.current) return
    lock.current = true; setBusy(true); setProblem('')
    try { await setActiveList(list.id); navigate(path) }
    catch { setProblem('Не удалось открыть список. Попробуйте снова.'); lock.current = false; setBusy(false) }
  }

  return <div className="container library-page list-detail-page">
    <AppHeader title={list?.name ?? 'Список'} back />
    {error && <LoadError message={error} onRetry={() => void reload()} />}
    {problem && <p className="card answer-wrong" role="alert">{problem}</p>}
    {loading ? <p role="status">Загружаю список…</p> : error ? null : !list ? <section className="module-card"><h2>Список не найден</h2><Link to="/library">Вернуться в библиотеку</Link></section> : <>
      <nav className="list-breadcrumb" aria-label="Вы здесь"><Link to="/library">Библиотека</Link><Icon name="chevron" /><span>Этот список</span></nav>
      <div className="list-overview"><span className="module-icon" aria-hidden="true"><Icon name="library" /></span><div><strong>{list.employee_count} сотрудников</strong><p className="muted small">{list.is_active ? 'Текущий список' : 'Вы просматриваете другой список'}</p></div></div>
      <div className="list-journey">
        <section><span className="eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h2>{list.employee_count ? 'Учиться в своём темпе' : 'Добавим вашу команду'}</h2><p>{list.employee_count ? 'Карточки для запоминания, тест для проверки и игры для тренировки памяти.' : 'Загрузите список из файла или фотографии, добавьте коллег вручную либо получите их по коду.'}</p><button disabled={busy} className="btn btn--primary btn--block" onClick={() => void open(list.employee_count ? '/learn' : '/import')}>{busy ? 'Открываю…' : list.employee_count ? 'Выбрать занятие' : 'Добавить сотрудников'}<Icon name="arrow" /></button></section>
        {list.employee_count > 0 && <section><span className="eyebrow">ПРОГРЕСС СПИСКА</span><h2>{list.percent}% изучено</h2><p>{list.known} из {list.employee_count} сотрудников уже знаете</p><div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${list.percent}%` }} /></div><button disabled={busy} className="btn btn--ghost btn--block" onClick={() => void open('/stats')}>Посмотреть прогресс</button></section>}
      </div>
      {list.employee_count > 0 && <details className="journey-help list-members"><summary><span>Сотрудники · {list.employee_count}</span><span>Посмотреть<Icon name="chevron" /></span></summary><div>
        <div className="section-heading"><h2>Имена и должности</h2><button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void open('/employees')}>Редактировать</button></div>
        <label className="library-search"><Icon name="search" /><input aria-label="Поиск сотрудников в списке" placeholder="Имя, должность или отдел" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {learning.loading ? <p role="status">Загружаю сотрудников…</p> : learning.error ? <LoadError message={learning.error} onRetry={() => void learning.reload()} /> : <div className="list-people">{visible.map(person => <article className="list-person" key={person.id}><div><h3>{person.full_name}</h3><p>{person.job_title}{person.department ? ` · ${person.department}` : ''}</p></div><div><span className={STATUS_META[person.status].className}>{STATUS_META[person.status].label}</span><small>{nextReviewText(person.review_due_at)}</small></div></article>)}{!visible.length && <p className="muted">{employees.length ? 'Ничего не найдено.' : 'Сотрудников пока нет.'}</p>}</div>}
      </div></details>}
      <details className="journey-help list-tools"><summary>Управление списком<Icon name="chevron" /></summary><div><p>Добавляйте коллег или делитесь этим списком. Ответы и личные результаты остаются в вашем аккаунте.</p><div className="list-secondary-actions"><button className="btn btn--ghost" disabled={busy} onClick={() => void open('/import')}><Icon name="plus" />Добавить сотрудников</button><button className="btn btn--ghost" disabled={busy} onClick={() => void open('/share')}><Icon name="share" />Поделиться списком</button></div></div></details>
      <p className="small muted">Повторения этого списка автоматически входят в <Link to="/today">занятие на сегодня</Link> вместе с остальной библиотекой.</p>
    </>}
  </div>
}
