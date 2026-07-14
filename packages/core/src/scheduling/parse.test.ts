import assert from 'node:assert/strict'
import test from 'node:test'
import { parseScheduleTime } from './parse.js'

test('parses relative schedule times', () => {
  const result = parseScheduleTime('in 2 hours', {
    now: 1_000,
    timezone: 'UTC',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.scheduledFor, 7_201_000)
})

test('parses local tomorrow times', () => {
  const result = parseScheduleTime('tomorrow at 9am', {
    now: Date.parse('2026-07-14T12:00:00Z'),
    timezone: 'Europe/London',
  })
  assert.equal(result.ok, true)
  if (result.ok)
    assert.equal(
      new Date(result.scheduledFor).toISOString(),
      '2026-07-15T08:00:00.000Z',
    )
})
