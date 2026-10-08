import type { GameMode } from './gameEngine'

export const MIN_GAME_ITEMS = 2
/** Board modes display every pair at once. Keep the old board limit export. */
export const MAX_GAME_ITEMS = 8
export const MAX_SEQUENCE_ITEMS = 100
export const MIN_GAME_SECONDS = 1
export const MAX_GAME_SECONDS = 300

export type GamePreset = Readonly<{ label: string; size: number; limit: number }>
const BOARD_PRESETS: readonly GamePreset[] = Object.freeze([
  Object.freeze({ label: 'Разминка', size: 4, limit: 60 }),
  Object.freeze({ label: 'Обычный', size: 6, limit: 120 }),
  Object.freeze({ label: 'Марафон', size: 8, limit: 180 }),
])
const SEQUENCE_PRESETS: readonly GamePreset[] = Object.freeze([
  Object.freeze({ label: 'Разминка', size: 5, limit: 60 }),
  Object.freeze({ label: 'Обычный', size: 15, limit: 120 }),
  Object.freeze({ label: 'Марафон', size: 30, limit: 300 }),
])

/** The actual round must also be capped by the number of selected employees. */
export function gameItemLimit(mode: GameMode): number {
  return mode === 'quiz' || mode === 'truth' ? MAX_SEQUENCE_ITEMS : MAX_GAME_ITEMS
}

export function gamePresets(mode: GameMode): readonly GamePreset[] {
  return mode === 'quiz' || mode === 'truth' ? SEQUENCE_PRESETS : BOARD_PRESETS
}

export function gameSetting(value: string, min: number, max: number): number | null {
  if (!value.trim()) return null
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max ? number : null
}
