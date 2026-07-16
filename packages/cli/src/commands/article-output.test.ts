import assert from 'node:assert/strict'
import test from 'node:test'
import { stripVTControlCharacters } from 'node:util'
import type { XArticleMonitor, XArticleSearchResult } from '@ilo/core'
import { renderXArticleMonitors, renderXArticles } from './article-output.js'

const monitor: XArticleMonitor = {
  id: '12345678-1234-1234-1234-123456789abc',
  accountHandle: 'owner',
  sourceHandle: 'swyx',
  enabled: true,
  newestPostId: '200',
  cursor: 'older-page',
  historyComplete: false,
  createdAt: Date.UTC(2026, 6, 16),
  updatedAt: Date.UTC(2026, 6, 16),
  lastCheckedAt: Date.UTC(2026, 6, 16),
  lastError: null,
}

const article: XArticleSearchResult = {
  articleId: 'article-200',
  postId: '200',
  url: 'https://x.com/swyx/status/200',
  title: 'Building browser tools with agents',
  previewText: 'A detailed write-up.',
  excerpt:
    'A detailed write-up about browser automation, useful agent tools, and deterministic tests.',
  bodyCharacters: 9_000,
  coverImageUrl: null,
  createdAt: Date.UTC(2026, 6, 16),
  modifiedAt: Date.UTC(2026, 6, 16),
  postCreatedAt: Date.UTC(2026, 6, 16),
  author: {
    id: 'swyx-id',
    handle: 'swyx',
    name: 'Shawn Wang',
    bio: 'Writes technical articles',
    avatarUrl: null,
    followers: 12_000,
    verified: true,
    verificationType: 'individual',
  },
  monitors: [{ id: monitor.id, sourceHandle: 'swyx' }],
  firstSeenAt: Date.UTC(2026, 6, 16),
  lastSeenAt: Date.UTC(2026, 6, 16),
}

test('renders article monitors with resumable history state', () => {
  const output = stripVTControlCharacters(
    renderXArticleMonitors('owner', [monitor], 80),
  )
  assert.match(output, /X article monitors for @owner/)
  assert.match(output, /@swyx/)
  assert.match(output, /older history remains/)
})

test('renders saved articles as wrapped stacked results', () => {
  const output = stripVTControlCharacters(renderXArticles([article], 60))
  assert.match(output, /Saved X articles/)
  assert.match(output, /Building browser tools with agents/)
  assert.match(output, /browser automation/)
  for (const line of output.split('\n')) assert.ok(line.length <= 60)
})
