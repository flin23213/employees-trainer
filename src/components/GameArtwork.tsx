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
    </> : mode === 'quiz' ? <>
      <rect x="44" y="12" width="152" height="124" rx="22" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="79" cy="43" r="10" stroke="var(--primary)" strokeWidth="2" />
      <path d="M101 39h57m-57 9h40" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <rect x="60" y="68" width="120" height="22" rx="7" fill="var(--success-soft)" stroke="var(--success)" />
      <path d="m70 79 4 4 8-9" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M93 79h67" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
      <rect x="60" y="98" width="120" height="22" rx="7" fill="var(--bg-elevated)" stroke="var(--border)" />
      <path d="M73 109h87" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      <path d="m210 30-15 23h12l-4 19 22-28h-14l5-14Z" fill="var(--primary)" />
    </> : mode === 'truth' ? <>
      <rect x="31" y="17" width="178" height="65" rx="19" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="63" cy="40" r="8" stroke="var(--primary)" strokeWidth="2" />
      <path d="M50 64c0-15 26-15 26 0M93 41h89m-89 13h63" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M120 83v13m0 0H75m45 0h45" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
      <rect x="42" y="103" width="67" height="35" rx="12" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="2" />
      <path d="m65 120 7 7 15-17" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="131" y="103" width="67" height="35" rx="12" fill="var(--danger-soft)" stroke="var(--danger)" strokeWidth="2" />
      <path d="m157 113 15 15m0-15-15 15" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" />
    </> : <>
      <rect x="31" y="32" width="55" height="80" rx="13" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="2" transform="rotate(-12 59 72)" />
      <path d="M46 55h25M46 64h25M46 73h25M46 82h25M46 91h25" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" transform="rotate(-12 59 72)" />
      <rect x="90" y="15" width="62" height="88" rx="14" fill="var(--bg-elevated)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="121" cy="44" r="9" stroke="var(--primary)" strokeWidth="2" />
      <path d="M105 75c0-20 32-20 32 0m-31 12h30" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <rect x="155" y="46" width="55" height="80" rx="13" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="2" transform="rotate(12 182 86)" />
      <path d="m171 83 7 8 17-18" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="rotate(12 182 86)" />
      <path d="M101 117c7 15 34 15 41 0m0 0-2 11m2-11-11 2" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </svg>
}
