import {
  type FxTwitterClientOptions,
  type FxTwitterFollowersPage,
  type FxTwitterUser,
  fetchFxTwitterFollowing,
  fetchFxTwitterProfile,
} from '../providers/x/fxtwitter.js'
import {
  type FollowingSyncState,
  getFollowingSyncState,
  markFollowingSyncError,
  startFollowingSync,
  storeFollowingPage,
} from '../storage/following.js'
import {
  normalizeXHandle,
  X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT,
} from './followers.js'

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
      const previousProfileCount = state.importedProfiles
      state = storeFollowingPage({
        handle: subject.screen_name,
        syncId: state.syncId,
        profiles: result.profiles.map((profile) => ({
          id: profile.id,
          handle: profile.screen_name,
        })),
        nextCursor: result.nextCursor,
        path: input.databasePath,
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

export const getXFollowingStatus = (input: {
  handle: string
  databasePath?: string
}) => getFollowingSyncState(normalizeXHandle(input.handle), input.databasePath)
