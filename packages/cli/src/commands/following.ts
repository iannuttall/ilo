import {
  type FollowingSyncState,
  getXFollowingProfile,
  getXFollowingStatus,
  searchXFollowing,
  syncAllXFollowing,
  syncXFollowing,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { printJson, printLine } from '../utils.js'
import {
  followingCoverageLines,
  renderFollowingSearch,
  writeFollowingSearchCsv,
} from './following-output.js'
import { resolveXAccountHandle } from './x-account.js'

const integerArg = (
  value: unknown,
  input: { name: string; minimum: number; maximum: number },
) => {
  const parsed = Number(value)
  if (
    !Number.isInteger(parsed) ||
    parsed < input.minimum ||
    parsed > input.maximum
  ) {
    throw new Error(
      `${input.name}_must_be_${input.minimum}_to_${input.maximum}`,
    )
  }
  return parsed
}

const followingError = (error: unknown, handle: string) => {
  if (!(error instanceof Error)) return error
  if (error.message === 'following_data_not_synced') {
    return new Error(
      `No searchable following data for @${handle}. Run ilo x following sync ${handle} --all first.`,
    )
  }
  if (error.message === 'following_profiles_need_refresh') {
    return new Error(
      `The saved @${handle} following cache only contains relationship IDs. Run ilo x following sync ${handle} --all to build the profile index.`,
    )
  }
  if (error.message === 'fxtwitter_following_sync_no_progress') {
    return new Error(
      'Following import stopped after 25 pages added no new profiles. Saved progress is still available.',
    )
  }
  return error
}

const printProfile = (profile: ReturnType<typeof getXFollowingProfile>) => {
  printLine(`${profile.profile.name} (@${profile.profile.handle})`)
  if (profile.profile.bio) printLine(profile.profile.bio)
  if (profile.profile.location) {
    printLine(`Location: ${profile.profile.location}`)
  }
  if (profile.profile.websiteUrl) {
    printLine(
      `Website: ${profile.profile.websiteDisplayUrl ?? profile.profile.websiteUrl} (${profile.profile.websiteUrl})`,
    )
  }
  printLine(
    `Followers: ${profile.profile.followers ?? 'unknown'}  Following: ${profile.profile.following ?? 'unknown'}  Posts: ${profile.profile.posts ?? 'unknown'}  Likes: ${profile.profile.likes ?? 'unknown'}  Media: ${profile.profile.mediaCount ?? 'unknown'}`,
  )
  if (profile.profile.joinedAt) {
    printLine(`Joined: ${profile.profile.joinedAt}`)
  }
  printLine(
    `Verified: ${profile.profile.verified ? (profile.profile.verificationType ?? 'yes') : 'no'}  Protected: ${profile.profile.protected ? 'yes' : 'no'}`,
  )
  printLine(`Profile: ${profile.profile.profileUrl}`)
}

export const followingCommand = defineCommand({
  meta: {
    name: 'following',
    description: 'Import and search accounts an X profile follows',
  },
  subCommands: {
    sync: defineCommand({
      meta: {
        name: 'sync',
        description: 'Build or refresh the local following profile index',
      },
      args: {
        handle: {
          type: 'positional',
          required: false,
          description: 'X handle. Defaults to the connected account.',
        },
        pages: {
          type: 'string',
          default: '20',
          description: 'Pages to fetch before saving progress and returning.',
        },
        all: {
          type: 'boolean',
          default: false,
          description: 'Continue until the full public following list is read.',
        },
        restart: {
          type: 'boolean',
          default: false,
          description: 'Discard an unfinished cursor and start a new sync.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const handle = await resolveXAccountHandle(args.handle)
        const input = {
          handle,
          restart: args.restart,
          onPage: args.json
            ? undefined
            : (progress: FollowingSyncState) => {
                if (progress.complete || progress.pagesFetched % 25 === 0) {
                  printLine(
                    `Read ${progress.pagesFetched} pages and saved ${progress.searchableProfiles.toLocaleString('en-GB')} unique profiles.`,
                  )
                }
              },
        }
        let state: FollowingSyncState
        try {
          state = args.all
            ? await syncAllXFollowing(input)
            : await syncXFollowing({
                ...input,
                maxPages: integerArg(args.pages, {
                  name: 'pages',
                  minimum: 1,
                  maximum: 10_000,
                }),
              })
        } catch (error) {
          throw followingError(error, handle)
        }
        const status = getXFollowingStatus({ handle: state.handle })
        if (args.json) return printJson(status ?? state)
        if (state.complete) {
          return printLine(
            `Following sync complete for @${state.handle}: ${state.searchableProfiles.toLocaleString('en-GB')} complete profiles are searchable and available to inbox filters.`,
          )
        }
        return printLine(
          `Saved ${state.searchableProfiles.toLocaleString('en-GB')} searchable profiles for @${state.handle}. Run the same command again to continue.`,
        )
      },
    }),
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show following profile coverage and freshness',
      },
      args: {
        handle: {
          type: 'positional',
          required: false,
          description: 'X handle. Defaults to the connected account.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const handle = await resolveXAccountHandle(args.handle)
        const state = getXFollowingStatus({ handle })
        if (args.json) return printJson({ sync: state })
        if (!state) return printLine(`No following data for @${handle}.`)
        printLine(`Following data for @${state.handle}`)
        for (const line of followingCoverageLines(state, state.handle)) {
          printLine(line)
        }
        if (
          state.lastError &&
          ![
            'fxtwitter_following_sync_no_progress',
            'fxtwitter_following_cursor_stalled',
          ].includes(state.lastError)
        ) {
          printLine(`Last import error: ${state.lastError}`)
        }
      },
    }),
    search: defineCommand({
      meta: {
        name: 'search',
        description: 'Search followed names, handles, bios, and locations',
      },
      args: {
        handle: {
          type: 'positional',
          required: false,
          description: 'X handle. Defaults to the connected account.',
        },
        query: {
          type: 'string',
          required: true,
          description: 'Concrete words such as "building browser tools".',
        },
        limit: {
          type: 'string',
          description: 'Maximum profiles to list. Omit to return every match.',
        },
        csv: {
          type: 'string',
          description:
            'Write every match and its public profile fields to CSV.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const handle = await resolveXAccountHandle(args.handle)
        const resultLimit =
          typeof args.limit === 'string'
            ? integerArg(args.limit, {
                name: 'limit',
                minimum: 1,
                maximum: 10_000,
              })
            : undefined
        let result: ReturnType<typeof searchXFollowing>
        try {
          result = searchXFollowing({
            handle,
            query: String(args.query),
            resultLimit,
          })
        } catch (error) {
          throw followingError(error, handle)
        }

        const requestedCsv = typeof args.csv === 'string' ? args.csv.trim() : ''
        let csvExport: Awaited<
          ReturnType<typeof writeFollowingSearchCsv>
        > | null = null
        if (requestedCsv) {
          const exportResult = searchXFollowing({
            handle,
            query: String(args.query),
          })
          csvExport = await writeFollowingSearchCsv(exportResult, requestedCsv)
        }
        if (args.json) {
          return printJson(csvExport ? { ...result, csvExport } : result)
        }
        printLine(renderFollowingSearch(result))
        if (csvExport) {
          printLine()
          printLine(
            `Wrote ${csvExport.rows.toLocaleString('en-GB')} matches to ${csvExport.path}`,
          )
        }
      },
    }),
    profile: defineCommand({
      meta: {
        name: 'profile',
        description: 'Read one complete profile from the following index',
      },
      args: {
        followed: {
          type: 'positional',
          required: true,
          description: 'Followed X handle to inspect.',
        },
        account: {
          type: 'string',
          description: 'X handle. Defaults to the connected account.',
        },
        json: {
          type: 'boolean',
          default: false,
          description:
            'Print structured JSON including the complete stored public record.',
        },
      },
      run: async ({ args }) => {
        const handle = await resolveXAccountHandle(args.account)
        let result: ReturnType<typeof getXFollowingProfile>
        try {
          result = getXFollowingProfile({
            handle,
            followedHandle: String(args.followed),
          })
        } catch (error) {
          throw followingError(error, handle)
        }
        if (args.json) return printJson(result)
        printProfile(result)
        if (!result.coverage.complete || result.coverage.stale) {
          printLine()
          for (const line of followingCoverageLines(
            result.coverage,
            result.handle,
          )) {
            printLine(line)
          }
        }
      },
    }),
  },
})
