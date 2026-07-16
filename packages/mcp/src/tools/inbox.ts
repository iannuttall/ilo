import {
  createXMonitor,
  deleteXMonitor,
  getXFollowingStatus,
  getXInboxItem,
  listXInbox,
  listXMonitors,
  normalizeXHandle,
  normalizeXPostId,
  readConfig,
  refreshXInbox,
  refreshXMonitor,
  setXMonitorEnabled,
  syncXFollowing,
  updateXInboxItem,
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

export const registerInboxTools = (server: McpServer) => {
  server.registerTool(
    'ilo_create_x_monitor',
    {
      description:
        'Save an X advanced-search query as a local monitor. This does not publish or run in the background.',
      inputSchema: {
        name: z.string().trim().min(1).max(80),
        query: z.string().trim().min(1).max(512),
        accountHandle,
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ name, query, accountHandle }) => {
      try {
        const monitor = createXMonitor({
          name,
          query,
          accountHandle: await resolveAccountHandle(accountHandle),
        })
        return success(`Monitor created: ${monitor.name}.`, { monitor })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_list_x_monitors',
    {
      description: 'List local X inbox monitors and their latest check state',
      inputSchema: {
        accountHandle,
        includeDisabled: z.boolean().default(true),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, includeDisabled }) => {
      try {
        const resolved = await resolveAccountHandle(accountHandle)
        const monitors = listXMonitors({
          accountHandle: resolved,
          includeDisabled,
        })
        return success(`${monitors.length} X monitors found.`, {
          accountHandle: resolved,
          monitors,
        })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_set_x_monitor_enabled',
    {
      description: 'Pause or resume one local X inbox monitor',
      inputSchema: {
        id: z.string().uuid(),
        enabled: z.boolean(),
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ id, enabled }) => {
      try {
        const monitor = setXMonitorEnabled({ id, enabled })
        return success(
          `${monitor.name} is now ${monitor.enabled ? 'active' : 'paused'}.`,
          { monitor },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_delete_x_monitor',
    {
      description: 'Delete one local X inbox monitor by UUID',
      inputSchema: { id: z.string().uuid() },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ id }) => {
      try {
        deleteXMonitor({ id })
        return success('Monitor deleted.', { deleted: true, id })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_refresh_x_inbox',
    {
      description:
        'Run local X monitors through FxTwitter and save new matching posts to the local inbox. This never publishes anything.',
      inputSchema: {
        accountHandle,
        monitorId: z.string().uuid().optional(),
        maxPages: z.number().int().min(1).max(100).default(3),
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ accountHandle, monitorId, maxPages }) => {
      try {
        if (monitorId) {
          const result = await refreshXMonitor({ id: monitorId, maxPages })
          return success(
            `Checked ${result.monitor.name}; ${result.newItems} new inbox items.`,
            { result },
          )
        }
        const result = await refreshXInbox({
          accountHandle: await resolveAccountHandle(accountHandle),
          maxPages,
        })
        return success(
          `Checked ${result.checked} monitors; ${result.newItems} new inbox items and ${result.failed.length} failures.`,
          result,
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_list_x_inbox',
    {
      description:
        'List locally saved X monitor matches with author data, monitor evidence, state, and tri-state follows-me/I-follow relationships',
      inputSchema: {
        accountHandle,
        monitorId: z.string().uuid().optional(),
        status: z
          .enum(['active', 'unread', 'read', 'archived', 'replied', 'all'])
          .default('active'),
        verified: z.boolean().optional(),
        followsMe: z.boolean().optional(),
        iFollow: z.boolean().optional(),
        query: z.string().trim().min(1).max(500).optional(),
        limit: z.number().int().min(1).max(500).default(50),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({
      accountHandle,
      monitorId,
      status,
      verified,
      followsMe,
      iFollow,
      query,
      limit,
    }) => {
      try {
        const resolved = await resolveAccountHandle(accountHandle)
        const items = listXInbox({
          accountHandle: resolved,
          monitorId,
          status,
          verified,
          followsMe,
          iFollow,
          query,
          limit,
        })
        return success(`${items.length} inbox items found.`, {
          accountHandle: resolved,
          items,
        })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_get_x_inbox_item',
    {
      description:
        'Inspect one local X inbox item, including its complete raw FxTwitter post and author record',
      inputSchema: {
        accountHandle,
        postId: z.string().trim().min(1).max(500),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, postId }) => {
      try {
        const item = getXInboxItem({
          accountHandle: await resolveAccountHandle(accountHandle),
          postId: normalizeXPostId(postId),
        })
        return success(`Read inbox item ${item.url}.`, { item })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_update_x_inbox_item',
    {
      description:
        'Change the local read, archived, or replied state of one X inbox item. This does not perform an action on X.',
      inputSchema: {
        accountHandle,
        postId: z.string().trim().min(1).max(500),
        action: z.enum([
          'read',
          'unread',
          'archive',
          'restore',
          'replied',
          'unreplied',
        ]),
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, postId, action }) => {
      try {
        const item = updateXInboxItem({
          accountHandle: await resolveAccountHandle(accountHandle),
          postId: normalizeXPostId(postId),
          action,
        })
        return success(`Inbox item marked ${action}.`, { item })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_sync_x_following',
    {
      description:
        'Import public accounts followed by an X account so inbox I-follow filters can be evaluated locally',
      inputSchema: {
        accountHandle,
        maxPages: z.number().int().min(1).max(200).default(20),
        restart: z.boolean().default(false),
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
            ? `${sync.importedProfiles} followed accounts are available to inbox filters for @${sync.handle}; the full available list was imported.`
            : `${sync.importedProfiles} followed accounts are available to inbox filters for @${sync.handle}; the saved import is unfinished.`,
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
        'Check local following import coverage used by X inbox relationship filters',
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
            ? `${sync.importedProfiles} followed accounts are available to inbox filters for @${sync.handle}; ${sync.complete ? 'the full available list was imported' : 'the saved import is unfinished'}.`
            : 'No following data has been indexed for this account.',
          { sync },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )
}
