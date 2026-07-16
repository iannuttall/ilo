import {
  getXFollowingProfile,
  getXFollowingStatus,
  normalizeXHandle,
  readConfig,
  searchXFollowing,
  syncXFollowing,
} from '@ilo/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { failure, openOutputSchema, success } from '../tool-result.js'

const accountHandle = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .optional()
  .describe('X handle; defaults to the locally connected account')

const resolveAccountHandle = async (value?: string) => {
  if (value?.trim()) return normalizeXHandle(value)
  const config = await readConfig()
  if (!config.x?.username) throw new Error('x_account_required')
  return normalizeXHandle(config.x.username)
}

export const registerFollowingTools = (server: McpServer) => {
  server.registerTool(
    'ilo_sync_x_following',
    {
      description:
        'Build or refresh a local searchable index of complete public profiles followed by an X account. Progress is resumable and also powers inbox I-follow filters.',
      inputSchema: {
        accountHandle,
        maxPages: z.number().int().min(1).max(10_000).default(20),
        restart: z
          .boolean()
          .default(false)
          .describe('Discard an unfinished cursor and start from page one.'),
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ accountHandle, maxPages, restart }) => {
      try {
        const sync = await syncXFollowing({
          handle: await resolveAccountHandle(accountHandle),
          maxPages,
          restart,
        })
        return success(
          sync.complete
            ? `${sync.searchableProfiles} complete followed profiles are searchable for @${sync.handle}; the full available list was imported.`
            : `${sync.searchableProfiles} complete followed profiles are searchable for @${sync.handle}; call this tool again to continue from the saved cursor.`,
          { sync },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_x_following_sync_status',
    {
      description:
        'Check local following-profile coverage, completion, age, and freshness',
      inputSchema: { accountHandle },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle }) => {
      try {
        const resolved = await resolveAccountHandle(accountHandle)
        const sync = getXFollowingStatus({ handle: resolved })
        return success(
          sync
            ? `${sync.searchableProfiles} complete followed profiles are searchable for @${sync.handle}; ${sync.complete ? 'the full available list was imported' : 'the saved import is unfinished'} and the snapshot is ${sync.stale ? 'stale' : 'fresh'}.`
            : 'No following profiles have been indexed for this account.',
          { sync },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_search_x_following',
    {
      description:
        'Search the complete public profiles followed by an X account using locally indexed names, handles, bios, and locations',
      inputSchema: {
        accountHandle,
        query: z.string().trim().min(1).max(500),
        resultLimit: z
          .number()
          .int()
          .min(1)
          .max(10_000)
          .optional()
          .describe('Maximum profiles to return. Omit to return every match.'),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, query, resultLimit }) => {
      try {
        const search = searchXFollowing({
          handle: await resolveAccountHandle(accountHandle),
          query,
          resultLimit,
        })
        return success(
          `${search.totalMatches} followed profiles matched "${search.query}" across ${search.coverage.searchableProfiles} indexed profiles. The local snapshot is ${search.coverage.stale ? 'stale' : 'fresh'}${search.coverage.complete ? '' : ' and unfinished'}.`,
          { search },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_get_x_following_profile',
    {
      description:
        'Read one complete public profile from an X account following index, including bio, location, website, account counts, join date, verification, images, and raw provider data',
      inputSchema: {
        accountHandle,
        followedHandle: z.string().trim().min(1).max(100),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, followedHandle }) => {
      try {
        const result = getXFollowingProfile({
          handle: await resolveAccountHandle(accountHandle),
          followedHandle,
        })
        return success(
          `Read @${result.profile.handle}'s stored public profile from @${result.handle}'s following index.`,
          { result },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )
}
