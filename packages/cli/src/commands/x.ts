import { createServer } from 'node:http'
import { cancel, isCancel, text } from '@clack/prompts'
import {
  buildXAuthorizeUrl,
  disconnectX,
  exchangeXCode,
  fetchXMe,
  generateOAuthState,
  generatePkceVerifier,
  readXCredentials,
  saveXCredentials,
} from '@ilo/core'
import { defineCommand } from 'citty'
import open from 'open'
import { canPrompt, printJson, printLine } from '../utils.js'
import { articlesCommand } from './articles.js'
import { followersCommand } from './followers.js'
import { followingCommand } from './following.js'
import { inboxCommand } from './inbox.js'
import { monitorsCommand } from './monitors.js'

const DEFAULT_PORT = 8976
const X_DEVELOPER_PORTAL = 'https://console.x.com'

const callbackUrl = (port: number) => `http://127.0.0.1:${port}/callback`

const callbackPort = (value: unknown) => {
  const port = Number(value ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error('invalid_callback_port')
  }
  return port
}

const printXAppSetup = (redirectUri: string) => {
  printLine(`Before ilo can connect, create or open an X developer app.

Developer portal: ${X_DEVELOPER_PORTAL}

In User authentication settings, use:
  App type: Native App (public client with PKCE)
  OAuth 2.0: enabled
  App permissions: Read and write
  Callback URI: ${redirectUri}

Then open Keys and tokens and copy the OAuth 2.0 Client ID.
Native Apps do not need a client secret.`)
}

const requiredValue = async (value: unknown, message: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!canPrompt()) throw new Error('x_client_id_required')
  const result = await text({ message })
  if (isCancel(result)) {
    cancel('X setup cancelled.')
    process.exit(0)
  }
  if (typeof result !== 'string' || !result.trim())
    throw new Error('x_client_id_required')
  return result.trim()
}

const waitForCode = async (input: {
  port: number
  state: string
  authorizeUrl: string
  shouldOpen: boolean
}) =>
  new Promise<string>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      server.close(callback)
    }
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${input.port}`)
      if (url.pathname !== '/callback') {
        response.writeHead(404).end('Not found')
        return
      }
      const error = url.searchParams.get('error')
      const state = url.searchParams.get('state')
      const code = url.searchParams.get('code')
      if (error || state !== input.state || !code) {
        response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
        response.end(
          '<h1>Connection failed</h1><p>Return to the terminal and try again.</p>',
        )
        finish(() => reject(new Error(error || 'x_oauth_callback_invalid')))
        return
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(
        '<h1>X is connected</h1><p>You can close this tab and return to the terminal.</p>',
      )
      finish(() => resolve(code))
    })
    const timeout = setTimeout(
      () => finish(() => reject(new Error('x_oauth_timeout'))),
      180_000,
    )
    server.once('error', (error) => finish(() => reject(error)))
    server.listen(input.port, '127.0.0.1', async () => {
      printLine(`Open this URL to connect X:\n${input.authorizeUrl}\n`)
      if (input.shouldOpen) {
        await open(input.authorizeUrl).catch(() => {
          printLine('The browser did not open. Use the URL printed above.')
        })
      }
    })
  })

export const connectX = async (args: Record<string, unknown>) => {
  const port = callbackPort(args.port)
  const redirectUri = callbackUrl(port)
  const hasClientId =
    typeof args['client-id'] === 'string' && Boolean(args['client-id'].trim())
  if (!hasClientId && canPrompt()) printXAppSetup(redirectUri)
  const clientId = await requiredValue(
    args['client-id'],
    'Paste the X OAuth 2.0 Client ID',
  )
  const clientSecret =
    typeof args['client-secret'] === 'string'
      ? args['client-secret'].trim() || undefined
      : undefined
  const state = generateOAuthState()
  const codeVerifier = generatePkceVerifier()
  const authorizeUrl = buildXAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeVerifier,
  })
  const code = await waitForCode({
    port,
    state,
    authorizeUrl,
    shouldOpen: args.open !== false && args['no-open'] !== true,
  })
  const tokens = await exchangeXCode({
    clientId,
    clientSecret,
    code,
    redirectUri,
    codeVerifier,
  })
  const account = await fetchXMe(tokens.accessToken)
  await saveXCredentials({
    clientId,
    clientSecret,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes,
    accountId: account.id,
    username: account.username ?? account.id,
    displayName: account.name ?? account.username ?? account.id,
  })
  const result = {
    connected: true,
    provider: 'x',
    accountId: account.id,
    username: account.username ?? null,
  }
  if (args.json) printJson(result)
  else printLine(`Connected @${account.username ?? account.id}.`)
}

export const xCommand = defineCommand({
  meta: { name: 'x', description: 'Connect and manage your X account' },
  subCommands: {
    articles: articlesCommand,
    followers: followersCommand,
    following: followingCommand,
    monitors: monitorsCommand,
    inbox: inboxCommand,
    connect: defineCommand({
      meta: {
        name: 'connect',
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
          default: String(DEFAULT_PORT),
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
    status: defineCommand({
      meta: { name: 'status', description: 'Show the connected X account' },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        try {
          const credentials = await readXCredentials()
          const result = {
            connected: true,
            accountId: credentials.accountId,
            username: credentials.username,
            scopes: credentials.scopes,
            expiresAt: credentials.expiresAt,
          }
          if (args.json) printJson(result)
          else printLine(`Connected @${credentials.username}.`)
        } catch {
          const result = { connected: false }
          if (args.json) printJson(result)
          else printLine('No X account is connected. Run `ilo start`.')
        }
      },
    }),
    disconnect: defineCommand({
      meta: { name: 'disconnect', description: 'Remove local X credentials' },
      run: async () => {
        await disconnectX()
        printLine('X credentials removed.')
      },
    }),
  },
})
