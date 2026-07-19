import {
  createDraft,
  findPublishingAccountForXHandle,
  getXInboxItem,
  listXInbox,
  listXMonitors,
  normalizeXPostId,
  recordXInboxFeedback,
  refreshXInbox,
  refreshXMonitor,
  updateXInboxItem,
  type XInboxFeedbackReason,
  type XInboxFeedbackValue,
  type XInboxSort,
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

const requestedSort = (value: unknown): XInboxSort => {
  if (value === 'recent' || value === 'signal') return value
  throw new Error('sort_must_be_recent_or_signal')
}

const feedbackReasons = new Set<XInboxFeedbackReason>([
  'relevant',
  'original',
  'actionable',
  'primary-source',
  'duplicate',
  'promotional',
  'irrelevant',
  'wrong-language',
  'too-shallow',
  'other',
])

const requestedFeedbackReason = (
  value: unknown,
): XInboxFeedbackReason | undefined => {
  if (value === undefined) return undefined
  if (
    typeof value === 'string' &&
    feedbackReasons.has(value as XInboxFeedbackReason)
  ) {
    return value as XInboxFeedbackReason
  }
  throw new Error('invalid_x_inbox_feedback_reason')
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

const feedbackCommand = (
  name: string,
  value: XInboxFeedbackValue,
  description: string,
) =>
  defineCommand({
    meta: { name, description },
    args: {
      post: {
        type: 'positional',
        required: true,
        description: 'X post ID or URL.',
      },
      reason: {
        type: 'string',
        description:
          'Why: relevant, original, actionable, primary-source, duplicate, promotional, irrelevant, wrong-language, too-shallow, or other.',
      },
      note: {
        type: 'string',
        description: 'Optional local note, up to 500 characters.',
      },
      account: accountArg,
      json: {
        type: 'boolean',
        default: false,
        description: 'Print structured JSON.',
      },
    },
    run: async ({ args }) => {
      const feedback = recordXInboxFeedback({
        accountHandle: await resolveXAccountHandle(args.account),
        postId: normalizeXPostId(String(args.post)),
        value,
        reason: requestedFeedbackReason(args.reason),
        note: typeof args.note === 'string' ? args.note : undefined,
      })
      if (args.json) return printJson({ feedback })
      printLine(
        value === 'useful'
          ? `Marked post ${feedback?.postId} as useful.`
          : `Dismissed post ${feedback?.postId} as not useful.`,
      )
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
        language: {
          type: 'string',
          description: 'Only show posts with this saved language code.',
        },
        sort: {
          type: 'string',
          default: 'recent',
          description: 'Sort by recent or signal.',
        },
        explain: {
          type: 'boolean',
          default: false,
          description: 'Show the factors behind each signal score.',
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
          description:
            'Print structured JSON including the complete stored public record.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const sort = requestedSort(args.sort)
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
          language:
            typeof args.language === 'string' ? args.language : undefined,
          verified: args.verified ? true : undefined,
          followsMe: args['follows-me'] ? true : undefined,
          iFollow: args['i-follow'] ? true : undefined,
          query: typeof args.query === 'string' ? args.query.trim() : undefined,
          sort,
          explain: args.explain,
          limit: boundedInteger(args.limit, {
            code: 'limit_must_be_1_to_500',
            maximum: 500,
          }),
        })
        if (args.json) return printJson({ accountHandle, sort, items })
        if (!items.length) {
          return printLine(
            `No matching inbox items for @${accountHandle}. Run \`ilo x inbox refresh\` to check active monitors.`,
          )
        }
        printLine(
          renderXInbox(
            accountHandle,
            items,
            process.stdout.columns ?? 120,
            args.explain,
          ),
        )
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
          description:
            'Print structured JSON including the complete stored public record.',
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
    useful: feedbackCommand(
      'useful',
      'useful',
      'Teach signal ranking that this item was useful',
    ),
    dismiss: feedbackCommand(
      'dismiss',
      'not_useful',
      'Teach signal ranking that this item was not useful',
    ),
    'feedback-clear': defineCommand({
      meta: {
        name: 'feedback-clear',
        description: 'Clear local usefulness feedback for an inbox item',
      },
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
        const postId = normalizeXPostId(String(args.post))
        recordXInboxFeedback({
          accountHandle: await resolveXAccountHandle(args.account),
          postId,
          value: 'clear',
        })
        if (args.json) return printJson({ cleared: true, postId })
        printLine(`Cleared usefulness feedback for post ${postId}.`)
      },
    }),
  },
})
