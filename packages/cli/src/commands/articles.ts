import {
  createXArticleMonitor,
  deleteXArticleMonitor,
  getXArticle,
  listXArticleMonitors,
  normalizeXHandle,
  normalizeXPostId,
  refreshXArticleMonitor,
  refreshXArticles,
  searchXArticles,
  setXArticleMonitorEnabled,
  type XArticleMonitor,
} from '@ilo/core'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { printJson, printLine } from '../utils.js'
import {
  renderXArticle,
  renderXArticleMonitors,
  renderXArticles,
} from './article-output.js'
import { resolveXAccountHandle } from './x-account.js'

const accountArg = {
  type: 'string' as const,
  description: 'X handle. Defaults to the connected account.',
}

const boundedInteger = (
  value: unknown,
  input: { code: string; maximum: number },
) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > input.maximum) {
    throw new Error(input.code)
  }
  return parsed
}

export const resolveArticleMonitor = (
  monitors: XArticleMonitor[],
  identifier: string,
) => {
  const value = identifier.trim().toLowerCase().replace(/^@/, '')
  const matches = monitors.filter(
    (monitor) =>
      monitor.id.toLowerCase() === value ||
      monitor.id.toLowerCase().startsWith(value) ||
      monitor.sourceHandle.toLowerCase() === value,
  )
  if (matches.length === 0) throw new Error('x_article_monitor_not_found')
  if (matches.length > 1)
    throw new Error('x_article_monitor_identifier_ambiguous')
  return matches[0] as XArticleMonitor
}

const monitorArgs = {
  monitor: {
    type: 'positional' as const,
    required: true,
    description: 'Source handle, UUID, or unique UUID prefix.',
  },
  account: accountArg,
  json: {
    type: 'boolean' as const,
    default: false,
    description: 'Print structured JSON.',
  },
}

const setMonitorStateCommand = (enabled: boolean) =>
  defineCommand({
    meta: {
      name: enabled ? 'enable' : 'disable',
      description: enabled
        ? 'Resume an article monitor'
        : 'Pause an article monitor',
    },
    args: monitorArgs,
    run: async ({ args }) => {
      const accountHandle = await resolveXAccountHandle(args.account)
      const existing = resolveArticleMonitor(
        listXArticleMonitors({ accountHandle, includeDisabled: true }),
        String(args.monitor),
      )
      const monitor = setXArticleMonitorEnabled({
        id: existing.id,
        enabled,
      })
      if (args.json) return printJson({ monitor })
      printLine(`${enabled ? 'Enabled' : 'Paused'} @${monitor.sourceHandle}.`)
    },
  })

export const articlesCommand = defineCommand({
  meta: {
    name: 'articles',
    description: 'Monitor and search articles from selected X accounts',
  },
  subCommands: {
    add: defineCommand({
      meta: {
        name: 'add',
        description: 'Add an X account to your article monitors',
      },
      args: {
        handle: {
          type: 'positional',
          required: true,
          description: 'X handle to monitor for articles.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const monitor = createXArticleMonitor({
          accountHandle: await resolveXAccountHandle(args.account),
          sourceHandle: String(args.handle),
        })
        if (args.json) return printJson({ monitor })
        printLine(`Added article monitor for @${monitor.sourceHandle}.`)
        printLine('Fetch its articles with:')
        printLine(`ilo x articles refresh ${monitor.sourceHandle}`)
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List local article monitors' },
      args: {
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitors = listXArticleMonitors({
          accountHandle,
          includeDisabled: true,
        })
        if (args.json) return printJson({ accountHandle, monitors })
        if (!monitors.length) {
          return printLine(
            'No article monitors yet. Add one with `ilo x articles add <handle>`.',
          )
        }
        printLine(renderXArticleMonitors(accountHandle, monitors))
      },
    }),
    refresh: defineCommand({
      meta: {
        name: 'refresh',
        description: 'Fetch new articles from active monitors',
      },
      args: {
        monitor: {
          type: 'positional',
          required: false,
          description: 'Only refresh this source handle, UUID, or UUID prefix.',
        },
        pages: {
          type: 'string',
          default: '3',
          description: 'Maximum article pages to fetch for each monitor.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const maxPages = boundedInteger(args.pages, {
          code: 'pages_must_be_1_to_100',
          maximum: 100,
        })
        if (typeof args.monitor === 'string' && args.monitor.trim()) {
          const monitor = resolveArticleMonitor(
            listXArticleMonitors({ accountHandle, includeDisabled: true }),
            args.monitor,
          )
          const result = await refreshXArticleMonitor({
            id: monitor.id,
            maxPages,
          })
          if (args.json) return printJson({ result })
          printLine(
            `Checked @${monitor.sourceHandle}: ${result.newArticles} new article${result.newArticles === 1 ? '' : 's'}.`,
          )
          if (result.truncated) {
            printLine('Older articles remain. Run this command again:')
            printLine(`ilo x articles refresh ${monitor.sourceHandle}`)
          }
          return
        }

        const result = await refreshXArticles({ accountHandle, maxPages })
        if (args.json) return printJson(result)
        if (!result.checked) {
          return printLine(
            'No active article monitors. Add one with `ilo x articles add <handle>`.',
          )
        }
        printLine(
          `Checked ${result.checked} article monitor${result.checked === 1 ? '' : 's'}: ${result.newArticles} new article${result.newArticles === 1 ? '' : 's'}.`,
        )
        for (const refreshed of result.results) {
          if (refreshed.truncated) {
            printLine(
              pc.dim(
                `@${refreshed.monitor.sourceHandle} still has older articles to import.`,
              ),
            )
          }
        }
        for (const failed of result.failed) {
          printLine(pc.red(`@${failed.monitor.sourceHandle}: ${failed.error}`))
        }
      },
    }),
    search: defineCommand({
      meta: {
        name: 'search',
        description: 'Search locally saved article titles and text',
      },
      args: {
        query: {
          type: 'string',
          description: 'Words to find. Omit to list every saved article.',
        },
        from: {
          type: 'string',
          description: 'Only show articles from this X handle.',
        },
        limit: {
          type: 'string',
          description: 'Maximum articles to return. Omit for every match.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const sourceHandle =
          typeof args.from === 'string'
            ? normalizeXHandle(args.from)
            : undefined
        const monitors = listXArticleMonitors({
          accountHandle,
          includeDisabled: true,
        }).filter(
          (monitor) =>
            !sourceHandle ||
            monitor.sourceHandle.toLowerCase() === sourceHandle.toLowerCase(),
        )
        const articles = searchXArticles({
          accountHandle,
          query: typeof args.query === 'string' ? args.query : undefined,
          sourceHandle,
          limit:
            typeof args.limit === 'string'
              ? boundedInteger(args.limit, {
                  code: 'limit_must_be_1_to_10000',
                  maximum: 10_000,
                })
              : undefined,
        })
        if (args.json) return printJson({ accountHandle, monitors, articles })
        if (!articles.length) {
          return printLine(
            'No matching saved articles. Run `ilo x articles refresh` to check active monitors.',
          )
        }
        printLine(renderXArticles(articles))
        const incomplete = monitors.filter(
          (monitor) => !monitor.lastCheckedAt || !monitor.historyComplete,
        )
        if (incomplete.length) {
          printLine()
          printLine(
            pc.yellow(
              `Older article history may be missing for ${incomplete.map((monitor) => `@${monitor.sourceHandle}`).join(', ')}.`,
            ),
          )
          printLine('Run `ilo x articles refresh` again to continue.')
        }
      },
    }),
    show: defineCommand({
      meta: { name: 'show', description: 'Read one saved X article' },
      args: {
        post: {
          type: 'positional',
          required: true,
          description: 'Article post ID or X status URL.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON including raw provider data.',
        },
      },
      run: async ({ args }) => {
        const article = getXArticle({
          accountHandle: await resolveXAccountHandle(args.account),
          identifier: normalizeXPostId(String(args.post)),
        })
        if (args.json) return printJson({ article })
        printLine(renderXArticle(article))
      },
    }),
    enable: setMonitorStateCommand(true),
    disable: setMonitorStateCommand(false),
    remove: defineCommand({
      meta: {
        name: 'remove',
        description: 'Remove an article monitor and its saved articles',
      },
      args: monitorArgs,
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitor = resolveArticleMonitor(
          listXArticleMonitors({ accountHandle, includeDisabled: true }),
          String(args.monitor),
        )
        deleteXArticleMonitor({ id: monitor.id })
        if (args.json) return printJson({ deleted: true, monitor })
        printLine(`Removed article monitor for @${monitor.sourceHandle}.`)
      },
    }),
  },
})
