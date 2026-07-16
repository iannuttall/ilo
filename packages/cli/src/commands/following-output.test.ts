import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { stripVTControlCharacters } from 'node:util'
import type { FollowingSearchResult } from '@ilo/core'
import {
  followingCoverageLines,
  renderFollowingSearch,
  writeFollowingSearchCsv,
} from './following-output.js'

const result = (
  input: Partial<FollowingSearchResult> = {},
): FollowingSearchResult => ({
  handle: 'owner',
  query: 'building browser tools',
  engine: 'sqlite_fts5',
  resultLimit: null,
  totalMatches: 1,
  truncated: false,
  coverage: {
    complete: true,
    completionReason: 'provider_end',
    importedProfiles: 1,
    searchableProfiles: 1,
    profileDataVersion: 1,
    expectedFollowing: 1,
    updatedAt: Date.now(),
    completedAt: Date.now(),
    lastError: null,
    ageMs: 1_000,
    stale: false,
    staleAfterMs: 86_400_000,
  },
  results: [
    {
      id: 'profile-id',
      handle: 'browser_builder',
      name: 'Browser Builder',
      bio: 'Building browser tools for designers without squeezing this biography into a brittle terminal table.',
      location: 'London',
      profileUrl: 'https://x.com/browser_builder',
      avatarUrl: 'https://cdn.example/avatar.jpg',
      bannerUrl: null,
      followers: 1_200,
      following: 240,
      posts: 800,
      likes: 3_000,
      mediaCount: 75,
      joinedAt: 'Mon Jan 02 00:00:00 +0000 2023',
      websiteUrl: 'https://browser.tools',
      websiteDisplayUrl: 'browser.tools',
      verified: true,
      verificationType: 'blue',
      protected: false,
      fetchedAt: Date.now(),
      evidence: 'Building browser tools for designers · Location: London',
    },
  ],
  ...input,
})

test('renders stacked profiles without breaking a normal terminal width', () => {
  const output = stripVTControlCharacters(renderFollowingSearch(result(), 80))

  assert.match(output, /Browser Builder @browser_builder · 1,200 followers/)
  assert.match(output, /Building browser tools for designers/)
  assert.match(output, /1 followed profile matches "building browser tools"/)
  assert.doesNotMatch(output, /Name\s+│/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 80),
    output,
  )
})

test('explains an explicit result limit without hiding the total count', () => {
  const output = stripVTControlCharacters(
    renderFollowingSearch(
      result({ resultLimit: 1, totalMatches: 14, truncated: true }),
      96,
    ),
  )

  assert.match(output, /14 followed profiles match/)
  assert.match(output, /Showing 1 of 14 matches/)
  assert.match(output, /Remove --limit to show every match/)
})

test('explains partial, stale, and legacy caches with an action', () => {
  const partial = followingCoverageLines(
    {
      complete: false,
      completionReason: null,
      importedProfiles: 80,
      searchableProfiles: 80,
      profileDataVersion: 1,
      expectedFollowing: 100,
      updatedAt: 1,
      completedAt: null,
      lastError: null,
      ageMs: 90_000_000,
      stale: true,
      staleAfterMs: 86_400_000,
    },
    'owner',
  )
  assert.match(partial.join('\n'), /80 followed profiles are searchable so far/)
  assert.match(partial.join('\n'), /Roughly 20 profiles may still be missing/)
  assert.match(partial.join('\n'), /ilo x following sync owner --all/)

  const legacy = followingCoverageLines(
    {
      complete: true,
      completionReason: 'provider_end',
      importedProfiles: 100,
      searchableProfiles: 0,
      profileDataVersion: 0,
      expectedFollowing: 100,
      updatedAt: 1,
      completedAt: 1,
      lastError: null,
      ageMs: 1,
      stale: false,
      staleAfterMs: 86_400_000,
    },
    'owner',
  )
  assert.match(legacy.join('\n'), /complete profiles have not been indexed/)
  assert.match(legacy.join('\n'), /ilo x following sync owner --all/)
})

test('exports every supplied profile with coverage metadata and safe cells', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ilo-following-csv-'))
  const path = join(directory, 'exports', 'following.csv')
  const csvResult = result()
  const profile = csvResult.results[0]
  assert.ok(profile)
  csvResult.results[0] = { ...profile, name: '=unsafe formula' }

  try {
    const written = await writeFollowingSearchCsv(csvResult, path)
    const contents = await readFile(path, 'utf8')

    assert.equal(written.rows, 1)
    assert.match(contents, /source_profiles_indexed/)
    assert.match(contents, /"'=unsafe formula"/)
    assert.match(contents, /"browser_builder"/)
    assert.match(contents, /"building browser tools"/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
