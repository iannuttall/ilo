import { defineCommand, runMain } from 'citty'
import { draftsCommand, postCommand } from './commands/drafts.js'
import { mcpCommand } from './commands/mcp.js'
import { schedulerCommand } from './commands/scheduler.js'
import { skillCommand } from './commands/skills.js'
import { connectX, xCommand } from './commands/x.js'

const main = defineCommand({
  meta: {
    name: 'ilo',
    version: '0.1.0',
    description: 'Local-first social publishing for people and AI agents',
  },
  subCommands: {
    start: defineCommand({
      meta: {
        name: 'start',
        description: 'Connect your X account and finish local setup',
      },
      args: {
        'client-id': { type: 'string', description: 'X OAuth 2.0 client ID.' },
        'client-secret': {
          type: 'string',
          description: 'Optional confidential client secret.',
        },
        port: {
          type: 'string',
          default: '8976',
          description: 'Local callback port.',
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
