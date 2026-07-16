import { ILO_VERSION } from '@ilo/core'
import { defineCommand, runMain } from 'citty'
import { accountsCommand, startPublishingSetup } from './commands/accounts.js'
import { draftsCommand, postCommand } from './commands/drafts.js'
import { mcpCommand } from './commands/mcp.js'
import { schedulerCommand } from './commands/scheduler.js'
import { skillCommand } from './commands/skills.js'
import { xCommand } from './commands/x.js'
import { maybeOfferSelfUpdate } from './self-update.js'
import { friendlyErrorMessage } from './utils.js'

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
        description: 'Connect Typefully or your own X developer app',
      },
      args: {
        provider: {
          type: 'string',
          description: 'Publishing provider: typefully or x.',
        },
        'api-key': {
          type: 'string',
          description: 'Typefully v2 API key. Prefer the interactive prompt.',
        },
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
      run: ({ args }) => startPublishingSetup(args),
    }),
    accounts: accountsCommand,
    x: xCommand,
    post: postCommand,
    drafts: draftsCommand,
    scheduler: schedulerCommand,
    mcp: mcpCommand,
    skill: skillCommand,
  },
})

const updateExitCode = await maybeOfferSelfUpdate(
  { name: 'iloso', version: ILO_VERSION },
  { argv: process.argv.slice(2) },
)
if (updateExitCode !== undefined) process.exit(updateExitCode)

runMain(main).catch((error) => {
  process.stderr.write(`${friendlyErrorMessage(error)}\n`)
  process.exitCode = 1
})
