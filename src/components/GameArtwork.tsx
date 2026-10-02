import type { GameMode } from '../lib/gameEngine'

export default function GameArtwork({ mode }: { mode: GameMode }) {
  return <svg className={`game-artwork game-artwork--${mode}`} viewBox="0 0 240 150" fill="none" aria-hidden="true">
    {mode === 'match' ? <>
      <path d="M71 42c43 0 52 63 98 63M71 108c43 0 52-63 98-63" stroke="var(--primary)" strokeWidth="3" strokeDasharray="5 6" />
      <rect x="18" y="16" width="74" height="52" rx="14" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" />
      <rect x="148" y="80" width="74" height="52" rx="14" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" />
      <rect x="18" y="82" width="74" height="52" rx="14" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="2" />
      <rect x="148" y="14" width="74" height="52" rx="14" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="2" />
      <circle cx="55" cy="34" r="7" stroke="var(--primary)" strokeWidth="2" />
      <path d="M43 55c0-13 24-13 24 0M174 105h22m-17-6v-5h12v5m-16 0h20v15h-20Z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m45 108 7 7 15-16" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m175 40 7 7 15-16" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </> : <>
      <rect x="44" y="12" width="152" height="124" rx="22" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="79" cy="43" r="10" stroke="var(--primary)" strokeWidth="2" />
      <path d="M101 39h57m-57 9h40" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <rect x="60" y="68" width="120" height="22" rx="7" fill="var(--success-soft)" stroke="var(--success)" />
      <path d="m70 79 4 4 8-9" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M93 79h67" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
      <rect x="60" y="98" width="120" height="22" rx="7" fill="var(--bg-elevated)" stroke="var(--border)" />
      <path d="M73 109h87" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      <path d="m210 30-15 23h12l-4 19 22-28h-14l5-14Z" fill="var(--primary)" />
    </>}
  </svg>
}
