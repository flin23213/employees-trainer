// Путь: src/screens/HomeScreen.tsx
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { computeStats, useEmployees } from '../lib/employees'

export default function HomeScreen() {
  const { list, loading, error } = useEmployees()
  const s = computeStats(list)

  return (
    <div className="container fade-in">
      <AppHeader title="Тренажёр сотрудников" showSignOut />

      {error && <div className="card answer-wrong" style={{ marginBottom: 16 }}>Ошибка загрузки: {error}</div>}

      {/* Плитки статистики: на телефоне 1-2 в ряд, на ПК 4 */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat__value">{loading ? '…' : s.total}</div>
          <div className="stat__label">Сотрудников</div>
        </div>
        <div className="card stat">
          <div className="stat__value" style={{ color: 'var(--success)' }}>{loading ? '…' : s.known}</div>
          <div className="stat__label">Изучено</div>
        </div>
        <div className="card stat">
          <div className="stat__value" style={{ color: 'var(--danger)' }}>{loading ? '…' : s.weak}</div>
          <div className="stat__label">Слабые места</div>
        </div>
        <div className="card stat">
          <div className="stat__value">{loading ? '…' : `${s.avgAccuracy}%`}</div>
          <div className="stat__label">Средняя точность</div>
        </div>
      </div>

      {/* Общий прогресс */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>Общий прогресс</strong>
          <span className="muted small">{s.progressPercent}%</span>
        </div>
        <div className="progress" style={{ marginTop: 10 }}>
          <div
            className={`progress__bar${s.progressPercent === 100 ? ' progress__bar--success' : ''}`}
            style={{ width: `${s.progressPercent}%` }}
          />
        </div>
        <div className="row small muted" style={{ marginTop: 10, gap: 14 }}>
          <span>Не изучено: {s.fresh}</span>
          <span>В процессе: {s.learning}</span>
          <span>Выучено: {s.known}</span>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="stack" style={{ marginBottom: 16 }}>
        <Link to="/learn" className="btn btn--primary btn--lg btn--block">▶ Начать обучение</Link>

        <div className="grid grid-2">
          <Link to="/cards" className="btn btn--block">🗂 Карточки</Link>
          <Link to="/test" className="btn btn--block">✍️ Тест</Link>
          <Link to="/review" className="btn btn--block">🔁 Повторить ошибки</Link>
          <Link to="/employees" className="btn btn--block">👥 Сотрудники</Link>
          <Link to="/stats" className="btn btn--block">📊 Статистика</Link>
          <Link to="/import" className="btn btn--block">📂 Импорт</Link>
        </div>
      </div>

      {/* Подсказка, если база пуста */}
      {!loading && s.total === 0 && (
        <div className="card center">
          <p><strong>Сотрудников пока нет</strong></p>
          <p className="muted small">Добавьте их вручную или загрузите список из файла Excel.</p>
          <Link to="/employees" className="btn btn--primary">Перейти к сотрудникам</Link>
        </div>
      )}
    </div>
  )
}