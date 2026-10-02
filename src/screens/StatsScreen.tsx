import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import LoadError from '../components/LoadError'
import { computeDepartmentStats, computeStats, useEmployees } from '../lib/employees'
import { useLists } from '../lib/lists'
import '../styles/stats.css'

function departmentCount(count: number): string {
  const last = count % 10
  const lastTwo = count % 100
  return `${count} ${last === 1 && lastTwo !== 11 ? 'отдел' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'отдела' : 'отделов'}`
}

export default function StatsScreen() {
  const { list, loading: employeesLoading, error, reload } = useEmployees()
  const { active, loading: listsLoading, error: listsError, reload: reloadLists } = useLists()
  const loading = employeesLoading || listsLoading
  const stats = computeStats(list)
  const hasAnswers = list.some(employee => employee.attempts > 0)
  const departments = useMemo(() => computeDepartmentStats(list), [list])
  // Preserve the original ranking: the five lowest accuracies among answered employees.
  const weakest = useMemo(() => list.filter(employee => employee.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.priority - a.priority).slice(0, 5), [list])
  const reviewCount = list.filter(employee => employee.attempts > 0 &&
    (employee.status === 'weak' || employee.accuracy < 60 || employee.last_result === false)).length
  const recommendation = reviewCount > 0
    ? { title: 'Закрепите слабые места', text: 'Повторите коллег, которых пока путаете.', label: 'Повторить слабые места', to: '/review', icon: 'repeat' }
    : stats.fresh === stats.total
      ? { title: 'Начните с первого занятия', text: 'Карточки помогут запомнить имена и должности.', label: 'Начать занятия', to: '/cards', icon: 'cards' }
      : { title: stats.known === stats.total ? 'Поддерживайте результат' : 'Продолжайте учиться', text: stats.known === stats.total ? 'Короткое повторение поможет сохранить знания.' : 'Повторите знакомых коллег и запомните новых.', label: 'Продолжить занятия', to: '/cards', icon: 'cards' }

  return <div className="container stats-page fade-in">
    <AppHeader title="Прогресс" />

    <div className="stats-current-list">
      <Icon name="library" />
      <div><span>Текущий список</span><strong>{listsLoading ? 'Загружаю…' : active?.name ?? 'Список не выбран'}</strong></div>
      <Link to="/library" className="btn btn--ghost btn--sm">Сменить</Link>
    </div>

    {loading && <div className="card center muted" role="status">Загружаю прогресс…</div>}
    {(error || listsError) && <LoadError message={error || listsError!} onRetry={() => { void reload(); void reloadLists() }} />}

    {!loading && !error && !listsError && list.length === 0 && <div className="card stats-empty">
      <Icon name="library" />
      <h2>Здесь появится ваш прогресс</h2>
      <p className="muted">Добавьте сотрудников в список и начните первое занятие.</p>
      <Link to="/import" className="btn btn--primary">Добавить сотрудников</Link>
    </div>}

    {!loading && !error && !listsError && list.length > 0 && <>
      <section className="stats-overview" aria-label="Обзор прогресса">
        <div className="stats-overview__metrics">
          <div><span className="stats-overview__number">{stats.progressPercent}%</span><h2>Изучено</h2><p>{stats.known} из {stats.total} сотрудников</p></div>
          <div><span className="stats-overview__number stats-overview__number--accuracy">{hasAnswers ? `${stats.avgAccuracy}%` : '—'}</span><h2>Средняя точность</h2><p>{hasAnswers ? 'По тем, кого уже спрашивали' : 'Появится после первых ответов'}</p></div>
        </div>
        <div className="progress stats-overview__bar" role="progressbar" aria-label="Доля изученных сотрудников" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.progressPercent}>
          <div className={`progress__bar${stats.progressPercent >= 100 ? ' progress__bar--success' : ''}`} style={{ width: `${stats.progressPercent}%` }} />
        </div>
        <dl className="stats-status-list">
          <div data-status="known"><dt>Изучено хорошо</dt><dd>{stats.known}</dd></div>
          <div data-status="learning"><dt>В процессе</dt><dd>{stats.learning}</dd></div>
          <div data-status="weak"><dt>Нужно повторить</dt><dd>{stats.weak}</dd></div>
          <div data-status="new"><dt>Не изучено</dt><dd>{stats.fresh}</dd></div>
        </dl>
      </section>

      <section className="stats-next-step" aria-label="Рекомендуемое занятие">
        <div><h2>{recommendation.title}</h2><p>{recommendation.text}</p></div>
        <Link to={recommendation.to} className="btn btn--primary"><Icon name={recommendation.icon} />{recommendation.label}</Link>
      </section>

      {reviewCount > 0 && weakest.length > 0 && <details className="stats-details">
        <summary><span className="stats-details__heading"><strong>Слабые места</strong><span>Коллег: {weakest.length}</span></span><span className="stats-details__action"><span className="stats-details__closed">Смотреть подробнее</span><span className="stats-details__open">Скрыть</span><Icon name="chevron" /></span></summary>
        <div className="stats-details__body">
          <p className="stats-details__note">Среди сотрудников, о которых вы уже отвечали. Сначала те, кого знаете хуже всего.</p>
          <ul className="stats-people-list">{weakest.map(employee => <li key={employee.id}>
            <div className="stats-person__heading"><strong>{employee.full_name}</strong><span className={employee.accuracy < 60 ? 'stats-value--weak' : ''}>{employee.accuracy}%</span></div>
            <p>{employee.job_title}</p>
            <div className="progress"><div className={`progress__bar${employee.accuracy >= 80 ? ' progress__bar--success' : ''}`} style={{ width: `${employee.accuracy}%` }} /></div>
          </li>)}</ul>
        </div>
      </details>}

      <details className="stats-details stats-details--departments">
        <summary><span className="stats-details__heading"><strong>Прогресс по отделам</strong><span>{departmentCount(departments.length)}</span></span><span className="stats-details__action"><span className="stats-details__closed">Смотреть подробнее</span><span className="stats-details__open">Скрыть</span><Icon name="chevron" /></span></summary>
        <div className="stats-details__body">
          <p className="stats-details__note">Сначала отделы, где изучено меньше сотрудников.</p>
          <ul className="stats-department-list">{departments.map(department => <li key={department.department}>
            <div className="stats-department__heading"><strong>{department.department}</strong><span>{department.percent}%</span></div>
            <p className="stats-department__count">Изучено {department.known} из {department.total}</p>
            <div className="progress"><div className={`progress__bar${department.percent >= 80 ? ' progress__bar--success' : ''}`} style={{ width: `${department.percent}%` }} /></div>
            <div className="stats-department__metrics">
              {department.weak > 0 && <span className="stats-value--weak">Повторить: {department.weak}</span>}
              {department.fresh > 0 && <span>Не изучено: {department.fresh}</span>}
              {department.avgAccuracy > 0 && <span>Точность: {department.avgAccuracy}%</span>}
            </div>
          </li>)}</ul>
        </div>
      </details>
    </>}
  </div>
}
