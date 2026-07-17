import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type {
  FollowingSearchCoverage,
  FollowingSearchResult,
  XFollowingStatus,
} from '@ilo/core'
import pc from 'picocolors'
import { terminalColumns, wrapTerminalText } from '../terminal.js'

const number = new Intl.NumberFormat('en-GB')

type FollowingCoverage = FollowingSearchCoverage | XFollowingStatus

const formatAge = (ageMs: number) => {
  const seconds = Math.floor(ageMs / 1_000)
  if (seconds < 60) return 'less than a minute ago'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)
    return `${number.format(minutes)} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48)
    return `${number.format(hours)} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${number.format(days)} day${days === 1 ? '' : 's'} ago`
}

export const followingCoverageLines = (
  coverage: FollowingCoverage,
  handle: string,
) => {
  if (coverage.profileDataVersion < 1) {
    return [
      `${number.format(coverage.importedProfiles)} followed account IDs are cached, but their complete profiles have not been indexed yet.`,
      `Run ilo x following sync ${handle} --all to build the searchable profile index.`,
    ]
  }

  const searchable = number.format(coverage.searchableProfiles)
  const lines = [
    `${searchable} followed ${coverage.searchableProfiles === 1 ? 'profile is' : 'profiles are'} searchable${coverage.complete ? '.' : ' so far.'}`,
  ]

  if (coverage.complete) {
    lines.push(
      coverage.completionReason === 'reported_count_confirmed'
        ? "The import matched X's reported total and repeated pages added nothing new."
        : 'ilo reached the end of the available following list.',
    )
  } else if (coverage.lastError === 'fxtwitter_following_sync_no_progress') {
    lines.push(
      'The import stopped after repeated pages returned no new profiles.',
    )
  } else if (coverage.lastError === 'fxtwitter_following_cursor_stalled') {
    lines.push('The import stopped because its page cursor did not move.')
  } else if (coverage.lastError) {
    lines.push('The last import stopped before it finished.')
  } else {
    const expected = coverage.expectedFollowing
    if (expected !== null) {
      const missing = Math.max(0, expected - coverage.importedProfiles)
      const estimate = missing
        ? ` Roughly ${number.format(missing)} profiles may still be missing.`
        : ''
      lines.push(
        `X reports about ${number.format(expected)} followed accounts.${estimate}`,
      )
    } else {
      lines.push('The saved import is unfinished.')
    }
  }

  lines.push(`Last updated ${formatAge(coverage.ageMs)}.`)
  if (coverage.stale) {
    lines.push(
      `This local snapshot may be stale. Run ilo x following sync ${handle} --all${coverage.complete ? '' : ' to continue it'}.`,
    )
  } else if (!coverage.complete && !coverage.lastError) {
    lines.push(
      `Run ilo x following sync ${handle} --all to continue from the saved cursor.`,
    )
  }
  return lines
}

const followerCount = (value: number | null) =>
  value === null ? pc.dim('unknown') : number.format(value)

export const renderFollowingSearch = (
  result: FollowingSearchResult,
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  const contentWidth = Math.max(24, columns - 4)
  const divider = pc.dim('─'.repeat(Math.min(contentWidth, 88)))
  const sections = [
    pc.bold(`Following search for @${result.handle}`),
    ...followingCoverageLines(result.coverage, result.handle).map((line) =>
      pc.dim(wrapTerminalText(line, contentWidth)),
    ),
  ]

  if (result.results.length > 0) {
    const profiles = result.results.map((profile) =>
      [
        `${pc.bold(profile.name)} ${pc.cyan(`@${profile.handle}`)} ${pc.dim('·')} ${followerCount(profile.followers)} ${pc.dim('followers')}${profile.verified ? ` ${pc.dim('·')} ${pc.green('verified')}` : ''}`,
        wrapTerminalText(profile.evidence, contentWidth),
        pc.dim(profile.profileUrl),
      ].join('\n'),
    )
    sections.push(
      '',
      pc.bold('Matching profiles'),
      '',
      profiles.join(`\n${divider}\n`),
    )
  } else {
    sections.push('', `No followed profiles matched "${result.query}".`)
  }

  sections.push(
    '',
    pc.bold('Match count'),
    `${number.format(result.totalMatches)} followed ${result.totalMatches === 1 ? 'profile matches' : 'profiles match'} "${result.query}".`,
  )
  if (result.truncated) {
    sections.push(
      pc.dim(
        `Showing ${number.format(result.results.length)} of ${number.format(result.totalMatches)} matches. Remove --limit to show every match.`,
      ),
    )
  }
  return sections.join('\n')
}

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return '""'
  const text = String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

const csvRows = (result: FollowingSearchResult) => {
  const headings = [
    'query',
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
    'source_expected_following',
    'source_complete',
    'source_completion_reason',
    'source_updated_at',
    'source_stale',
    'source_last_error',
  ]
  const rows: unknown[][] = [headings]
  for (const profile of result.results) {
    rows.push([
      result.query,
      profile.evidence,
      profile.id,
      profile.handle,
      profile.name,
      profile.bio,
      profile.location,
      profile.profileUrl,
      profile.avatarUrl,
      profile.bannerUrl,
      profile.followers,
      profile.following,
      profile.posts,
      profile.likes,
      profile.mediaCount,
      profile.joinedAt,
      profile.verified,
      profile.verificationType,
      profile.protected,
      profile.websiteUrl,
      profile.websiteDisplayUrl,
      new Date(profile.fetchedAt).toISOString(),
      result.handle,
      result.coverage.searchableProfiles,
      result.coverage.expectedFollowing,
      result.coverage.complete,
      result.coverage.completionReason,
      new Date(result.coverage.updatedAt).toISOString(),
      result.coverage.stale,
      result.coverage.lastError,
    ])
  }
  return rows
}

export const writeFollowingSearchCsv = async (
  result: FollowingSearchResult,
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
