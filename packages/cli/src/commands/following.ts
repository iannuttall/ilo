import {
  type FollowingSyncState,
  getXFollowingStatus,
  syncAllXFollowing,
  syncXFollowing,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { printJson, printLine } from '../utils.js'
import { resolveXAccountHandle } from './x-account.js'

const pageLimit = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
    throw new Error('pages_must_be_1_to_10000')
  }
  return parsed
}

export const followingCommand = defineCommand({
  meta: {
    name: 'following',
    description: 'Import accounts you follow for inbox filters',
  },
  subCommands: {
    sync: defineCommand({
      meta: {
        name: 'sync',
        description: 'Import public accounts followed by an X account',
      },
      args: {
        handle: {
          type: 'positional',
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
          description: 'Start a new full sync instead of resuming.',
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
                    `Read ${progress.pagesFetched} pages and ${progress.importedProfiles} unique profiles.`,
                  )
                }
              },
        }
        const state = args.all
          ? await syncAllXFollowing(input)
          : await syncXFollowing({
              ...input,
              maxPages: pageLimit(args.pages),
            })
        if (args.json) return printJson(state)
        if (state.complete) {
          return printLine(
            `Following sync complete for @${state.handle}: ${state.importedProfiles} profiles indexed.`,
          )
        }
        return printLine(
          `Saved progress for @${state.handle}. Run the same command again to continue.`,
        )
      },
    }),
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show local following import coverage',
      },
      args: {
        handle: {
          type: 'positional',
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
        const coverage = state.expectedFollowing
          ? `${state.importedProfiles} of about ${state.expectedFollowing}`
          : String(state.importedProfiles)
        printLine(
          `@${state.handle}: ${coverage} profiles indexed (${state.complete ? 'complete' : 'partial'}).`,
        )
        if (state.lastError) printLine(`Last import error: ${state.lastError}`)
      },
    }),
  },
})
