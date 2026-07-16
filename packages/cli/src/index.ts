import { ILO_VERSION } from '@ilo/core'
import { defineCommand, runMain } from 'citty'
import { draftsCommand, postCommand } from './commands/drafts.js'
import { mcpCommand } from './commands/mcp.js'
import { schedulerCommand } from './commands/scheduler.js'
import { skillCommand } from './commands/skills.js'
import { connectX, xCommand } from './commands/x.js'

const main = defineCommand({
  meta: {
    name: 'ilo',
    version: ILO_VERSION,
    description: 'Local-first social publishing for people and AI agents',
  },
  subCommands: {
    start: defineCommand({
      meta: {
        name: 'start',
        description: 'Configure an X developer app and connect your account',
      },
      args: {
        'client-id': {
          type: 'string',
          description: 'OAuth 2.0 Client ID from X Keys and tokens.',
        },
        'client-secret': {
          type: 'string',
          description: 'Only needed for a confidential X app.',
        },
        port: {
          type: 'string',
          default: '8976',
          description:
            'Callback port. Default URL: http://127.0.0.1:8976/callback.',
        },
        'no-open': {
          type: 'boolean',
          default: false,
          description: 'Print the URL without opening a browser.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: ({ args }) => connectX(args),
    }),
    x: xCommand,
    post: postCommand,
    drafts: draftsCommand,
    scheduler: schedulerCommand,
    mcp: mcpCommand,
    skill: skillCommand,
  },
})

runMain(main).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
