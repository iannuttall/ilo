import { isCancel, password, select } from '@clack/prompts'
import {
  connectTypefully,
  getDefaultPublishingAccount,
  listPublishingAccounts,
  type PublishingAccount,
  removePublishingAccount,
  setDefaultPublishingAccount,
} from '@ilo/core'
import { defineCommand } from 'citty'
import pc from 'picocolors'
import { canPrompt, printJson, printLine } from '../utils.js'
import { connectX } from './x.js'

const typefullyApiKey = async (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!canPrompt()) throw new Error('typefully_api_key_required')
  printLine(`Create or copy a Typefully v2 API key first.

Typefully: Settings → API
API guide: https://typefully.com/docs/api
The key stays in your operating system keychain.`)
  const result = await password({
    message: 'Paste your Typefully v2 API key',
    mask: '•',
  })
  if (isCancel(result)) throw new Error('typefully_setup_cancelled')
  if (typeof result !== 'string' || !result.trim()) {
    throw new Error('typefully_api_key_required')
  }
  return result.trim()
}

export const connectTypefullyAccount = async (
  args: Record<string, unknown>,
) => {
  const result = await connectTypefully(
    await typefullyApiKey(args['api-key']),
    { makeDefault: true },
  )
  const output = {
    connected: true,
    provider: 'typefully',
    user: { id: result.user.id, name: result.user.name },
    defaultAccountId: result.accounts[0]?.id ?? null,
    accounts: result.accounts,
  }
  if (args.json) return printJson(output)
  printLine(
    `Connected ${result.accounts.length.toLocaleString('en-GB')} X ${result.accounts.length === 1 ? 'account' : 'accounts'} through Typefully:`,
  )
  for (const account of result.accounts) {
    printLine(`  @${account.username} (${account.alias})`)
  }
  if (result.accounts[0]) {
    printLine(
      `Default publishing account: @${result.accounts[0].username}. Use \`ilo accounts use <alias>\` to switch.`,
    )
  }
}

const providerFromArgs = async (args: Record<string, unknown>) => {
  const provided =
    typeof args.provider === 'string' ? args.provider.trim().toLowerCase() : ''
  if (provided === 'x' || provided === 'typefully') return provided
  if (provided) throw new Error('publishing_provider_invalid')
  if (typeof args['api-key'] === 'string' && args['api-key'].trim()) {
    return 'typefully' as const
  }
  if (typeof args['client-id'] === 'string' && args['client-id'].trim()) {
    return 'x' as const
  }
  if (!canPrompt()) throw new Error('publishing_provider_required')
  const result = await select({
    message: 'How do you want ilo to publish?',
    options: [
      {
        value: 'typefully',
        label: 'Typefully API key',
        hint: 'Use the X accounts already connected to Typefully',
      },
      {
        value: 'x',
        label: 'Direct X OAuth',
        hint: 'Use your own X developer app',
      },
    ],
  })
  if (isCancel(result)) throw new Error('publishing_setup_cancelled')
  return result as 'x' | 'typefully'
}

export const startPublishingSetup = async (args: Record<string, unknown>) => {
  const provider = await providerFromArgs(args)
  return provider === 'typefully'
    ? connectTypefullyAccount(args)
    : connectX({ ...args, makeDefault: true })
}

const accountLine = (account: PublishingAccount, defaultAccountId?: string) => {
  const marker = account.id === defaultAccountId ? pc.green('●') : pc.dim('○')
  const provider = account.provider === 'x' ? 'direct X' : 'Typefully'
  return `${marker} ${pc.bold(`@${account.username}`)} ${pc.dim(`· ${account.alias} · ${provider}`)}`
}

export const accountsCommand = defineCommand({
  meta: {
    name: 'accounts',
    description: 'Connect and switch between X publishing accounts',
  },
  subCommands: {
    add: defineCommand({
      meta: {
        name: 'add',
        description: 'Connect Typefully or another direct X account',
      },
      args: {
        provider: {
          type: 'positional',
          required: true,
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
        alias: {
          type: 'string',
          description: 'Local alias used by --account for direct X.',
        },
        port: {
          type: 'string',
          default: '8976',
          description:
            'Direct X callback port. Default URL: http://127.0.0.1:8976/callback.',
        },
        'no-open': {
          type: 'boolean',
          default: false,
          description: 'Print the direct X URL without opening a browser.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const provider = await providerFromArgs(args)
        return provider === 'typefully'
          ? connectTypefullyAccount(args)
          : connectX({ ...args, makeDefault: true })
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List connected publishing accounts' },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const [accounts, defaultAccount] = await Promise.all([
          listPublishingAccounts(),
          getDefaultPublishingAccount(),
        ])
        if (args.json) {
          return printJson({
            defaultAccountId: defaultAccount?.id ?? null,
            accounts,
          })
        }
        if (!accounts.length) {
          return printLine('No publishing accounts connected. Run `ilo start`.')
        }
        printLine(pc.bold('Publishing accounts'))
        for (const account of accounts) {
          printLine(accountLine(account, defaultAccount?.id))
        }
        printLine(pc.dim('● default'))
      },
    }),
    use: defineCommand({
      meta: {
        name: 'use',
        description: 'Choose the default publishing account',
      },
      args: {
        account: {
          type: 'positional',
          required: true,
          description: 'Account alias, handle, or id.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const account = await setDefaultPublishingAccount(String(args.account))
        if (args.json) return printJson({ defaultAccount: account })
        printLine(
          `Default publishing account: @${account.username} via ${account.provider === 'x' ? 'direct X' : 'Typefully'}.`,
        )
      },
    }),
    remove: defineCommand({
      meta: { name: 'remove', description: 'Remove one publishing account' },
      args: {
        account: {
          type: 'positional',
          required: true,
          description: 'Account alias, handle, or id.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const account = await removePublishingAccount(String(args.account))
        if (args.json) return printJson({ removed: account })
        printLine(`Removed @${account.username} (${account.alias}).`)
      },
    }),
  },
})
