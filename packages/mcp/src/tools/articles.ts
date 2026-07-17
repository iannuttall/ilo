import {
  createXArticleMonitor,
  deleteXArticleMonitor,
  getDefaultXHandle,
  getXArticle,
  listXArticleMonitors,
  normalizeXHandle,
  normalizeXPostId,
  refreshXArticleMonitor,
  refreshXArticles,
  searchXArticles,
  setXArticleMonitorEnabled,
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
  return normalizeXHandle(await getDefaultXHandle())
}

export const registerArticleTools = (server: McpServer) => {
  server.registerTool(
    'ilo_create_x_article_monitor',
    {
      description:
        'Save an X handle as a local article monitor. This does not run in the background or publish anything.',
      inputSchema: {
        sourceHandle: z.string().trim().min(1).max(100),
        accountHandle,
      },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ sourceHandle, accountHandle }) => {
      try {
        const monitor = createXArticleMonitor({
          sourceHandle,
          accountHandle: await resolveAccountHandle(accountHandle),
        })
        return success(
          `Article monitor created for @${monitor.sourceHandle}.`,
          {
            monitor,
          },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_list_x_article_monitors',
    {
      description: 'List local X article monitors and their latest check state',
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
        const monitors = listXArticleMonitors({
          accountHandle: resolved,
          includeDisabled,
        })
        return success(`${monitors.length} article monitors found.`, {
          accountHandle: resolved,
          monitors,
        })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_set_x_article_monitor_enabled',
    {
      description: 'Pause or resume one local X article monitor',
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
        const monitor = setXArticleMonitorEnabled({ id, enabled })
        return success(
          `@${monitor.sourceHandle} is now ${monitor.enabled ? 'active' : 'paused'}.`,
          { monitor },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_delete_x_article_monitor',
    {
      description:
        'Delete one local X article monitor and articles saved only by that monitor',
      inputSchema: { id: z.string().uuid() },
      outputSchema: openOutputSchema,
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ id }) => {
      try {
        deleteXArticleMonitor({ id })
        return success('Article monitor deleted.', { deleted: true, id })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_refresh_x_articles',
    {
      description:
        'Fetch new articles from active local monitors and continue unfinished history imports. This never publishes anything.',
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
          const result = await refreshXArticleMonitor({
            id: monitorId,
            maxPages,
          })
          return success(
            `Checked @${result.monitor.sourceHandle}; ${result.newArticles} new articles saved.`,
            { result },
          )
        }
        const result = await refreshXArticles({
          accountHandle: await resolveAccountHandle(accountHandle),
          maxPages,
        })
        return success(
          `Checked ${result.checked} article monitors; ${result.newArticles} new articles and ${result.failed.length} failures.`,
          result,
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_search_x_articles',
    {
      description:
        'Search locally saved X article titles, previews, and full text with SQLite FTS5',
      inputSchema: {
        accountHandle,
        sourceHandle: z.string().trim().min(1).max(100).optional(),
        query: z.string().trim().min(1).max(500).optional(),
        resultLimit: z
          .number()
          .int()
          .min(1)
          .max(10_000)
          .optional()
          .describe('Maximum results. Omit to return every match.'),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ accountHandle, sourceHandle, query, resultLimit }) => {
      try {
        const resolved = await resolveAccountHandle(accountHandle)
        const articles = searchXArticles({
          accountHandle: resolved,
          sourceHandle,
          query,
          limit: resultLimit,
        })
        const monitors = listXArticleMonitors({
          accountHandle: resolved,
          includeDisabled: true,
        }).filter(
          (monitor) =>
            !sourceHandle ||
            monitor.sourceHandle.toLowerCase() ===
              normalizeXHandle(sourceHandle).toLowerCase(),
        )
        return success(`${articles.length} saved articles found.`, {
          accountHandle: resolved,
          monitors,
          articles,
        })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_get_x_article',
    {
      description:
        'Read one locally saved X article with its full text and complete public record',
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
        const article = getXArticle({
          accountHandle: await resolveAccountHandle(accountHandle),
          identifier: normalizeXPostId(postId),
        })
        return success(`Read ${article.title}.`, { article })
      } catch (error) {
        return failure(error)
      }
    },
  )
}
