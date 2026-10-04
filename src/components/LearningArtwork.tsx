import '../styles/artwork.css'

type Tone = 'violet' | 'mint' | 'neutral'
type MarkProps = { x: number; y: number; size?: number }

export function ArtworkPortrait({ x, y, size = 32 }: MarkProps) {
  return <g transform={`translate(${x} ${y}) scale(${size / 32})`} className="art-mark"><circle cx="16" cy="10" r="5.5" /><path d="M5 28v-2a11 11 0 0 1 22 0v2" /></g>
}

export function ArtworkBriefcase({ x, y, size = 32 }: MarkProps) {
  return <g transform={`translate(${x} ${y}) scale(${size / 32})`} className="art-mark"><rect x="3" y="10" width="26" height="18" rx="4" /><path d="M11 10V5h10v5M3 17l13 5 13-5M13 20v5h6v-5" /></g>
}

export function ArtworkCheck({ x, y, size = 32 }: MarkProps) {
  return <path className="art-mark art-check" transform={`translate(${x} ${y}) scale(${size / 32})`} d="m6 17 7 7L27 8" />
}

export function ArtworkClock({ x, y, size = 48 }: MarkProps) {
  return <g transform={`translate(${x} ${y}) scale(${size / 48})`} className="art-mark"><circle cx="24" cy="24" r="19" /><path d="M24 12v13l8 5M24 5v3M43 24h-3M24 43v-3M5 24h3" /></g>
}

type CardProps = { x: number; y: number; tone?: Tone; angle?: number; kind?: 'person' | 'role' | 'back' }

/** A single badge shape shared by study and game illustrations. */
export function ArtworkCard({ x, y, tone = 'violet', angle = 0, kind = 'person' }: CardProps) {
  return <g transform={`translate(${x} ${y}) rotate(${angle} 32 43)`} className={`art-tone--${tone}`}>
    <rect className="art-card-shadow" x="2" y="5" width="64" height="86" rx="13" />
    <rect className="art-card" width="64" height="86" rx="13" />
    <path className="art-slot" d="M25 8h14" />
    {kind === 'back' ? <>
      <rect className="art-soft" x="12" y="23" width="40" height="43" rx="11" />
      <path className="art-line" d="m22 43 10-10 10 10-10 10Z" /><circle className="art-node" cx="32" cy="43" r="3" />
    </> : <>
      <circle className="art-soft" cx="32" cy="35" r="19" />
      {kind === 'person' ? <ArtworkPortrait x={18} y={20} size={28} /> : <ArtworkBriefcase x={18} y={20} size={28} />}
      <path className="art-line" d="M15 64h34" /><path className="art-line art-line--muted" d="M22 73h20" />
    </>}
  </g>
}

type Props = { variant: 'team' | 'study' | 'complete' | 'practice' | 'timeout'; className?: string }

export default function LearningArtwork({ variant, className = '' }: Props) {
  return <svg className={`app-artwork learning-artwork learning-artwork--${variant}${className ? ` ${className}` : ''}`} viewBox="0 0 240 150" fill="none" aria-hidden="true" focusable="false">
    <ellipse className="art-ground" cx="120" cy="132" rx="88" ry="8" />
    {variant === 'team' ? <>
      <path className="art-connection" d="M54 53C65 14 175 14 188 53M72 96c22 20 74 20 96 0" />
      <circle className="art-node" cx="51" cy="46" r="4" /><circle className="art-node art-tone--mint" cx="187" cy="46" r="4" />
      <ArtworkCard x={24} y={43} tone="neutral" angle={-10} />
      <ArtworkCard x={151} y={43} tone="mint" angle={10} />
      <ArtworkCard x={88} y={22} />
      <g className="art-tone--mint"><circle className="art-seal" cx="155" cy="107" r="15" /><ArtworkCheck x={144} y={96} size={23} /></g>
    </> : variant === 'study' ? <>
      <path className="art-connection" d="M43 111c13-50 37-72 77-72s65 28 78 70" />
      <circle className="art-node art-tone--mint" cx="40" cy="112" r="5" /><circle className="art-node" cx="200" cy="112" r="5" />
      <ArtworkCard x={27} y={48} tone="neutral" angle={-9} kind="role" />
      <ArtworkCard x={148} y={48} tone="neutral" angle={9} />
      <ArtworkCard x={87} y={18} />
      <g className="art-tone--mint"><rect className="art-seal" x="106" y="113" width="28" height="7" rx="3.5" /></g>
      <path className="art-direction" d="m179 106 19 3-3-19" />
    </> : variant === 'complete' ? <>
      <path className="art-connection" d="M45 87c0-38 38-66 82-58 28 5 52 24 52 52" />
      <ArtworkCard x={56} y={30} tone="neutral" angle={-10} kind="role" />
      <ArtworkCard x={92} y={21} />
      <g className="art-tone--mint"><circle className="art-halo" cx="170" cy="98" r="33" /><circle className="art-seal" cx="170" cy="98" r="25" /><ArtworkCheck x={151} y={79} size={38} /></g>
      <path className="art-line" d="M190 26v12m-6-6h12M37 103v8m-4-4h8" />
      <circle className="art-node art-tone--mint" cx="204" cy="56" r="3.5" />
    </> : variant === 'practice' ? <>
      <path className="art-connection" d="M45 83c0-38 34-65 75-65s76 29 76 65-34 53-76 53" />
      <path className="art-direction" d="m36 74 9 11 10-11m75 53-12 9 13 7" />
      <ArtworkCard x={54} y={39} tone="mint" angle={-12} kind="role" />
      <ArtworkCard x={108} y={27} angle={9} />
      <circle className="art-node art-tone--mint" cx="195" cy="80" r="5" />
    </> : <>
      <path className="art-connection" d="M38 85c10-35 24-50 47-50 27 0 46 21 52 41" />
      <ArtworkCard x={48} y={33} tone="neutral" angle={-9} />
      <g className="art-tone--violet"><circle className="art-halo" cx="166" cy="86" r="40" /><circle className="art-paper" cx="166" cy="86" r="32" /><ArtworkClock x={133} y={53} size={66} /></g>
      <g className="art-tone--mint"><rect className="art-seal" x="160" y="113" width="39" height="22" rx="11" /><path className="art-mark" d="M176 120v8m7-8v8" /></g>
      <circle className="art-node" cx="37" cy="82" r="4" /><path className="art-line art-line--muted" d="M208 64h9m-11 14h6" />
    </>}
  </svg>
}
