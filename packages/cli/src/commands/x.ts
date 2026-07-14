import { createServer } from 'node:http'
import { password, text } from '@clack/prompts'
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

const DEFAULT_PORT = 8976

const requiredValue = async (
  value: unknown,
  message: string,
  secret = false,
) => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!canPrompt()) throw new Error('x_client_id_required')
  const result = secret ? await password({ message }) : await text({ message })
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
  const clientId = await requiredValue(
    args['client-id'],
    'X OAuth 2.0 client ID',
  )
  const clientSecret =
    typeof args['client-secret'] === 'string'
      ? args['client-secret'].trim() || undefined
      : canPrompt()
        ? (
            (await password({
              message: 'X client secret (leave blank for a public client)',
            })) as string
          ).trim() || undefined
        : undefined
  const portValue = Number(args.port ?? DEFAULT_PORT)
  if (!Number.isInteger(portValue) || portValue < 1024 || portValue > 65_535)
    throw new Error('invalid_callback_port')
  const redirectUri = `http://127.0.0.1:${portValue}/callback`
  const state = generateOAuthState()
  const codeVerifier = generatePkceVerifier()
  const authorizeUrl = buildXAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeVerifier,
  })
  const code = await waitForCode({
    port: portValue,
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
    connect: defineCommand({
      meta: {
        name: 'connect',
        description: 'Connect an X account with OAuth 2.0 PKCE',
      },
      args: {
        'client-id': { type: 'string', description: 'X OAuth 2.0 client ID.' },
        'client-secret': {
          type: 'string',
          description: 'Optional confidential client secret.',
        },
        port: {
          type: 'string',
          default: String(DEFAULT_PORT),
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
          else printLine('No X account is connected. Run `ilo x connect`.')
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
