import { Link } from 'react-router-dom'
import { useLists } from '../lib/lists'

export default function ListContext() {
  const { active, loading } = useLists()
  return <div className="current-module"><span><small className="muted">Текущий список</small><br /><strong>{loading ? 'Загружаю…' : active?.name ?? 'Не выбран'}</strong></span><Link to={active ? `/library/${active.id}` : "/library"}>{active ? "Открыть список" : "В библиотеку"}</Link></div>
}
