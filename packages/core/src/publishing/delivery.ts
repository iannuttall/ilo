import { publishTypefullyXPost } from '../providers/typefully/client.js'
import { createXPost, refreshXToken } from '../providers/x/client.js'
import {
  readTypefullyCredentials,
  readXCredentials,
  saveXCredentials,
} from '../storage/accounts.js'
import type { PublishingAccount } from '../storage/config.js'
import type { Draft } from '../storage/database.js'

const freshXCredentials = async (accountId: string) => {
  const credentials = await readXCredentials(accountId)
  if (credentials.expiresAt > Date.now() + 60_000) return credentials
  if (!credentials.refreshToken) throw new Error('x_refresh_token_missing')
  const tokens = await refreshXToken({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
  })
  const next = {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? credentials.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes || credentials.scopes,
    accountId: credentials.accountId,
    username: credentials.username,
    displayName: credentials.displayName,
    alias: credentials.alias,
    makeDefault: false,
  }
  await saveXCredentials(next)
  return { ...credentials, ...next }
}

export const publishDraftThroughAccount = async (
  draft: Draft,
  account: PublishingAccount,
) => {
  if (account.provider === 'x') {
    const credentials = await freshXCredentials(account.id)
    const published = await createXPost(credentials.accessToken, draft.body, {
      replyToPostId: draft.replyToPostId ?? undefined,
      images: draft.images,
    })
    return { provider: 'x' as const, account, ...published }
  }
  const credentials = await readTypefullyCredentials(account.id)
  const published = await publishTypefullyXPost(
    credentials.apiKey,
    account.socialSetId,
    draft.body,
    {
      replyToPostId: draft.replyToPostId ?? undefined,
      images: draft.images,
    },
  )
  return { provider: 'typefully' as const, account, ...published }
}
