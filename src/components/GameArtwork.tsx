import type { GameMode } from '../lib/gameEngine'
import { ArtworkBriefcase, ArtworkCard, ArtworkCheck, ArtworkClock, ArtworkPortrait } from './LearningArtwork'
import '../styles/artwork.css'

export default function GameArtwork({ mode }: { mode: GameMode }) {
  return <svg className={`app-artwork game-artwork game-artwork--${mode}`} viewBox="0 0 240 150" fill="none" aria-hidden="true" focusable="false">
    <ellipse className="art-ground" cx="120" cy="135" rx="91" ry="7" />
    {mode === 'match' ? <>
      <path className="art-connection" d="M78 61c31-42 54-41 84 0M78 89c31 38 54 39 84 0" />
      <ArtworkCard x={23} y={29} angle={-5} />
      <ArtworkCard x={152} y={29} tone="mint" angle={5} kind="role" />
      <g className="art-tone--mint"><circle className="art-paper" cx="120" cy="75" r="20" /><path className="art-mark" d="m110 78 7-7a6 6 0 0 1 9 9l-5 5m8-13-7 7a6 6 0 0 1-9-9l5-5" /></g>
      <circle className="art-node" cx="120" cy="27" r="4" /><circle className="art-node art-tone--mint" cx="120" cy="121" r="4" />
    </> : mode === 'quiz' ? <>
      <path className="art-connection" d="M88 56h29m0 0v55m0-55V32m0 0h19m-19 40h19m-19 39h19" />
      <ArtworkCard x={25} y={24} />
      <g className="art-tone--neutral"><rect className="art-card" x="132" y="19" width="79" height="27" rx="9" /><path className="art-line art-line--muted" d="M148 32h43" /><rect className="art-card" x="132" y="98" width="79" height="27" rx="9" /><path className="art-line art-line--muted" d="M148 111h32" /></g>
      <g className="art-tone--mint"><rect className="art-seal" x="128" y="58" width="87" height="28" rx="9" /><ArtworkCheck x={136} y={64} size={17} /><path className="art-mark" d="M160 72h38" /></g>
      <g className="art-tone--violet"><circle className="art-paper" cx="72" cy="118" r="19" /><ArtworkClock x={53} y={99} size={38} /></g>
    </> : mode === 'truth' ? <>
      <g className="art-tone--violet"><rect className="art-card-shadow" x="43" y="20" width="160" height="67" rx="17" /><rect className="art-card" x="40" y="15" width="160" height="67" rx="17" /><circle className="art-soft" cx="72" cy="48" r="20" /><ArtworkPortrait x={58} y={33} size={28} /><path className="art-line" d="M105 37h22m-22 13h15M135 27v43" /><ArtworkBriefcase x={149} y={33} size={30} /></g>
      <path className="art-connection" d="M120 82v15m-41 0h82m-82 0v14m82-14v14" />
      <g className="art-tone--mint"><rect className="art-seal" x="53" y="109" width="53" height="29" rx="11" /><ArtworkCheck x={69} y={114} size={20} /></g>
      <g className="art-tone--violet"><rect className="art-soft art-bordered" x="134" y="109" width="53" height="29" rx="11" /><path className="art-mark" d="m155 118 11 11m0-11-11 11" /></g>
    </> : <>
      <path className="art-connection" d="M36 36c22-29 79-29 105-8m47 82c-13 28-44 37-72 28" />
      <ArtworkCard x={29} y={40} tone="neutral" angle={-16} kind="back" />
      <ArtworkCard x={84} y={22} angle={-2} kind="back" />
      <ArtworkCard x={145} y={39} tone="mint" angle={13} />
      <path className="art-direction" d="m132 16 12 13-18 2m3 99-15 7 9 11" />
      <g className="art-tone--mint"><circle className="art-paper" cx="193" cy="112" r="15" /><ArtworkCheck x={183} y={101} size={21} /></g>
    </>}
  </svg>
}
