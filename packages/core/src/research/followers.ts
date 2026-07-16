import {
  type FxTwitterClientOptions,
  type FxTwitterFollowersPage,
  type FxTwitterUser,
  fetchFxTwitterFollowers,
  fetchFxTwitterProfile,
} from '../providers/x/fxtwitter.js'
import {
  type FollowerSearchRow,
  type FollowerSyncState,
  getFollowerProfile,
  getFollowerSyncState,
  markFollowerSyncError,
  type StoredXProfile,
  searchFollowerRows,
  startFollowerSync,
  storeFollowerPage,
} from '../storage/followers.js'

const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/
const GENERIC_HANDLE_PREFIXES = ['get', 'use', 'try', 'join', 'go']

export const X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT = 25

export type FollowerResearchClient = {
  profile(handle: string): Promise<FxTwitterUser>
  followers(
    handle: string,
    input: { count: number; cursor: string | null },
  ): Promise<FxTwitterFollowersPage>
}

export type XFollowerSyncInput = {
  handle: string
  maxPages?: number
  restart?: boolean
  databasePath?: string
  fxtwitter?: FxTwitterClientOptions
  onPage?: (state: FollowerSyncState) => void
}

export type FollowerMatchKind = 'current' | 'former' | 'unclear'

export type FollowerSearchMatch = {
  id: string
  handle: string
  name: string
  bio: string
  location: string
  profileUrl: string
  avatarUrl: string | null
  bannerUrl: string | null
  followers: number | null
  following: number | null
  posts: number | null
  likes: number | null
  mediaCount: number | null
  joinedAt: string | null
  websiteUrl: string | null
  websiteDisplayUrl: string | null
  verified: boolean
  verificationType: string | null
  protected: boolean
  fetchedAt: number
  match: FollowerMatchKind
  evidence: string
}

export type FollowerSearchGroup = {
  term: string
  current: number
  former: number
  unclear: number
  candidates: number
  truncated: boolean
  results: FollowerSearchMatch[]
}

export type FollowerSearchResult = {
  handle: string
  query: string
  engine: 'sqlite_fts5'
  resultLimit: number | null
  includedMatchKinds: FollowerMatchKind[]
  coverage: {
    complete: boolean
    importedProfiles: number
    expectedFollowers: number | null
    updatedAt: number
    lastError: string | null
  }
  groups: FollowerSearchGroup[]
}

export type XFollowerProfile = Omit<
  StoredXProfile,
  'aliases' | 'providerDataJson'
> & {
  providerData: FxTwitterUser | null
}

export type XFollowerProfileResult = {
  handle: string
  coverage: FollowerSearchResult['coverage']
  profile: XFollowerProfile
}

export const normalizeXHandle = (input: string) => {
  const value =
    input
      .trim()
      .replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '')
      .split(/[/?#]/, 1)
      .at(0)
      ?.replace(/^@/, '') ?? ''
  if (!X_HANDLE.test(value)) throw new Error('invalid_x_handle')
  return value
}

const splitIdentifier = (input: string) => {
  const separated = input
    .replace(/^@/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .toLowerCase()
  const tokens = separated.match(/[a-z0-9]+/g) ?? []
  const aliases = new Set(tokens)
  aliases.add(tokens.join(''))
  for (const token of tokens) {
    for (const prefix of GENERIC_HANDLE_PREFIXES) {
      if (token.startsWith(prefix) && token.length >= prefix.length + 3) {
        aliases.add(token.slice(prefix.length))
      }
    }
  }
  return [...aliases].filter(Boolean)
}

export const buildProfileAliases = (profile: FxTwitterUser) => {
  const identifiers = new Set([profile.screen_name])
  for (const match of profile.description?.matchAll(/@([A-Za-z0-9_]{1,15})/g) ??
    []) {
    if (match[1]) identifiers.add(match[1])
  }
  return [...new Set([...identifiers].flatMap(splitIdentifier))].join(' ')
}

const toStoredProfile = (
  profile: FxTwitterUser,
  fetchedAt = Date.now(),
): StoredXProfile => ({
  id: profile.id,
  handle: profile.screen_name,
  name: profile.name,
  bio: profile.description?.trim() ?? '',
  location: profile.location?.trim() ?? '',
  profileUrl: `https://x.com/${profile.screen_name}`,
  avatarUrl: profile.avatar_url ?? null,
  bannerUrl: profile.banner_url ?? null,
  followers: profile.followers ?? null,
  following: profile.following ?? null,
  posts: profile.statuses ?? null,
  likes: profile.likes ?? null,
  mediaCount: profile.media_count ?? null,
  joinedAt: profile.joined ?? null,
  websiteUrl: profile.website?.url ?? null,
  websiteDisplayUrl: profile.website?.display_url ?? null,
  verified: Boolean(profile.verification?.verified),
  verificationType: profile.verification?.type ?? null,
  protected: Boolean(profile.protected),
  aliases: buildProfileAliases(profile),
  providerDataJson: JSON.stringify(profile),
  fetchedAt,
})

const defaultClient = (
  options: FxTwitterClientOptions = {},
): FollowerResearchClient => ({
  profile: (handle) => fetchFxTwitterProfile(handle, options),
  followers: (handle, input) => fetchFxTwitterFollowers(handle, input, options),
})

export const syncXFollowers = async (
  input: XFollowerSyncInput,
  client: FollowerResearchClient = defaultClient(input.fxtwitter),
) => {
  const handle = normalizeXHandle(input.handle)
  const maxPages = input.maxPages ?? 20
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10_000) {
    throw new Error('invalid_follower_page_limit')
  }
  const subject = await client.profile(handle)
  let state = startFollowerSync({
    subject: {
      id: subject.id,
      handle: subject.screen_name,
      name: subject.name,
      expectedFollowers: subject.followers ?? null,
    },
    restart: input.restart,
    path: input.databasePath,
  })

  try {
    let pagesWithoutProgress = 0
    for (let page = 0; page < maxPages && !state.complete; page += 1) {
      const result = await client.followers(subject.screen_name, {
        count: 100,
        cursor: state.cursor,
      })
      if (result.nextCursor && result.nextCursor === state.cursor) {
        throw new Error('fxtwitter_follower_cursor_stalled')
      }
      const now = Date.now()
      const previousProfileCount = state.importedProfiles
      state = storeFollowerPage({
        handle: subject.screen_name,
        syncId: state.syncId,
        profiles: result.profiles.map((profile) =>
          toStoredProfile(profile, now),
        ),
        nextCursor: result.nextCursor,
        path: input.databasePath,
        now,
      })
      input.onPage?.(state)
      pagesWithoutProgress =
        !state.complete && state.importedProfiles === previousProfileCount
          ? pagesWithoutProgress + 1
          : 0
      if (pagesWithoutProgress >= X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT) {
        throw new Error('fxtwitter_follower_sync_no_progress')
      }
    }
    return state
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    markFollowerSyncError({
      handle: subject.screen_name,
      syncId: state.syncId,
      error: message,
      path: input.databasePath,
    })
    throw error
  }
}

export const syncAllXFollowers = async (
  input: Omit<XFollowerSyncInput, 'maxPages'>,
  client: FollowerResearchClient = defaultClient(input.fxtwitter),
) => {
  let restart = input.restart
  while (true) {
    const state = await syncXFollowers(
      { ...input, maxPages: 10_000, restart },
      client,
    )
    if (state.complete) return state
    restart = false
  }
}

export const getXFollowersStatus = (input: {
  handle: string
  databasePath?: string
}) => getFollowerSyncState(normalizeXHandle(input.handle), input.databasePath)

const parseProviderData = (value: string): FxTwitterUser | null => {
  try {
    const data = JSON.parse(value) as unknown
    return data && typeof data === 'object' && 'id' in data
      ? (data as FxTwitterUser)
      : null
  } catch {
    return null
  }
}

export const getXFollowerProfile = (input: {
  handle: string
  followerHandle: string
  databasePath?: string
}): XFollowerProfileResult => {
  const handle = normalizeXHandle(input.handle)
  const followerHandle = normalizeXHandle(input.followerHandle)
  const state = getFollowerSyncState(handle, input.databasePath)
  if (!state) throw new Error('follower_data_not_synced')
  const stored = getFollowerProfile({
    handle,
    followerHandle,
    path: input.databasePath,
  })
  if (!stored) throw new Error('follower_profile_not_found')
  const { aliases: _aliases, providerDataJson, ...profile } = stored
  return {
    handle: state.handle,
    coverage: {
      complete: state.complete,
      importedProfiles: state.importedProfiles,
      expectedFollowers: state.expectedFollowers,
      updatedAt: state.updatedAt,
      lastError: state.lastError,
    },
    profile: {
      ...profile,
      providerData: parseProviderData(providerDataJson),
    },
  }
}

const cleanTerm = (value: string) =>
  value
    .trim()
    .replace(/^["'`]+|["'`?.!]+$/g, '')
    .replace(/^@/, '')
    .trim()

const employerTail = (value: string) => {
  const match = value.match(
    /\b(?:work(?:s|ing)?|employed|team|role)\s+(?:at|for|with)\s+(.+)$/i,
  )
  return cleanTerm(match?.[1] ?? value)
}

export const parseFollowerSearchTerms = (query: string) => {
  const trimmed = query.trim()
  if (!trimmed) throw new Error('follower_search_query_required')
  const pipeParts = trimmed.split('|')
  const parts =
    pipeParts.length > 1
      ? pipeParts.map((part, index) =>
          index === 0 ? employerTail(part) : cleanTerm(part),
        )
      : employerTail(trimmed).split(/\s*(?:,|\band\b)\s*/i)
  const terms = [...new Set(parts.map(cleanTerm).filter(Boolean))]
  if (!terms.length) throw new Error('follower_search_query_required')
  return terms
}

const searchTokens = (term: string) =>
  term
    .replace(/^https?:\/\//i, '')
    .replace(/^@/, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1) ?? []

export const toFtsQuery = (term: string) => {
  const tokens = searchTokens(term)
  if (!tokens.length) throw new Error('follower_search_term_invalid')
  return tokens
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(' AND ')
}

const companyPattern = (term: string) => {
  const tokens = searchTokens(term)
  const joined = tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s_.-]*')
  return `(?<![a-z0-9_])@?(?:(?:get|use|try|join|go)[\\s_.-]*)?${joined}(?:[\\s_.-]*(?:ai|hq))?(?![a-z0-9_])`
}

export const classifyFollowerMatch = (
  row: Pick<FollowerSearchRow, 'bio' | 'name' | 'handle'>,
  term: string,
): FollowerMatchKind => {
  const bio = row.bio.trim()
  if (!bio) return 'unclear'
  const company = companyPattern(term)
  const role =
    '(?:work(?:s|ing)?|employee|software|eng|engineer(?:ing)?|developer|design(?:er)?|product|model behavior|research(?:er)?|scientist|founder|co-founder|ceo|cto|cmo|coo|lead|staff|team|gtm|growth|marketing|sales|support|success|developer relations|devrel|recruit(?:er|ing)?|talent|people|operations|ops|finance|legal|security|infrastructure|infra|data|education|oss)'
  const companyMentions = bio.matchAll(new RegExp(company, 'gi'))
  let sawFormer = false
  let sawCurrent = false

  for (const mention of companyMentions) {
    const start = mention.index
    const end = start + mention[0].length
    const before = bio.slice(Math.max(0, start - 90), start)
    const after = bio.slice(end, Math.min(bio.length, end + 60))

    const nonEmploymentBefore =
      /(?:acquired\s+by|built\s+(?:with|for|on|using)|building\s+with|client(?:s)?\s+(?:of|at)?|consult(?:ant|ing)?\s+(?:for|with|at)?|customer\s+(?:of|at)?|early\s+(?:employee|eng|engineer|team)|fan\s+(?:of)?|hosted\s+on|investor\s+(?:in)?|partner\s+(?:of|with|at)?|powered\s+by|runs\s+on|sponsor(?:ed)?\s+by|studio[^;|•\n]{0,35}(?:for|with)|using|worked\s+(?:with|on)|works\s+with)\s*[^;|•\n]{0,35}$/i
    const nonEmploymentAfter =
      /^\s*(?:community|ambassador|builder|customer|fan|investor|oss\s+program|partner|subscriber|user)\b/i
    if (nonEmploymentBefore.test(before) || nonEmploymentAfter.test(after)) {
      continue
    }

    const formerBefore =
      /(?:\bprev\.?|\b(?:ex|former(?:ly)?|previously|alum(?:ni)?)\b|\bworked\s+(?:at|for)\b|\bbuilt\b)[^.;|•\n]{0,60}$/i
    const formerAfter = /^\s*(?:alum(?:ni)?|veteran|formerly)\b/i.test(after)
    if (formerBefore.test(before) || formerAfter) {
      sawFormer = true
      continue
    }

    const explicitWorkBefore =
      /\b(?:employed|work(?:s|ing)?)\s+(?:at|for)\s+@?$/i.test(before) ||
      /\bbuilding[^.;|•\n]{0,50}\bat\s+@?$/i.test(before)
    const roleBefore = before.match(
      new RegExp(`\\b${role}\\b([^.;|•\\n]{0,45})$`, 'i'),
    )
    const explicitCompanyConnector =
      /(?:\b(?:at|for|of)\s*(?:[@▲△⏶]\s*)?|[@▲△⏶]\s*)$/i.test(before)
    const directHandle = mention[0].startsWith('@')
    const interveningHandle = /@[a-z0-9_]/i.test(roleBefore?.[1] ?? '')
    const roleAfter = new RegExp(`^['’]?s?\\s*(?:${role})\\b`, 'i').test(after)
    const current =
      explicitWorkBefore ||
      roleAfter ||
      Boolean(
        roleBefore &&
          (explicitCompanyConnector || (directHandle && !interveningHandle)),
      )
    if (current) {
      sawCurrent = true
    }
  }

  if (sawCurrent) return 'current'
  return sawFormer ? 'former' : 'unclear'
}

const toSearchMatch = (
  row: FollowerSearchRow,
  term: string,
): FollowerSearchMatch => ({
  id: row.id,
  handle: row.handle,
  name: row.name,
  bio: row.bio,
  location: row.location,
  profileUrl: row.profileUrl,
  avatarUrl: row.avatarUrl,
  bannerUrl: row.bannerUrl,
  followers: row.followers,
  following: row.following,
  posts: row.posts,
  likes: row.likes,
  mediaCount: row.mediaCount,
  joinedAt: row.joinedAt,
  websiteUrl: row.websiteUrl,
  websiteDisplayUrl: row.websiteDisplayUrl,
  verified: row.verified,
  verificationType: row.verificationType,
  protected: row.protected,
  fetchedAt: row.fetchedAt,
  match: classifyFollowerMatch(row, term),
  evidence: row.bio || `${row.name} (@${row.handle})`,
})

const matchOrder: Record<FollowerMatchKind, number> = {
  current: 0,
  former: 1,
  unclear: 2,
}

export const searchXFollowers = (input: {
  handle: string
  query: string
  resultLimit?: number
  candidateLimit?: number
  includeFormer?: boolean
  includeUnclear?: boolean
  databasePath?: string
}): FollowerSearchResult => {
  const handle = normalizeXHandle(input.handle)
  const state = getFollowerSyncState(handle, input.databasePath)
  if (!state) throw new Error('follower_data_not_synced')
  const resultLimit =
    input.resultLimit === undefined
      ? null
      : Math.min(10_000, Math.max(1, input.resultLimit))
  const candidateLimit = Math.min(
    10_000,
    Math.max(resultLimit ?? 1, input.candidateLimit ?? 10_000),
  )
  const includedMatchKinds: FollowerMatchKind[] = ['current']
  if (input.includeFormer) includedMatchKinds.push('former')
  if (input.includeUnclear) includedMatchKinds.push('unclear')
  const includedMatchKindSet = new Set(includedMatchKinds)
  const terms = parseFollowerSearchTerms(input.query)
  const groups = terms.map((term): FollowerSearchGroup => {
    const rows = searchFollowerRows({
      handle,
      ftsQuery: toFtsQuery(term),
      limit: candidateLimit,
      path: input.databasePath,
    })
    const matches = rows.map((row) => toSearchMatch(row, term))
    const counts = { current: 0, former: 0, unclear: 0 }
    for (const match of matches) counts[match.match] += 1
    return {
      term,
      ...counts,
      candidates: matches.length,
      truncated: matches.length === candidateLimit,
      results: matches
        .filter((match) => includedMatchKindSet.has(match.match))
        .sort(
          (left, right) =>
            matchOrder[left.match] - matchOrder[right.match] ||
            (right.followers ?? 0) - (left.followers ?? 0),
        )
        .slice(0, resultLimit ?? candidateLimit),
    }
  })
  return {
    handle: state.handle,
    query: input.query,
    engine: 'sqlite_fts5',
    resultLimit,
    includedMatchKinds,
    coverage: {
      complete: state.complete,
      importedProfiles: state.importedProfiles,
      expectedFollowers: state.expectedFollowers,
      updatedAt: state.updatedAt,
      lastError: state.lastError,
    },
    groups,
  }
}
