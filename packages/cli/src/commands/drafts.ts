import { confirm } from '@clack/prompts'
import {
  createDraft,
  getDraft,
  getPublishingAccount,
  listDrafts,
  type PublishingAccount,
  publishDraft,
  publishPost,
  resolveDraftPublishingAccount,
  scheduleDraft,
  type XPostOptions,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { canPrompt, printJson, printLine, readTextInput } from '../utils.js'
import { destinationArgs, postOptions } from './post-options.js'

const printPublishPreview = (
  body: string,
  options: XPostOptions,
  account: PublishingAccount,
) => {
  const lines = [
    '',
    `Publish as: @${account.username} via ${account.provider === 'x' ? 'direct X' : 'Typefully'}`,
    options.replyToPostId
      ? `Reply to: https://x.com/i/web/status/${options.replyToPostId}`
      : 'Destination: new top-level X post',
    'Text:',
    body,
  ]
  if (options.images?.length) {
    lines.push('Images:')
    options.images.forEach((image, index) => {
      lines.push(
        `${index + 1}. ${image.path}${image.altText ? ` (alt: ${image.altText})` : ''}`,
      )
    })
  }
  process.stderr.write(`${lines.join('\n')}\n\n`)
}

const requirePublishConfirmation = async (
  args: Record<string, unknown>,
  body: string,
  options: XPostOptions,
  account: PublishingAccount,
) => {
  if (args.yes === true) return
  if (!canPrompt()) throw new Error('publish_confirmation_required')
  printPublishPreview(body, options, account)
  const accepted = await confirm({ message: 'Publish this to X now?' })
  if (accepted !== true) throw new Error('publish_cancelled')
}

const textArgs = {
  text: { type: 'string' as const, description: 'Post text.' },
  file: { type: 'string' as const, description: 'Read post text from a file.' },
}

const publishingAccountArg = {
  account: {
    type: 'string' as const,
    description: 'Publishing account alias, handle, or id.',
  },
}

export const draftsCommand = defineCommand({
  meta: {
    name: 'drafts',
    description: 'Create, list, schedule, and publish local drafts',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create a local draft' },
      args: {
        ...textArgs,
        ...destinationArgs,
        ...publishingAccountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args, rawArgs }) => {
        const draft = await createDraft(await readTextInput(args), {
          ...postOptions(args, rawArgs),
          account: typeof args.account === 'string' ? args.account : undefined,
        })
        if (args.json) printJson(draft)
        else {
          const target = draft.publishingAccount
            ? `@${draft.publishingAccount.username} via ${draft.publishingAccount.provider === 'x' ? 'direct X' : 'Typefully'}`
            : 'no publishing account yet'
          printLine(`Draft created: ${draft.id} (${target})`)
        }
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List local drafts' },
      args: {
        ...publishingAccountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const selected =
          typeof args.account === 'string'
            ? await getPublishingAccount(args.account)
            : null
        const drafts = selected
          ? listDrafts().filter(
              (draft) => draft.publishingAccount?.id === selected.id,
            )
          : listDrafts()
        if (args.json) return printJson({ drafts })
        if (!drafts.length) return printLine('No drafts yet.')
        for (const draft of drafts) {
          const details = [
            draft.publishingAccount
              ? `account:@${draft.publishingAccount.username} provider:${draft.publishingAccount.provider === 'x' ? 'direct-x' : 'typefully'}`
              : 'unassigned',
            draft.replyToPostId ? `reply:${draft.replyToPostId}` : '',
            draft.images.length ? `images:${draft.images.length}` : '',
          ]
            .filter(Boolean)
            .join(' ')
          printLine(
            `${draft.id}  ${draft.status.padEnd(10)}  ${draft.body.slice(0, 72)}${details ? `  ${details}` : ''}`,
          )
        }
      },
    }),
    schedule: defineCommand({
      meta: { name: 'schedule', description: 'Schedule a local draft' },
      args: {
        id: { type: 'positional', required: true, description: 'Draft id.' },
        at: {
          type: 'string',
          required: true,
          description: 'Time such as "tomorrow at 9am" or an ISO timestamp.',
        },
        ...publishingAccountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const draft = await scheduleDraft(String(args.id), String(args.at), {
          account: typeof args.account === 'string' ? args.account : undefined,
        })
        if (args.json) printJson(draft)
        else {
          const account = draft.publishingAccount
            ? ` for @${draft.publishingAccount.username} via ${draft.publishingAccount.provider === 'x' ? 'direct X' : 'Typefully'}`
            : ''
          printLine(
            `Scheduled ${draft.id}${account} for ${new Date(draft.scheduledAt ?? 0).toISOString()}.`,
          )
        }
      },
    }),
    publish: defineCommand({
      meta: { name: 'publish', description: 'Publish a local draft to X' },
      args: {
        id: { type: 'positional', required: true, description: 'Draft id.' },
        yes: {
          type: 'boolean',
          default: false,
          description: 'Publish without an interactive confirmation.',
        },
        ...publishingAccountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const draft = getDraft(String(args.id))
        const account = await resolveDraftPublishingAccount(
          draft,
          typeof args.account === 'string' ? args.account : undefined,
        )
        await requirePublishConfirmation(
          args,
          draft.body,
          {
            replyToPostId: draft.replyToPostId ?? undefined,
            images: draft.images,
          },
          account,
        )
        const result = await publishDraft(draft.id, { account: account.id })
        if (args.json) printJson(result)
        else printLine(`Published: ${result.providerUrl}`)
      },
    }),
  },
})

export const postCommand = defineCommand({
  meta: { name: 'post', description: 'Publish one post or reply to X' },
  args: {
    ...textArgs,
    ...destinationArgs,
    ...publishingAccountArg,
    yes: {
      type: 'boolean',
      default: false,
      description: 'Publish without an interactive confirmation.',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Print structured JSON.',
    },
  },
  run: async ({ args, rawArgs }) => {
    const body = await readTextInput(args)
    const account = await getPublishingAccount(
      typeof args.account === 'string' ? args.account : undefined,
    )
    const options = {
      ...postOptions(args, rawArgs),
      account: account.id,
    }
    await requirePublishConfirmation(args, body, options, account)
    const result = await publishPost(body, options)
    if (args.json) printJson(result)
    else printLine(`Published: ${result.providerUrl}`)
  },
})
