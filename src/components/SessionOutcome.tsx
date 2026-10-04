import { useId, type ReactNode } from 'react'
import LearningArtwork from './LearningArtwork'
import '../styles/outcome.css'

type Props = {
  tone: 'complete' | 'practice' | 'timeout'
  eyebrow: string
  title: string
  description?: string
  metrics?: { label: string; value: ReactNode; note?: string }[]
  children?: ReactNode
  className?: string
}

export default function SessionOutcome({ tone, eyebrow, title, description, metrics = [], children, className = '' }: Props) {
  const headingId = useId()
  return <section className={`session-outcome session-outcome--${tone} ${className}`} aria-labelledby={headingId}>
    <header className="session-outcome__header">
      <LearningArtwork variant={tone} className="session-outcome__artwork" />
      <div><p className="session-outcome__eyebrow">{eyebrow}</p><h1 className="session-outcome__title" id={headingId}>{title}</h1>{description && <p className="session-outcome__description">{description}</p>}</div>
    </header>
    {metrics.length > 0 && <dl className="session-outcome__metrics">{metrics.map(metric => <div key={metric.label} className="session-outcome__metric"><dt>{metric.label}</dt><dd>{metric.value}</dd>{metric.note && <dd className="session-outcome__metric-note">{metric.note}</dd>}</div>)}</dl>}
    <div className="session-outcome__body">{children}</div>
  </section>
}
