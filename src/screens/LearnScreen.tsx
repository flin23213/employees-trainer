import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import LoadError from '../components/LoadError'
import { computeStats, useEmployees } from '../lib/employees'
import { useLists } from '../lib/lists'
import '../styles/journey.css'

export default function LearnScreen() {
  const { list, loading, error, reload } = useEmployees()
  const { active, loading: listsLoading, error: listsError, reload: reloadLists } = useLists()
  const s = computeStats(list)
  const starting = s.fresh > 0 || s.total === 0
  return <div className="container library-page study-hub">
    <AppHeader title="Занятия" back />
    <div className="current-module study-context"><Icon name="library" /><span>{active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
    {(error || listsError) && <LoadError message={error || listsError!} onRetry={() => { void reload(); void reloadLists() }} />}
    {loading || listsLoading ? <p className="card" role="status">Подбираю варианты занятий…</p> : error || listsError ? null : s.total === 0 ? <section className="module-card center">
      <h2>Начнём с сотрудников</h2><p className="muted">Добавьте имена и должности в этот список — затем сможете учиться любым способом.</p>
      <Link to="/import" className="btn btn--primary btn--block">Добавить сотрудников</Link>
    </section> : <>
      <div className="study-intro"><h2>Запомнить или проверить?</h2><p className="muted">{starting ? 'Начните с карточек. Когда освоитесь, проверьте себя тестом.' : 'Продолжайте с карточками или проверьте, кого уже знаете.'}</p></div>
      <div className="study-modes">
        <Link to="/cards" className={`study-mode${starting ? ' study-mode--suggested' : ''}`}><Icon name="cards" /><h3>Карточки</h3>{starting && <span className="eyebrow">РЕКОМЕНДУЕМ ДЛЯ НАЧАЛА</span>}<p>Вспомните должность, откройте ответ и отметьте «Знаю» или «Не знаю». Можно нажимать кнопки или свайпать.</p><span className="study-mode__cta">Запоминать<Icon name="arrow" /></span></Link>
        <Link to="/test" className="study-mode"><Icon name="check" /><h3>Тест</h3><p>Ответьте на вопросы об именах и должностях. Выберите варианты или впишите ответ самостоятельно.</p><span className="study-mode__cta">Проверить себя<Icon name="arrow" /></span></Link>
      </div>
      <div className="study-secondary">
        {s.weak > 0 && <Link to="/review"><Icon name="repeat" /><span><strong>Повторить слабые места · {s.weak}</strong><small>Только сотрудники, с которыми были ошибки</small></span><Icon name="chevron" /></Link>}
        <Link to="/games"><Icon name="games" /><span><strong>Четыре игры</strong><small>Находите пары, тренируйте память и улучшайте свой рекорд</small></span><Icon name="chevron" /></Link>
      </div>
      <details className="journey-help"><summary>Как сохраняется прогресс<Icon name="chevron" /></summary><div><p>Ответы в карточках и тестах обновляют прогресс этого списка. Результаты игр хранятся отдельно как личные рекорды.</p><p>Чтобы повторять сотрудников по расписанию из всей библиотеки, откройте <Link to="/today">занятие на сегодня</Link>.</p></div></details>
    </>}
  </div>
}
