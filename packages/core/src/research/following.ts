import {
  type FxTwitterClientOptions,
  type FxTwitterFollowersPage,
  type FxTwitterUser,
  fetchFxTwitterFollowing,
  fetchFxTwitterProfile,
} from '../providers/x/fxtwitter.js'
import {
  type FollowingSyncState,
  getFollowingProfile,
  getFollowingSyncState,
  markFollowingSyncError,
  searchFollowingRows,
  startFollowingSync,
  storeFollowingPage,
} from '../storage/following.js'
import {
  normalizeXHandle,
  parseStoredXProfileProviderData,
  toFtsQuery,
  toStoredXProfile,
  X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT,
  type XFollowerProfile,
} from './followers.js'

export const X_FOLLOWING_STALE_AFTER_MS = 24 * 60 * 60 * 1_000

export type FollowingResearchClient = {
  profile(handle: string): Promise<FxTwitterUser>
  following(
    handle: string,
    input: { count: number; cursor: string | null },
  ): Promise<FxTwitterFollowersPage>
}

export type XFollowingSyncInput = {
  handle: string
  maxPages?: number
  restart?: boolean
  databasePath?: string
  fxtwitter?: FxTwitterClientOptions
  onPage?: (state: FollowingSyncState) => void
}

export type XFollowingStatus = FollowingSyncState & {
  ageMs: number
  stale: boolean
  staleAfterMs: number
}

export type FollowingSearchMatch = Omit<XFollowerProfile, 'providerData'> & {
  evidence: string
}

export type FollowingSearchCoverage = Pick<
  XFollowingStatus,
  | 'complete'
  | 'importedProfiles'
  | 'searchableProfiles'
  | 'profileDataVersion'
  | 'expectedFollowing'
  | 'updatedAt'
  | 'completedAt'
  | 'lastError'
  | 'ageMs'
  | 'stale'
  | 'staleAfterMs'
>

export type FollowingSearchResult = {
  handle: string
  query: string
  engine: 'sqlite_fts5'
  resultLimit: number | null
  totalMatches: number
  truncated: boolean
  coverage: FollowingSearchCoverage
  results: FollowingSearchMatch[]
}

export type XFollowingProfileResult = {
  handle: string
  coverage: FollowingSearchCoverage
  profile: XFollowerProfile
}

const defaultClient = (
  options: FxTwitterClientOptions = {},
): FollowingResearchClient => ({
  profile: (handle) => fetchFxTwitterProfile(handle, options),
  following: (handle, input) => fetchFxTwitterFollowing(handle, input, options),
})

export const syncXFollowing = async (
  input: XFollowingSyncInput,
  client: FollowingResearchClient = defaultClient(input.fxtwitter),
) => {
  const handle = normalizeXHandle(input.handle)
  const maxPages = input.maxPages ?? 20
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10_000) {
    throw new Error('invalid_following_page_limit')
  }
  const subject = await client.profile(handle)
  let state = startFollowingSync({
    subject: {
      id: subject.id,
      handle: subject.screen_name,
      name: subject.name,
      expectedFollowing: subject.following ?? null,
    },
    restart: input.restart,
    path: input.databasePath,
  })

  try {
    let pagesWithoutProgress = 0
    for (let page = 0; page < maxPages && !state.complete; page += 1) {
      const result = await client.following(subject.screen_name, {
        count: 100,
        cursor: state.cursor,
      })
      if (result.nextCursor && result.nextCursor === state.cursor) {
        throw new Error('fxtwitter_following_cursor_stalled')
      }
      const now = Date.now()
      const previousProfileCount = state.importedProfiles
      state = storeFollowingPage({
        handle: subject.screen_name,
        syncId: state.syncId,
        profiles: result.profiles.map((profile) =>
          toStoredXProfile(profile, now),
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
        throw new Error('fxtwitter_following_sync_no_progress')
      }
    }
    return state
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    markFollowingSyncError({
      handle: subject.screen_name,
      syncId: state.syncId,
      error: message,
      path: input.databasePath,
    })
    throw error
  }
}

export const syncAllXFollowing = async (
  input: Omit<XFollowingSyncInput, 'maxPages'>,
  client: FollowingResearchClient = defaultClient(input.fxtwitter),
) => {
  let restart = input.restart
  while (true) {
    const state = await syncXFollowing(
      { ...input, maxPages: 10_000, restart },
      client,
    )
    if (state.complete) return state
    restart = false
  }
}

const withFreshness = (
  state: FollowingSyncState,
  input: { now?: number; staleAfterMs?: number } = {},
): XFollowingStatus => {
  const now = input.now ?? Date.now()
  const staleAfterMs = input.staleAfterMs ?? X_FOLLOWING_STALE_AFTER_MS
  if (!Number.isFinite(staleAfterMs) || staleAfterMs < 1) {
    throw new Error('invalid_following_stale_after')
  }
  const ageMs = Math.max(0, now - state.updatedAt)
  return {
    ...state,
    ageMs,
    stale: ageMs > staleAfterMs,
    staleAfterMs,
  }
}

const coverageFromStatus = (
  status: XFollowingStatus,
): FollowingSearchCoverage => ({
  complete: status.complete,
  importedProfiles: status.importedProfiles,
  searchableProfiles: status.searchableProfiles,
  profileDataVersion: status.profileDataVersion,
  expectedFollowing: status.expectedFollowing,
  updatedAt: status.updatedAt,
  completedAt: status.completedAt,
  lastError: status.lastError,
  ageMs: status.ageMs,
  stale: status.stale,
  staleAfterMs: status.staleAfterMs,
})

const requireFollowingStatus = (input: {
  handle: string
  databasePath?: string
  now?: number
  staleAfterMs?: number
}) => {
  const handle = normalizeXHandle(input.handle)
  const state = getFollowingSyncState(handle, input.databasePath)
  if (!state) throw new Error('following_data_not_synced')
  if (state.profileDataVersion < 1) {
    throw new Error('following_profiles_need_refresh')
  }
  return withFreshness(state, input)
}

export const getXFollowingStatus = (input: {
  handle: string
  databasePath?: string
  now?: number
  staleAfterMs?: number
}): XFollowingStatus | null => {
  const state = getFollowingSyncState(
    normalizeXHandle(input.handle),
    input.databasePath,
  )
  return state ? withFreshness(state, input) : null
}

const toFollowingSearchMatch = (
  row: ReturnType<typeof searchFollowingRows>[number],
): FollowingSearchMatch => {
  const {
    aliases: _aliases,
    providerDataJson: _providerDataJson,
    rank: _rank,
    ...profile
  } = row
  const evidence = [
    profile.bio,
    profile.location && `Location: ${profile.location}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return {
    ...profile,
    evidence: evidence || `${profile.name} (@${profile.handle})`,
  }
}

export const searchXFollowing = (input: {
  handle: string
  query: string
  resultLimit?: number
  databasePath?: string
  now?: number
  staleAfterMs?: number
}): FollowingSearchResult => {
  const status = requireFollowingStatus(input)
  const query = input.query.trim()
  if (!query) throw new Error('following_search_query_required')
  if (
    input.resultLimit !== undefined &&
    (!Number.isInteger(input.resultLimit) ||
      input.resultLimit < 1 ||
      input.resultLimit > 10_000)
  ) {
    throw new Error('invalid_following_result_limit')
  }
  const rows = searchFollowingRows({
    handle: status.handle,
    ftsQuery: toFtsQuery(query),
    path: input.databasePath,
  })
  const resultLimit = input.resultLimit ?? null
  return {
    handle: status.handle,
    query,
    engine: 'sqlite_fts5',
    resultLimit,
    totalMatches: rows.length,
    truncated: resultLimit !== null && rows.length > resultLimit,
    coverage: coverageFromStatus(status),
    results: rows
      .slice(0, resultLimit ?? rows.length)
      .map(toFollowingSearchMatch),
  }
}

export const getXFollowingProfile = (input: {
  handle: string
  followedHandle: string
  databasePath?: string
  now?: number
  staleAfterMs?: number
}): XFollowingProfileResult => {
  const status = requireFollowingStatus(input)
  const followedHandle = normalizeXHandle(input.followedHandle)
  const stored = getFollowingProfile({
    handle: status.handle,
    followedHandle,
    path: input.databasePath,
  })
  if (!stored) throw new Error('following_profile_not_found')
  const { aliases: _aliases, providerDataJson, ...profile } = stored
  return {
    handle: status.handle,
    coverage: coverageFromStatus(status),
    profile: {
      ...profile,
      providerData: parseStoredXProfileProviderData(providerDataJson),
    },
  }
}
