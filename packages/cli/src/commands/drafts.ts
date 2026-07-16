import { confirm } from '@clack/prompts'
import {
  createDraft,
  getDraft,
  listDrafts,
  normalizeXPostId,
  normalizeXPostImages,
  publishDraft,
  publishPost,
  scheduleDraft,
  type XPostOptions,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { canPrompt, printJson, printLine, readTextInput } from '../utils.js'

const printPublishPreview = (body: string, options: XPostOptions) => {
  const lines = [
    '',
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
) => {
  if (args.yes === true) return
  if (!canPrompt()) throw new Error('publish_confirmation_required')
  printPublishPreview(body, options)
  const accepted = await confirm({ message: 'Publish this to X now?' })
  if (accepted !== true) throw new Error('publish_cancelled')
}

const textArgs = {
  text: { type: 'string' as const, description: 'Post text.' },
  file: { type: 'string' as const, description: 'Read post text from a file.' },
}

const destinationArgs = {
  'reply-to': {
    type: 'string' as const,
    description: 'Reply to an X post ID or URL.',
  },
  image: {
    type: 'string' as const,
    description: 'Attach a JPEG, PNG, or WebP path. Repeat up to four times.',
  },
  alt: {
    type: 'string' as const,
    description: 'Alt text paired with each --image, in the same order.',
  },
}

const repeatedValues = (rawArgs: string[], name: string) => {
  const values: string[] = []
  const flag = `--${name}`
  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index]
    if (value === flag) {
      const next = rawArgs[index + 1]
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`${name}_value_required`)
      }
      values.push(next)
      index += 1
    } else if (value?.startsWith(`${flag}=`)) {
      values.push(value.slice(flag.length + 1))
    }
  }
  return values
}

const postOptions = (
  args: Record<string, unknown>,
  rawArgs: string[],
): XPostOptions => {
  const paths = repeatedValues(rawArgs, 'image')
  const altTexts = repeatedValues(rawArgs, 'alt')
  if (altTexts.length > paths.length)
    throw new Error('x_image_alt_without_image')
  const replyTo = args['reply-to']
  return {
    replyToPostId:
      typeof replyTo === 'string' && replyTo.trim()
        ? normalizeXPostId(replyTo)
        : undefined,
    images: normalizeXPostImages(
      paths.map((path, index) => ({ path, altText: altTexts[index] })),
    ),
  }
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
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args, rawArgs }) => {
        const draft = createDraft(
          await readTextInput(args),
          postOptions(args, rawArgs),
        )
        if (args.json) printJson(draft)
        else printLine(`Draft created: ${draft.id}`)
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List local drafts' },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: ({ args }) => {
        const drafts = listDrafts()
        if (args.json) return printJson({ drafts })
        if (!drafts.length) return printLine('No drafts yet.')
        for (const draft of drafts) {
          const details = [
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
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const draft = await scheduleDraft(String(args.id), String(args.at))
        if (args.json) printJson(draft)
        else
          printLine(
            `Scheduled ${draft.id} for ${new Date(draft.scheduledAt ?? 0).toISOString()}.`,
          )
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
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const draft = getDraft(String(args.id))
        await requirePublishConfirmation(args, draft.body, {
          replyToPostId: draft.replyToPostId ?? undefined,
          images: draft.images,
        })
        const result = await publishDraft(draft.id)
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
    const options = postOptions(args, rawArgs)
    await requirePublishConfirmation(args, body, options)
    const result = await publishPost(body, options)
    if (args.json) printJson(result)
    else printLine(`Published: ${result.providerUrl}`)
  },
})
