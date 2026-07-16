import assert from 'node:assert/strict'
import test from 'node:test'
import { stripVTControlCharacters } from 'node:util'
import type { FollowerSearchResult } from '@ilo/core'
import {
  followerCoverageLines,
  renderFollowerSearch,
} from './follower-output.js'

const result = (
  coverage: FollowerSearchResult['coverage'],
): FollowerSearchResult => ({
  handle: 'adamwathan',
  query: 'works at cursor',
  engine: 'sqlite_fts5',
  resultLimit: null,
  includedMatchKinds: ['current'],
  coverage,
  groups: [
    {
      term: 'cursor',
      current: 1,
      former: 0,
      unclear: 0,
      candidates: 1,
      truncated: false,
      results: [
        {
          id: '123',
          handle: 'leerob',
          name: 'Lee Robinson',
          bio: 'Model behavior @cursorai. Helping train useful models.',
          location: '',
          profileUrl: 'https://x.com/leerob',
          avatarUrl: null,
          bannerUrl: null,
          followers: 270_142,
          following: 1_000,
          posts: 10_000,
          likes: 2_000,
          mediaCount: 500,
          joinedAt: null,
          websiteUrl: null,
          websiteDisplayUrl: null,
          verified: true,
          verificationType: 'blue',
          protected: false,
          fetchedAt: 1,
          match: 'current',
          evidence:
            'Model behavior @cursorai. Helping train useful models without forcing this biography into a terminal column that is too narrow.',
        },
      ],
    },
  ],
})

test('uses stacked matching profiles in a normal-width terminal', () => {
  const output = stripVTControlCharacters(
    renderFollowerSearch(
      result({
        complete: false,
        importedProfiles: 292_136,
        expectedFollowers: 294_202,
        updatedAt: 1,
        lastError: 'fxtwitter_follower_sync_no_progress',
      }),
      96,
    ),
  )
  const matchingProfiles = output.split('Matching profiles')[1] ?? ''

  assert.match(matchingProfiles, /cursor · current/)
  assert.match(matchingProfiles, /Lee Robinson @leerob · 270,142 followers/)
  assert.match(matchingProfiles, /https:\/\/x\.com\/leerob/)
  assert.doesNotMatch(matchingProfiles, /Company\s+│/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 96),
    output,
  )
})

test('keeps the wide evidence table inside the terminal width', () => {
  const output = stripVTControlCharacters(
    renderFollowerSearch(
      result({
        complete: true,
        importedProfiles: 1,
        expectedFollowers: 1,
        updatedAt: 1,
        lastError: null,
      }),
      160,
    ),
  )

  assert.match(output, /Company\s+│\s+Match\s+│\s+Account/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 156),
    output,
  )
})

test('explains a stopped near-complete import in plain language', () => {
  assert.deepEqual(
    followerCoverageLines(
      {
        complete: false,
        importedProfiles: 292_136,
        expectedFollowers: 294_202,
        updatedAt: 1,
        lastError: 'fxtwitter_follower_sync_no_progress',
      },
      'adamwathan',
    ),
    [
      '292,136 follower profiles are searchable.',
      'The import stopped after repeated pages returned no new profiles. X reports about 294,202 followers, so roughly 2,066 profiles may be missing.',
    ],
  )
})

test('puts complete counts below the profiles and explains an explicit limit', () => {
  const search = result({
    complete: false,
    importedProfiles: 292_136,
    expectedFollowers: 294_202,
    updatedAt: 1,
    lastError: null,
  })
  search.resultLimit = 3
  const group = search.groups[0]
  assert.ok(group)
  search.groups[0] = {
    ...group,
    current: 15,
    former: 1,
    unclear: 151,
    candidates: 167,
  }

  const output = stripVTControlCharacters(renderFollowerSearch(search, 96))

  assert.match(output, /Showing up to 3 profiles per company/)
  assert.match(output, /cursor · 167 profiles found/)
  assert.match(output, /15 current · 1 former · 151 unclear/)
  assert.match(
    output,
    /Add --include-former or --include-unclear to list those profiles\./,
  )
  assert.doesNotMatch(output, /Company\s+│\s+Current/)
  assert.ok(output.indexOf('Match counts') > output.indexOf('@leerob'), output)
})

test('explains an unfinished saved import without implying it is running', () => {
  assert.deepEqual(
    followerCoverageLines(
      {
        complete: false,
        importedProfiles: 292_136,
        expectedFollowers: 294_202,
        updatedAt: 1,
        lastError: null,
      },
      'adamwathan',
    ),
    [
      '292,136 follower profiles are searchable.',
      'The saved import is unfinished. X reports about 294,202 followers, so roughly 2,066 profiles may still be missing.',
      'Run ilo x followers sync adamwathan --all to continue from the saved cursor.',
    ],
  )
})
