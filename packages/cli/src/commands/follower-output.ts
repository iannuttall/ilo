import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { FollowerSearchMatch, FollowerSearchResult } from '@ilo/core'
import Table from 'cli-table3'
import pc from 'picocolors'
import { terminalColumns, wrapTerminalText } from '../terminal.js'

const number = new Intl.NumberFormat('en-GB')

const borderStyle = {
  border: ['gray'],
  head: [],
  'padding-left': 1,
  'padding-right': 1,
}

const classification = (match: FollowerSearchMatch['match']) => {
  if (match === 'current') return pc.green('current')
  if (match === 'former') return pc.yellow('former')
  return pc.dim('unclear')
}

const followerCount = (value: number | null) =>
  value === null ? pc.dim('unknown') : number.format(value)

type FollowerCoverage = FollowerSearchResult['coverage']

export const followerCoverageLines = (
  coverage: FollowerCoverage,
  handle: string,
  options: { showResume?: boolean } = {},
) => {
  const imported = number.format(coverage.importedProfiles)
  if (coverage.complete) {
    return [
      `${imported} follower profiles are searchable. The full available follower list was imported.`,
    ]
  }

  const lines = [`${imported} follower profiles are searchable so far.`]
  const expected = coverage.expectedFollowers
  const missing =
    expected === null ? null : Math.max(0, expected - coverage.importedProfiles)

  if (coverage.lastError === 'fxtwitter_follower_sync_no_progress') {
    const stopped = ['Import stopped after repeated duplicate pages.']
    if (expected !== null && missing && missing > 0) {
      stopped.push(
        `X reports about ${number.format(expected)} followers, so roughly ${number.format(missing)} profiles may be missing.`,
      )
    } else if (expected !== null) {
      stopped.push(
        `X reports about ${number.format(expected)} followers; its total can include profiles that are unavailable to import.`,
      )
    }
    lines.push(stopped.join(' '))
    return lines
  }

  if (coverage.lastError === 'fxtwitter_follower_cursor_stalled') {
    lines.push('The last import stopped because its page cursor did not move.')
    return lines
  }

  if (coverage.lastError) {
    lines.push(
      `The last import stopped before finishing. Run ilo x followers status ${handle} for details.`,
    )
    return lines
  }

  if (expected !== null) {
    const remaining =
      missing && missing > 0
        ? `, so roughly ${number.format(missing)} profiles may still be missing`
        : ''
    lines.push(
      `The import has not reached a confirmed end. X reports about ${number.format(expected)} followers${remaining}.`,
    )
  } else {
    lines.push('The import has not reached a confirmed end.')
  }
  if (options.showResume !== false) {
    lines.push(
      `Run ilo x followers sync ${handle} --all to continue or retry the remaining pages.`,
    )
  }
  return lines
}

const renderWideEvidence = (
  result: FollowerSearchResult,
  displayLimit: number,
  columns: number,
) => {
  const targetWidth = Math.min(columns - 4, 156)
  const evidenceWidth = targetWidth - 69
  const evidence = new Table({
    head: [
      pc.bold('Company'),
      pc.bold('Match'),
      pc.bold('Account'),
      pc.bold('Followers'),
      pc.bold('Evidence'),
    ],
    colWidths: [14, 10, 25, 14, evidenceWidth],
    colAligns: ['left', 'left', 'left', 'right', 'left'],
    style: borderStyle,
    wordWrap: true,
  })
  for (const group of result.groups) {
    for (const match of group.results.slice(0, displayLimit)) {
      evidence.push([
        group.term,
        classification(match.match),
        `${match.name}\n${pc.cyan(`@${match.handle}`)}`,
        followerCount(match.followers),
        match.evidence.replace(/\s+/g, ' ').trim(),
      ])
    }
  }
  return evidence
}

const renderStackedEvidence = (
  result: FollowerSearchResult,
  displayLimit: number,
  columns: number,
) => {
  const blocks: string[] = []
  const contentWidth = Math.max(24, columns - 4)
  for (const group of result.groups) {
    for (const match of group.results.slice(0, displayLimit)) {
      blocks.push(
        [
          `${pc.bold(group.term)} ${pc.dim('·')} ${classification(match.match)}`,
          `${match.name} ${pc.cyan(`@${match.handle}`)} ${pc.dim('·')} ${followerCount(match.followers)} ${pc.dim('followers')}`,
          wrapTerminalText(match.evidence, contentWidth),
          pc.dim(match.profileUrl),
        ].join('\n'),
      )
    }
  }
  const divider = pc.dim('─'.repeat(Math.min(contentWidth, 88)))
  return blocks.join(`\n${divider}\n`)
}

export const renderFollowerSearch = (
  result: FollowerSearchResult,
  displayLimit: number,
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const summary = new Table({
    head: [
      pc.bold('Company'),
      pc.bold('Current'),
      pc.bold('Former'),
      pc.bold('Unclear'),
      pc.bold('Candidates'),
    ],
    colAligns: ['left', 'right', 'right', 'right', 'right'],
    style: borderStyle,
  })
  for (const group of result.groups) {
    summary.push([
      group.term,
      pc.green(number.format(group.current)),
      pc.yellow(number.format(group.former)),
      pc.dim(number.format(group.unclear)),
      number.format(group.candidates),
    ])
  }

  const columns = terminalColumns(requestedColumns)
  const matchingProfiles = result.groups.reduce(
    (total, group) => total + Math.min(displayLimit, group.results.length),
    0,
  )
  const coverage = followerCoverageLines(
    result.coverage,
    result.handle,
  ).flatMap((line) =>
    wrapTerminalText(line, Math.max(24, columns - 4)).split('\n'),
  )
  const sections = [
    pc.bold(`Follower search for @${result.handle}`),
    ...coverage.map((line) => pc.dim(line)),
    '',
    summary.toString(),
  ]
  if (matchingProfiles > 0) {
    const evidence =
      columns >= 132
        ? renderWideEvidence(result, displayLimit, columns).toString()
        : renderStackedEvidence(result, displayLimit, columns)
    sections.push('', pc.bold('Matching profiles'), '', evidence)
  }
  for (const group of result.groups) {
    if (group.truncated) {
      sections.push(
        '',
        pc.yellow(
          `${group.term}: candidate limit reached; raise --candidates for a fuller count.`,
        ),
      )
    }
  }
  return sections.join('\n')
}

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return '""'
  const text = String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

const csvRows = (result: FollowerSearchResult) => {
  const headings = [
    'company',
    'classification',
    'evidence',
    'id',
    'handle',
    'name',
    'bio',
    'location',
    'profile_url',
    'avatar_url',
    'banner_url',
    'followers',
    'following',
    'posts',
    'likes',
    'media_count',
    'joined_at',
    'verified',
    'verification_type',
    'protected',
    'website_url',
    'website_display_url',
    'fetched_at',
    'source_account',
    'source_profiles_indexed',
    'source_expected_followers',
    'source_complete',
    'source_last_error',
  ]
  const rows: unknown[][] = [headings]
  for (const group of result.groups) {
    for (const match of group.results) {
      rows.push([
        group.term,
        match.match,
        match.evidence,
        match.id,
        match.handle,
        match.name,
        match.bio,
        match.location,
        match.profileUrl,
        match.avatarUrl,
        match.bannerUrl,
        match.followers,
        match.following,
        match.posts,
        match.likes,
        match.mediaCount,
        match.joinedAt,
        match.verified,
        match.verificationType,
        match.protected,
        match.websiteUrl,
        match.websiteDisplayUrl,
        new Date(match.fetchedAt).toISOString(),
        result.handle,
        result.coverage.importedProfiles,
        result.coverage.expectedFollowers,
        result.coverage.complete,
        result.coverage.lastError,
      ])
    }
  }
  return rows
}

export const writeFollowerSearchCsv = async (
  result: FollowerSearchResult,
  requestedPath: string,
) => {
  const path = resolve(requestedPath)
  const rows = csvRows(result)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(
    path,
    `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`,
    'utf8',
  )
  return { path, rows: rows.length - 1 }
}
