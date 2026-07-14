import { confirm } from '@clack/prompts'
import {
  createDraft,
  listDrafts,
  publishDraft,
  publishPost,
  scheduleDraft,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { canPrompt, printJson, printLine, readTextInput } from '../utils.js'

const requirePublishConfirmation = async (args: Record<string, unknown>) => {
  if (args.yes === true) return
  if (!canPrompt()) throw new Error('publish_confirmation_required')
  const accepted = await confirm({ message: 'Publish this post to X now?' })
  if (accepted !== true) throw new Error('publish_cancelled')
}

const textArgs = {
  text: { type: 'string' as const, description: 'Post text.' },
  file: { type: 'string' as const, description: 'Read post text from a file.' },
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
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const draft = createDraft(await readTextInput(args))
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
          printLine(
            `${draft.id}  ${draft.status.padEnd(10)}  ${draft.body.slice(0, 72)}`,
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
        await requirePublishConfirmation(args)
        const result = await publishDraft(String(args.id))
        if (args.json) printJson(result)
        else printLine(`Published: ${result.providerUrl}`)
      },
    }),
  },
})

export const postCommand = defineCommand({
  meta: { name: 'post', description: 'Publish one post to X' },
  args: {
    ...textArgs,
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
    const body = await readTextInput(args)
    await requirePublishConfirmation(args)
    const result = await publishPost(body)
    if (args.json) printJson(result)
    else printLine(`Published: ${result.providerUrl}`)
  },
})
