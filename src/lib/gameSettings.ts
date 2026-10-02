export const MIN_GAME_ITEMS = 2
export const MAX_GAME_ITEMS = 8
export const MIN_GAME_SECONDS = 1
export const MAX_GAME_SECONDS = 300

export function gameSetting(value: string, min: number, max: number): number | null {
  if (!value.trim()) return null
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max ? number : null
}
