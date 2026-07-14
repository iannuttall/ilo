import { execFileSync } from 'node:child_process'

const MAX_DIFF_FILES = 12
const MAX_DIFF_CHARS = 6_000
const MAX_FILE_PATCH_CHARS = 1_200

const ghJson = (args) => {
  const output = execFileSync('gh', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return JSON.parse(output)
}

export const getRepoOwnerAndName = () => {
  const repo = ghJson(['repo', 'view', '--json', 'nameWithOwner'])
  const fullName = String(repo?.nameWithOwner || '').trim()
  const [owner, name] = fullName.split('/')
  if (!owner || !name) {
    throw new Error(`invalid_repo_name_with_owner:${fullName || 'unknown'}`)
  }
  return { owner, name }
}

const getLatestMergedPrNumber = () => {
  const pulls = ghJson([
    'pr',
    'list',
    '--state',
    'merged',
    '--base',
    'main',
    '--limit',
    '1',
    '--json',
    'number',
  ])
  const number = pulls?.[0]?.number
  if (!number) throw new Error('no_merged_prs_on_main')
  return number
}

export const getLatestMergedPrNumbers = (limit) => {
  const pulls = ghJson([
    'pr',
    'list',
    '--state',
    'merged',
    '--base',
    'main',
    '--limit',
    String(limit),
    '--json',
    'number',
  ])
  return Array.isArray(pulls)
    ? pulls
        .map((pull) => Number(pull?.number || 0))
        .filter((number) => Number.isFinite(number) && number > 0)
    : []
}

const buildDiffSummary = (files) => {
  const chunks = []
  let totalChars = 0

  for (const file of files.slice(0, MAX_DIFF_FILES)) {
    const path = String(file?.filename || file?.path || '').trim()
    if (!path) continue

    const patch = String(file?.patch || '')
      .trim()
      .slice(0, MAX_FILE_PATCH_CHARS)
      .trim()
    const header = `File: ${path}`
    const body = patch || '(diff omitted)'
    const nextChunk = `${header}\n${body}`.trim()
    const nextLength = totalChars + nextChunk.length + (chunks.length ? 2 : 0)
    if (nextLength > MAX_DIFF_CHARS) break

    chunks.push(nextChunk)
    totalChars = nextLength
  }

  return chunks.join('\n\n')
}

const loadPullRequestFiles = (owner, repo, prNumber) => {
  const pages = ghJson([
    'api',
    `repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
  ])
  return Array.isArray(pages) ? pages : []
}

export const buildMergedPrPayload = (requestedPrNumber) => {
  const prNumber = Number(requestedPrNumber || getLatestMergedPrNumber())
  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    throw new Error(`invalid_pr_number:${requestedPrNumber || ''}`)
  }

  const { owner, name } = getRepoOwnerAndName()
  const files = loadPullRequestFiles(owner, name, prNumber)
  const pr = ghJson([
    'pr',
    'view',
    String(prNumber),
    '--json',
    [
      'number',
      'title',
      'body',
      'mergedAt',
      'url',
      'author',
      'labels',
      'baseRefName',
    ].join(','),
  ])

  if (String(pr?.baseRefName || '') !== 'main') {
    throw new Error(`pr_not_merged_to_main:${prNumber}`)
  }

  return {
    prNumber,
    payload: {
      sourceType: 'pull_request',
      sourceId: String(pr.number),
      repoOwner: owner,
      repoName: name,
      title: String(pr.title || ''),
      body: String(pr.body || ''),
      diffSummary: buildDiffSummary(files),
      eventAt: pr.mergedAt || new Date().toISOString(),
      sourceUrl: String(pr.url || ''),
      authorLogin: String(pr.author?.login || ''),
      authorName: String(pr.author?.name || pr.author?.login || ''),
      labels: Array.isArray(pr.labels)
        ? pr.labels
            .map((label) => String(label?.name || '').trim())
            .filter(Boolean)
        : [],
    },
  }
}
