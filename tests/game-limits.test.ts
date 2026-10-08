import test from 'node:test'
import assert from 'node:assert/strict'
import { gameItemLimit, gamePresets, gameSetting, MAX_GAME_ITEMS, MAX_SEQUENCE_ITEMS, MIN_GAME_ITEMS, MIN_GAME_SECONDS, MAX_GAME_SECONDS } from '../src/lib/gameSettings.ts'

test('board games stay within eight pairs while sequential games permit up to one hundred tasks', () => {
  assert.equal(MAX_GAME_ITEMS, 8)
  assert.equal(MAX_SEQUENCE_ITEMS, 100)
  for (const mode of ['match', 'memory'] as const) {
    assert.equal(gameItemLimit(mode), 8)
    for (const value of ['2', '4', '8']) assert.equal(gameSetting(value, MIN_GAME_ITEMS, gameItemLimit(mode)), Number(value))
    for (const value of ['9', '15', '100']) assert.equal(gameSetting(value, MIN_GAME_ITEMS, gameItemLimit(mode)), null)
  }
  for (const mode of ['quiz', 'truth'] as const) {
    assert.equal(gameItemLimit(mode), 100)
    for (const value of ['2', '9', '15', '30', '99', '100']) assert.equal(gameSetting(value, MIN_GAME_ITEMS, gameItemLimit(mode)), Number(value))
    assert.equal(gameSetting('101', MIN_GAME_ITEMS, gameItemLimit(mode)), null)
  }
})

test('every game rejects counts below two and invalid numeric input', () => {
  assert.equal(MIN_GAME_ITEMS, 2)
  for (const mode of ['match', 'memory', 'quiz', 'truth'] as const) {
    for (const value of ['', ' ', '\n', '0', '1', '-1', '2.5', 'NaN', 'Infinity', '-Infinity', '4people', '2,5']) {
      assert.equal(gameSetting(value, MIN_GAME_ITEMS, gameItemLimit(mode)), null, `${mode}: ${JSON.stringify(value)}`)
    }
  }
})

test('presets match how each mode presents tasks and remain valid within the unchanged time limit', () => {
  for (const mode of ['match', 'memory'] as const) {
    assert.deepEqual(gamePresets(mode).map(({ size, limit }) => [size, limit]), [[4, 60], [6, 120], [8, 180]])
  }
  for (const mode of ['quiz', 'truth'] as const) {
    assert.deepEqual(gamePresets(mode).map(({ size, limit }) => [size, limit]), [[5, 60], [15, 120], [30, 300]])
  }
  for (const mode of ['match', 'memory', 'quiz', 'truth'] as const) {
    const presets = gamePresets(mode)
    assert.equal(new Set(presets.map(preset => preset.label)).size, presets.length)
    for (const preset of presets) {
      assert.equal(gameSetting(String(preset.size), MIN_GAME_ITEMS, gameItemLimit(mode)), preset.size)
      assert.equal(gameSetting(String(preset.limit), MIN_GAME_SECONDS, MAX_GAME_SECONDS), preset.limit)
    }
  }
  assert.equal(MAX_GAME_SECONDS, 300)
  assert.equal(gameSetting('300', MIN_GAME_SECONDS, MAX_GAME_SECONDS), 300)
  assert.equal(gameSetting('301', MIN_GAME_SECONDS, MAX_GAME_SECONDS), null)
})

test('preset data cannot be changed by one screen and silently affect another mode', () => {
  const presets = gamePresets('quiz')
  assert.equal(Reflect.set(presets[0], 'size', 100), false)
  assert.equal(gamePresets('quiz')[0].size, 5)
  assert.deepEqual(gamePresets('memory').map(preset => preset.size), [4, 6, 8])
})
