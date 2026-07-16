import assert from 'node:assert/strict'
import test from 'node:test'
import { friendlyErrorMessage } from './utils.js'

test('explains publishing account errors without hiding provider details', () => {
  assert.match(
    friendlyErrorMessage(new Error('publishing_account_ambiguous')),
    /ilo accounts list/,
  )
  assert.match(
    friendlyErrorMessage(new Error('typefully_image_alt_text_unsupported')),
    /direct X account/,
  )
  assert.equal(
    friendlyErrorMessage(new Error('typefully_api_error_429:rate limit')),
    'typefully_api_error_429:rate limit',
  )
})
