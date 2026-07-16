import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { FollowerSearchMatch, FollowerSearchResult } from '@ilo/core'
import Table from 'cli-table3'
import pc from 'picocolors'

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

export const renderFollowerSearch = (
  result: FollowerSearchResult,
  displayLimit: number,
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

  const width = Math.max(112, Math.min(process.stdout.columns ?? 120, 160))
  const evidenceWidth = width - 70
  const evidence = new Table({
    head: [
      pc.bold('Company'),
      pc.bold('Match'),
      pc.bold('Account'),
      pc.bold('Followers'),
      pc.bold('Evidence'),
    ],
    colWidths: [16, 10, 26, 12, evidenceWidth],
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

  const coverage = result.coverage.complete
    ? `${number.format(result.coverage.importedProfiles)} profiles indexed`
    : `${number.format(result.coverage.importedProfiles)} profiles indexed; import is partial`
  const sections = [
    pc.bold(`Follower search for @${result.handle}`),
    pc.dim(coverage),
    '',
    summary.toString(),
  ]
  if (evidence.length > 0) {
    sections.push('', pc.bold('Matching profiles'), evidence.toString())
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
