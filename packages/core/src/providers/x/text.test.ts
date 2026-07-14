import assert from 'node:assert/strict'
import test from 'node:test'
import { countXPostText, validateXPostText } from './text.js'

test('counts URLs as t.co length', () => {
  assert.equal(countXPostText('See https://example.com/a/very/long/path'), 27)
})

test('rejects empty and overlong posts', () => {
  assert.equal(validateXPostText('').ok, false)
  assert.equal(validateXPostText('x'.repeat(281)).ok, false)
})
