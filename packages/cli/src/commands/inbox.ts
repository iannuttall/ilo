import {
  createDraft,
  findPublishingAccountForXHandle,
  getXInboxItem,
  listXInbox,
  listXMonitors,
  normalizeXPostId,
  refreshXInbox,
  refreshXMonitor,
  updateXInboxItem,
  type XInboxStateAction,
  type XInboxStatus,
} from '@ilo/core'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { printJson, printLine, readTextInput } from '../utils.js'
import { renderXInbox } from './inbox-output.js'
import { resolveMonitor } from './monitors.js'
import { imageArgs, postOptions } from './post-options.js'
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

const requestedStatus = (args: Record<string, unknown>): XInboxStatus => {
  const statuses = (
    [
      ['unread', 'unread'],
      ['read', 'read'],
      ['archived', 'archived'],
      ['replied', 'replied'],
      ['all', 'all'],
    ] as const
  ).filter(([flag]) => args[flag] === true)
  if (statuses.length > 1) throw new Error('x_inbox_status_filter_conflict')
  return statuses[0]?.[1] ?? 'active'
}

const stateCommand = (action: XInboxStateAction, description: string) =>
  defineCommand({
    meta: { name: action, description },
    args: {
      post: {
        type: 'positional',
        required: true,
        description: 'X post ID or URL.',
      },
      account: accountArg,
      json: {
        type: 'boolean',
        default: false,
        description: 'Print structured JSON.',
      },
    },
    run: async ({ args }) => {
      const item = updateXInboxItem({
        accountHandle: await resolveXAccountHandle(args.account),
        postId: normalizeXPostId(String(args.post)),
        action,
      })
      if (args.json) return printJson({ item })
      printLine(`Marked ${item.url} as ${action}.`)
    },
  })

export const inboxCommand = defineCommand({
  meta: {
    name: 'inbox',
    description: 'Find and triage posts worth replying to',
  },
  subCommands: {
    refresh: defineCommand({
      meta: {
        name: 'refresh',
        description: 'Run active monitors and save new matches locally',
      },
      args: {
        monitor: {
          type: 'string',
          description: 'Only refresh this monitor name, UUID, or UUID prefix.',
        },
        pages: {
          type: 'string',
          default: '3',
          description: 'Maximum search pages to fetch for each monitor.',
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
          const monitor = resolveMonitor(
            listXMonitors({ accountHandle, includeDisabled: true }),
            args.monitor,
          )
          const result = await refreshXMonitor({ id: monitor.id, maxPages })
          if (args.json) return printJson({ result })
          printLine(
            `Checked ${monitor.name}: ${result.newItems} new inbox item${result.newItems === 1 ? '' : 's'}.`,
          )
          if (result.truncated) {
            printLine(
              'More older matches were available than this refresh read.',
            )
          }
          return
        }
        const result = await refreshXInbox({ accountHandle, maxPages })
        if (args.json) return printJson(result)
        printLine(
          `Checked ${result.checked} monitor${result.checked === 1 ? '' : 's'}: ${result.newItems} new inbox item${result.newItems === 1 ? '' : 's'}.`,
        )
        for (const failed of result.failed) {
          printLine(pc.red(`${failed.monitor.name}: ${failed.error}`))
        }
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List and filter local inbox items' },
      args: {
        account: accountArg,
        monitor: {
          type: 'string',
          description: 'Monitor name, UUID, or unique UUID prefix.',
        },
        query: {
          type: 'string',
          description: 'Search saved post text and author profiles with FTS5.',
        },
        verified: {
          type: 'boolean',
          default: false,
          description: 'Only show verified authors.',
        },
        'follows-me': {
          type: 'boolean',
          default: false,
          description: 'Only show authors known to follow this account.',
        },
        'i-follow': {
          type: 'boolean',
          default: false,
          description: 'Only show authors this account is known to follow.',
        },
        unread: {
          type: 'boolean',
          default: false,
          description: 'Only show unread, unarchived items.',
        },
        read: {
          type: 'boolean',
          default: false,
          description: 'Only show read, unarchived items.',
        },
        archived: {
          type: 'boolean',
          default: false,
          description: 'Only show archived items.',
        },
        replied: {
          type: 'boolean',
          default: false,
          description: 'Only show items marked as replied.',
        },
        all: {
          type: 'boolean',
          default: false,
          description: 'Include active and archived items.',
        },
        limit: {
          type: 'string',
          default: '20',
          description: 'Maximum inbox items to return.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON including raw provider data.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitors = listXMonitors({
          accountHandle,
          includeDisabled: true,
        })
        const monitorId =
          typeof args.monitor === 'string' && args.monitor.trim()
            ? resolveMonitor(monitors, args.monitor).id
            : undefined
        const items = listXInbox({
          accountHandle,
          monitorId,
          status: requestedStatus(args),
          verified: args.verified ? true : undefined,
          followsMe: args['follows-me'] ? true : undefined,
          iFollow: args['i-follow'] ? true : undefined,
          query: typeof args.query === 'string' ? args.query.trim() : undefined,
          limit: boundedInteger(args.limit, {
            code: 'limit_must_be_1_to_500',
            maximum: 500,
          }),
        })
        if (args.json) return printJson({ accountHandle, items })
        if (!items.length) {
          return printLine(
            `No matching inbox items for @${accountHandle}. Run \`ilo x inbox refresh\` to check active monitors.`,
          )
        }
        printLine(renderXInbox(accountHandle, items))
      },
    }),
    show: defineCommand({
      meta: { name: 'show', description: 'Inspect one saved inbox item' },
      args: {
        post: {
          type: 'positional',
          required: true,
          description: 'X post ID or URL.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON including raw provider data.',
        },
      },
      run: async ({ args }) => {
        const item = getXInboxItem({
          accountHandle: await resolveXAccountHandle(args.account),
          postId: normalizeXPostId(String(args.post)),
        })
        if (args.json) return printJson({ item })
        printLine(`${item.author.name} (@${item.author.handle})`)
        if (item.author.bio) printLine(item.author.bio)
        printLine()
        printLine(item.text)
        printLine(item.url)
        printLine()
        printLine(
          `Verified: ${item.author.verified ? 'yes' : 'no'}  Follows you: ${item.relationship.followsMe ?? 'unknown'}  You follow: ${item.relationship.iFollow ?? 'unknown'}`,
        )
        printLine(
          `Replies: ${item.replies}  Likes: ${item.likes}  Reposts: ${item.reposts}  Views: ${item.views ?? 'unknown'}`,
        )
        printLine(
          `Monitors: ${item.monitors.map((monitor) => monitor.name).join(', ')}`,
        )
      },
    }),
    draft: defineCommand({
      meta: {
        name: 'draft',
        description: 'Create a local reply draft for an inbox item',
      },
      args: {
        post: {
          type: 'positional',
          required: true,
          description: 'X post ID or URL.',
        },
        text: { type: 'string', description: 'Reply text.' },
        file: { type: 'string', description: 'Read reply text from a file.' },
        ...imageArgs,
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args, rawArgs }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const item = getXInboxItem({
          accountHandle,
          postId: normalizeXPostId(String(args.post)),
        })
        const publishingAccount =
          await findPublishingAccountForXHandle(accountHandle)
        const draft = await createDraft(await readTextInput(args), {
          ...postOptions({ ...args, 'reply-to': item.postId }, rawArgs),
          account: publishingAccount?.id ?? null,
        })
        updateXInboxItem({
          accountHandle,
          postId: item.postId,
          action: 'read',
        })
        if (args.json) return printJson({ draft, item })
        printLine(`Reply draft created: ${draft.id}`)
        printLine(`Target: ${item.url}`)
        printLine('Nothing was published.')
      },
    }),
    read: stateCommand('read', 'Mark an inbox item as read'),
    unread: stateCommand('unread', 'Mark an inbox item as unread'),
    archive: stateCommand('archive', 'Archive an inbox item'),
    restore: stateCommand('restore', 'Restore an archived inbox item'),
    replied: stateCommand('replied', 'Mark an inbox item as replied'),
    unreplied: stateCommand('unreplied', 'Clear the replied state'),
  },
})
