export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="card load-error" role="alert"><p>{message}</p><button className="btn btn--ghost btn--sm" onClick={onRetry}>Повторить загрузку</button></div>
}
