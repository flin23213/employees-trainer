import test from 'node:test'
import assert from 'node:assert/strict'
import { gameSetting, MIN_GAME_ITEMS, MAX_GAME_ITEMS, MIN_GAME_SECONDS, MAX_GAME_SECONDS } from '../src/lib/gameSettings.ts'

test('custom round settings accept exact seconds including both boundaries', () => {
  for (const seconds of [1, 73, 299, 300]) assert.equal(gameSetting(String(seconds), MIN_GAME_SECONDS, MAX_GAME_SECONDS), seconds)
  for (const count of [2, 3, 7, 8]) assert.equal(gameSetting(String(count), MIN_GAME_ITEMS, MAX_GAME_ITEMS), count)
})

test('blank, fractional and out-of-range settings cannot start a round', () => {
  for (const value of ['', ' ', '0', '-1', '301', '1.5', 'NaN', 'Infinity']) assert.equal(gameSetting(value, MIN_GAME_SECONDS, MAX_GAME_SECONDS), null)
  for (const value of ['', '1', '9', '2.5']) assert.equal(gameSetting(value, MIN_GAME_ITEMS, MAX_GAME_ITEMS), null)
})
