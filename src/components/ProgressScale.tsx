// Путь: src/components/ProgressScale.tsx
// Горизонтальная шкала прогресса: три сегмента вместо круговой диаграммы.

import { Link } from 'react-router-dom'

type Props = {
  known: number
  learning: number
  fresh: number
  total: number
  percent: number
}

export default function ProgressScale({ known, learning, fresh, total, percent }: Props) {
  const share = (n: number) => (total === 0 ? 0 : (n / total) * 100)

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <strong>Прогресс изучения</strong>
        <div className="spacer" />
        <span className="scale__big">{percent}%</span>
      </div>

      {/* Сама шкала: сегменты растут из нуля при появлении */}
      <div className="scale" role="img"
           aria-label={`Выучено ${known}, в процессе ${learning}, не изучено ${fresh}, всего ${total}`}>
        <div className="scale__seg scale__seg--known"    style={{ width: `${share(known)}%` }} />
        <div className="scale__seg scale__seg--learning" style={{ width: `${share(learning)}%` }} />
        <div className="scale__seg scale__seg--fresh"    style={{ width: `${share(fresh)}%` }} />
      </div>

      {/* Легенда: каждая часть — ссылка на разбор */}
      <div className="legend">
        <Link to="/insight/known" className="legend__item">
          <span className="legend__dot legend__dot--known" />
          <span className="legend__num">{known}</span>
          <span className="legend__label">выучено</span>
        </Link>
        <Link to="/insight/learning" className="legend__item">
          <span className="legend__dot legend__dot--learning" />
          <span className="legend__num">{learning}</span>
          <span className="legend__label">в процессе</span>
        </Link>
        <Link to="/insight/new" className="legend__item">
          <span className="legend__dot legend__dot--fresh" />
          <span className="legend__num">{fresh}</span>
          <span className="legend__label">не изучено</span>
        </Link>
      </div>
    </div>
  )
}
