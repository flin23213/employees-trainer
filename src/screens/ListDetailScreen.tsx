import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useLists, setActiveList } from '../lib/lists'
import { useLearning } from '../lib/learning'
import { nextReviewText } from '../lib/dailyPlan'
import { STATUS_META } from '../lib/employees'

export default function ListDetailScreen() {
  const {id}=useParams(); const {lists,loading,error}=useLists(); const learning=useLearning()
  const list=lists.find(l=>l.id===id); const navigate=useNavigate()
  const [busy,setBusy]=useState(false); const [problem,setProblem]=useState(''); const [query,setQuery]=useState('')
  const employees=learning.rows.filter(e=>e.list_id===id)
  const visible=employees.filter(e=>`${e.full_name} ${e.job_title} ${e.department ?? ''}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))
  async function open(path:string) { if(!list || busy)return;setBusy(true);setProblem('');try{await setActiveList(list.id);navigate(path)}catch{setProblem('Не удалось открыть список. Попробуйте снова.');setBusy(false)} }
  return <main className="container library-page"><AppHeader title={list?.name ?? 'Список'} back />
    {(error||learning.error||problem)&&<p className="card answer-wrong" role="alert">{error||learning.error||problem}</p>}
    {loading?<p role="status">Загружаю список…</p>:!list?<div className="module-card"><h2>Список не найден</h2><Link to="/library">Вернуться в библиотеку</Link></div>:<>
      <nav className="list-breadcrumb" aria-label="Вы здесь"><Link to="/library">Библиотека</Link><span> / {list.name}</span></nav>
      <section className="today-card"><span className="module-icon" aria-hidden="true">{list.emoji}</span><h1>{list.name}</h1>
        <p className="muted">{list.employee_count} сотрудников · {list.known} уже знаете · {list.percent}% изучено</p>
        <div className="progress"><div className="progress__bar progress__bar--success" style={{width:`${list.percent}%`}} /></div>
        <div className="list-detail-actions">
          {list.employee_count>0 ? <><button disabled={busy} className="btn btn--primary" onClick={()=>void open('/learn')}>Карточки и тесты</button><button disabled={busy} className="btn btn--ghost" onClick={()=>void open('/games')}>Игры</button><button disabled={busy} className="btn btn--ghost" onClick={()=>void open('/stats')}>Прогресс списка</button></> : <button disabled={busy} className="btn btn--primary" onClick={()=>void open('/import')}>Загрузить сотрудников</button>}
        </div>
        <p className="small muted">Повторения этого списка автоматически входят в <Link to="/today">занятие на сегодня</Link>.</p>
      </section>
      <div className="section-heading"><h2>Сотрудники</h2><button className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>void open('/employees')}>Редактировать</button></div>
      <label className="library-search"><input aria-label="Поиск сотрудников в списке" placeholder="Имя, должность или отдел" value={query} onChange={e=>setQuery(e.target.value)} /></label>
      {learning.loading?<p role="status">Загружаю сотрудников…</p>:<div className="list-people">{visible.map(e=><article className="list-person" key={e.id}><div><h3>{e.full_name}</h3><p>{e.job_title}{e.department ? ` · ${e.department}`:''}</p></div><div><span className={STATUS_META[e.status].className}>{STATUS_META[e.status].label}</span><small>{nextReviewText(e.review_due_at)}</small></div></article>)}{!visible.length&&<p className="muted">{employees.length?'Ничего не найдено.':'Добавьте сотрудников, чтобы начать обучение.'}</p>}</div>}
      <div className="list-detail-actions"><button className="btn btn--ghost" disabled={busy} onClick={()=>void open('/import')}>Добавить из файла или фото</button><button className="btn btn--ghost" disabled={busy} onClick={()=>void open('/share')}>Поделиться списком</button></div>
    </>}
  </main>
}
